import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { ArticleType, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  AiError,
  aiMode,
  aiModel,
  anthropic,
  FALLBACK_BETA,
  structured,
  systemBlocks,
  toAiError,
} from "./client";
import { MOCK_RETRIEVED, mockClaims, mockVerdict } from "./mock";
import { addSpend, NO_SPEND, spendOf, type Spend } from "./pricing";
import { languageLine, systemPrompt, wrapText } from "./prompts";
import {
  type AiLang,
  ClaimsSchema,
  type FactEvent,
  type FactResult,
  type ModelVerdict,
  VerdictsSchema,
} from "./schemas";
import {
  enforceVerdict,
  hashText,
  isCheckable,
  locateInParagraph,
  normalizeUrl,
  splitParagraphs,
  summarize,
} from "./text";

/**
 * Fact check (TZ 10.3): paragraphs → claims → web search per paragraph →
 * verdicts validated with zod and the source rules → AiCheck. Unchanged
 * paragraphs come from the cache (one AiCheck row per paragraph hash).
 */

export type FactCheckContext = {
  userId: string | null;
  draftId: string | null;
  articleId: string | null;
  articleType: ArticleType;
  categoryId: string | null;
  maxClaims: number;
  /** Interface language for explanations. */
  lang: AiLang;
};

const CACHE_VERSION = "fc-v1";
const CACHE_DAYS = 30;
const PARALLEL = 3;

type Claim = { id: string; paragraph: number; text: string };

type ParagraphResult = { results: FactResult[]; spend: Spend; model: string };

async function extractClaims(
  system: string,
  items: { index: number; text: string }[],
): Promise<{ claims: Claim[]; spend: Spend; model: string }> {
  if ((await aiMode()) === "mock") {
    const claims = items.flatMap(({ index, text }) =>
      mockClaims(text).map((c, i) => ({ id: `p${index}c${i}`, paragraph: index, text: c.text })),
    );
    return { claims, spend: NO_SPEND, model: "mock" };
  }

  const claims: Claim[] = [];
  let spend = NO_SPEND;
  let model = "";
  // One call per few paragraphs keeps answers short and quotes exact.
  for (let i = 0; i < items.length; i += 4) {
    const chunk = items.slice(i, i + 4);
    const res = await structured({
      system,
      effort: "low",
      maxTokens: 4000,
      schema: ClaimsSchema,
      prompt: `Vazifa: quyidagi xatboshilardan internet orqali tekshirsa bo‘ladigan da’volarni ajrat (bilim bazasidagi “Fakt tekshiruvi usuli”ga qara).
Har da’vo uchun "text" — xatboshidan AYNAN ko‘chirilgan qism (so‘zma-so‘z, 3–25 so‘z), boshida xatboshi raqamini [n] qo‘sh: "[2] Tomchilatib sug‘orish 2010-yilda ixtiro qilingan".
Muallifning o‘z tajribasi natijalari, maqsad, ta’rif va fikrlarni ajratma. Da’vo bo‘lmasa — bo‘sh ro‘yxat.

${wrapText(chunk.map((c) => `[${c.index}] ${c.text}`).join("\n"))}`,
    });
    spend = addSpend(spend, res.spend);
    model = res.model;
    for (const c of res.data.claims) {
      const m = c.text.match(/^\s*\[(\d+)\]\s*(.+)$/s);
      const index = m ? Number(m[1]) : chunk.length === 1 ? chunk[0]!.index : NaN;
      const item = items.find((x) => x.index === index);
      const located = item ? locateInParagraph(item.text, m ? m[2]! : c.text) : null;
      if (item && located && !claims.some((x) => x.paragraph === index && x.text === located)) {
        claims.push({ id: `p${index}c${claims.length}`, paragraph: index, text: located });
      }
    }
  }
  return { claims, spend, model };
}

/** Every web search result URL anywhere in the response (nested results included). */
function collectUrls(node: unknown, into: Set<string>) {
  if (Array.isArray(node)) {
    for (const n of node) collectUrls(n, into);
    return;
  }
  if (!node || typeof node !== "object") return;
  const o = node as Record<string, unknown>;
  if (
    (o.type === "web_search_result" || o.type === "web_search_result_location") &&
    typeof o.url === "string"
  ) {
    const key = normalizeUrl(o.url);
    if (key) into.add(key);
  }
  for (const v of Object.values(o)) if (v && typeof v === "object") collectUrls(v, into);
}

const VERDICT_TOOL_SCHEMA = betaZodOutputFormat(VerdictsSchema)
  .schema as Anthropic.Beta.BetaTool["input_schema"];

async function verifyLive(
  system: string,
  paragraph: string,
  claims: Claim[],
  lang: AiLang,
): Promise<{ verdicts: ModelVerdict[]; retrieved: Set<string>; spend: Spend; model: string }> {
  const model = await aiModel();
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    {
      type: "web_search_20260209",
      name: "web_search",
      max_uses: Math.min(4 + claims.length * 2, 12),
    },
    {
      name: "submit_verdicts",
      description:
        "Har bir da’vo bo‘yicha yakuniy xulosani yuborish. Faqat web_search natijalarida haqiqatda ko‘rilgan manbalarni (aniq URL bilan) yoz. Noto‘g‘ri xulosada to‘g‘ri ma’lumot (correction) va kamida bitta manba bo‘lishi shart; manba topilmasa — needs_source.",
      input_schema: VERDICT_TOOL_SCHEMA,
      strict: true,
    },
  ];
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Vazifa: quyidagi da’volarni internetdan mustaqil tekshir. Har da’vo uchun kamida bitta qidiruv (o‘zbek/rus va ingliz tilida) qil, ishonchli manbalarni o‘qi, keyin submit_verdicts vositasini BIR marta chaqir.
Xulosalar: correct — manba tasdiqlaydi; incorrect — manba boshqacha ma’lumot beradi (correction da to‘g‘risini muallif jumlasiga qo‘yiladigan shaklda yoz); needs_source — topilmadi yoki manbalar zid.
explanation — 1–3 jumla, nima topilgani va qaysi manbada.
${languageLine(lang)}

${wrapText(paragraph, "xatboshi")}

<dalvolar>
${claims.map((c) => `${c.id}: ${c.text}`).join("\n")}
</dalvolar>`,
    },
  ];

  const retrieved = new Set<string>();
  let spend = NO_SPEND;
  for (let turn = 0; turn < 6; turn++) {
    const res = await (
      await anthropic()
    ).beta.messages.create({
      model,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: systemBlocks(system),
      output_config: { effort: "medium" },
      tools,
      messages,
    });
    spend = addSpend(spend, spendOf(model, res.usage));
    collectUrls(res.content, retrieved);
    if (res.stop_reason === "refusal") throw new AiError("refused");

    const call = res.content.find(
      (b): b is Anthropic.Beta.BetaToolUseBlock =>
        b.type === "tool_use" && b.name === "submit_verdicts",
    );
    if (call) {
      const parsed = VerdictsSchema.safeParse(call.input);
      if (parsed.success)
        return { verdicts: parsed.data.verdicts, retrieved, spend, model: res.model ?? model };
      messages.push({ role: "assistant", content: res.content });
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: call.id,
            is_error: true,
            content: `Sxemaga mos emas: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}. Qaytadan yubor.`,
          },
        ],
      });
      continue;
    }
    messages.push({ role: "assistant", content: res.content });
    // pause_turn: the server resumes the search loop when the turn is sent back as is.
    if (res.stop_reason !== "pause_turn") {
      messages.push({ role: "user", content: "Natijani submit_verdicts vositasi orqali yubor." });
    }
  }
  throw new AiError("unavailable");
}

async function checkParagraph(
  system: string,
  index: number,
  paragraph: string,
  claims: Claim[],
  lang: AiLang,
): Promise<ParagraphResult> {
  if (!claims.length)
    return { results: [], spend: NO_SPEND, model: (await aiMode()) === "mock" ? "mock" : "" };
  let verdicts: ModelVerdict[];
  let retrieved: Set<string>;
  let spend = NO_SPEND;
  let model = "mock";
  if ((await aiMode()) === "mock") {
    verdicts = claims.map((c) => mockVerdict(c.id, c.text, lang));
    retrieved = new Set(MOCK_RETRIEVED.map((u) => normalizeUrl(u)!));
  } else {
    ({ verdicts, retrieved, spend, model } = await verifyLive(system, paragraph, claims, lang));
  }
  const results: FactResult[] = claims.map((c) => {
    const v = verdicts.find((x) => x.id === c.id) ?? {
      id: c.id,
      verdict: "needs_source" as const,
      explanation: {
        uz: "Bu da’vo bo‘yicha xulosa olinmadi; manba ko‘rsating.",
        ru: "По этому утверждению вывод не получен; укажите источник.",
        en: "No verdict was returned for this claim; cite a source.",
      }[lang],
      correction: null,
      sources: [],
    };
    const enforced = enforceVerdict(v, retrieved);
    return {
      id: c.id,
      paragraph: index,
      text: c.text,
      verdict: enforced.verdict,
      explanation: v.explanation,
      correction: enforced.correction,
      sources: enforced.sources,
      ...(enforced.downgraded ? { downgraded: enforced.downgraded } : {}),
    };
  });
  return { results, spend, model };
}

/** Runs the check and reports progress through `emit` (streamed to the browser). */
export async function runFactCheck(
  text: string,
  ctx: FactCheckContext,
  emit: (e: FactEvent) => void,
): Promise<{ results: FactResult[]; spend: Spend }> {
  const paragraphs = splitParagraphs(text);
  const mock = (await aiMode()) === "mock";
  emit({ type: "start", paragraphs: paragraphs.length, mock });

  const model = mock ? "mock" : await aiModel();
  const since = new Date(Date.now() - CACHE_DAYS * 864e5);
  const keyOf = (p: string) => hashText(CACHE_VERSION, model, ctx.articleType, ctx.lang, p);

  const all: FactResult[] = [];
  let spend = NO_SPEND;
  const todo: { index: number; text: string; key: string }[] = [];

  for (const [index, p] of paragraphs.entries()) {
    if (!isCheckable(p)) continue;
    const key = keyOf(p);
    const cached = await db.aiCheck.findFirst({
      where: { type: "FACTCHECK", inputHash: key, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { result: true },
    });
    const stored = (cached?.result as { results?: FactResult[] } | null)?.results;
    if (stored) {
      const results = stored.map((r) => ({
        ...r,
        paragraph: index,
        id: `p${index}${r.id.replace(/^p\d+/, "")}`,
      }));
      emit({ type: "progress", paragraph: index, claims: results.length, cached: true });
      for (const r of results) emit({ type: "result", result: r });
      all.push(...results);
    } else {
      todo.push({ index, text: p, key });
    }
  }

  let truncated = false;
  if (todo.length) {
    try {
      const system = await systemPrompt(ctx.articleType, ctx.categoryId);
      const extracted = await extractClaims(system, todo);
      spend = addSpend(spend, extracted.spend);
      let budget = Math.max(0, ctx.maxClaims - all.length);
      const queue = todo.map((item) => {
        const claims = extracted.claims.filter((c) => c.paragraph === item.index);
        const allowed = claims.slice(0, budget);
        budget -= allowed.length;
        if (allowed.length < claims.length) truncated = true;
        return { ...item, claims: allowed, complete: allowed.length === claims.length };
      });

      const run = async (item: (typeof queue)[number]) => {
        emit({
          type: "progress",
          paragraph: item.index,
          claims: item.claims.length,
          cached: false,
        });
        const r = await checkParagraph(system, item.index, item.text, item.claims, ctx.lang);
        for (const res of r.results) emit({ type: "result", result: res });
        all.push(...r.results);
        spend = addSpend(spend, r.spend);
        // Only complete paragraphs are cached, so a cut-off one is checked in full next time.
        if (item.complete) {
          await db.aiCheck.create({
            data: {
              type: "FACTCHECK",
              inputHash: item.key,
              userId: ctx.userId,
              draftId: ctx.draftId,
              articleId: ctx.articleId,
              model: r.model || model,
              result: {
                paragraph: item.text,
                results: r.results,
              } as unknown as Prisma.InputJsonValue,
              tokensIn: r.spend.tokensIn,
              tokensOut: r.spend.tokensOut,
              cost: r.spend.cost,
            },
          });
        }
      };
      for (let i = 0; i < queue.length; i += PARALLEL) {
        await Promise.all(queue.slice(i, i + PARALLEL).map(run));
      }
      // Claim extraction cost is not tied to a paragraph; record it once.
      if (extracted.spend.cost > 0) {
        await db.aiCheck.create({
          data: {
            type: "FACTCHECK",
            inputHash: hashText("claims", ...todo.map((t) => t.key)),
            userId: ctx.userId,
            draftId: ctx.draftId,
            articleId: ctx.articleId,
            model: extracted.model,
            result: { stage: "claims", claims: extracted.claims.length },
            tokensIn: extracted.spend.tokensIn,
            tokensOut: extracted.spend.tokensOut,
            cost: extracted.spend.cost,
          },
        });
      }
    } catch (e) {
      const err = toAiError(e);
      emit({ type: "error", code: err.code });
      return { results: all, spend };
    }
  }

  all.sort((a, b) => a.paragraph - b.paragraph);
  const summary = summarize(all);
  const check = await db.aiCheck.create({
    data: {
      type: "FACTCHECK",
      inputHash: hashText("run", text),
      userId: ctx.userId,
      draftId: ctx.draftId,
      articleId: ctx.articleId,
      model: "summary",
      result: { summary, results: all, truncated } as unknown as Prisma.InputJsonValue,
    },
  });
  emit({ type: "done", summary, checkId: check.id, truncated });
  return { results: all, spend };
}
