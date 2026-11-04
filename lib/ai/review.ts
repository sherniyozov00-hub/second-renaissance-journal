import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { AiError, aiMode, aiModel, anthropic, FALLBACK_BETA, systemBlocks } from "./client";
import { record, type FeatureContext } from "./features";
import { auditNote, checkPercent } from "./number-audit";
import { addSpend, NO_SPEND, spendOf } from "./pricing";
import { languageLine, systemPrompt, wrapText } from "./prompts";
import { type Review, type ReviewIssue, ReviewSchema } from "./schemas";
import { locateInParagraph, normalizeUrl, splitParagraphs } from "./text";

/**
 * "Tekshirib ber" — the review agent. It reads the whole draft the way an
 * experienced editor would and reports problems with numbers, facts, internal
 * consistency, method, claims, structure and sources, each with a quote and a
 * way to fix it (it teaches; it does not rewrite the article).
 *
 * Tools: `percent_check` (exact arithmetic in code, so the model never guesses
 * whether 37,3 % can come from 35 people), a few web searches for external
 * facts, and `submit_review` for the final, schema-checked report.
 */

const MAX_TURNS = 8;
const MAX_SEARCHES = 3;

const PercentInput = z.object({
  n: z.number().int().min(1).max(100000),
  values: z.array(z.string().max(12)).min(1).max(40),
});

const PERCENT_TOOL: Anthropic.Beta.BetaTool = {
  name: "percent_check",
  description:
    'Foizlar n kishilik guruhdan chiqishi mumkinmi — aniq hisob (k/n×100, butun k). Har bir guruh (butun namuna, erkaklar, bitta savolga javob berganlar) uchun alohida chaqir. values — matndagi foizlar ko‘rinishida, masalan ["37,3", "31.4"].',
  input_schema: {
    type: "object",
    properties: {
      n: { type: "integer", description: "Guruhdagi kishilar soni" },
      values: { type: "array", items: { type: "string" }, description: "Foizlar, % belgisisiz" },
    },
    required: ["n", "values"],
    additionalProperties: false,
  },
};

const REVIEW_TOOL: Anthropic.Beta.BetaTool = {
  name: "submit_review",
  description:
    "Yakuniy tekshiruv hisobotini yuborish (bir marta). sources — faqat web_search natijalarida haqiqatda ko‘rilgan URL’lar.",
  input_schema: betaZodOutputFormat(ReviewSchema).schema as Anthropic.Beta.BetaTool["input_schema"],
  strict: true,
};

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

function prompt(title: string, text: string, ctx: FeatureContext) {
  const audit = auditNote(text);
  const auditLine = audit.n
    ? `Oldindan hisob (kod): matnda namuna hajmi ehtimol n = ${audit.n}. ${
        audit.misfits.length
          ? `Bu n ga mos kelmaydigan foizlar: ${audit.misfits
              .map((m) => `${m.text} % (eng yaqin mumkin: ${m.nearest.join(" yoki ")})`)
              .join(
                "; ",
              )}. Ular haqiqatan butun namunadan hisoblanganmi yoki kichik guruh / ko‘p tanlovli savolmi — matndan aniqla.`
          : "Barcha foizlar shu n ga mos."
      }`
    : "Oldindan hisob (kod): matnda namuna hajmi topilmadi.";
  return `Vazifa: “Tekshirib ber”. Sen tajribali muharrir va ilmiy rahbarsan. Maqolani boshidan oxirigacha o‘qib, muallif o‘zi tuzatishi uchun eng muhim muammolarni top.
Tekshir:
1) Raqamlar: foizlar namuna hajmiga mosligi (percent_check vositasi bilan — o‘zing hisoblama), yig‘indilar, bir xil raqam turli bo‘limlarda bir xilmi.
2) Ichki moslik: annotatsiya ↔ natijalar ↔ muhokama ↔ xulosa; xulosa natijaga zid emasmi; tadqiqot savoliga javob berilganmi.
3) Da’volar: “korrelyatsiya”, “ta’sir”, “isbotlandi” statistik dalilsiz; sabab-oqibat; kichik yoki qulay tanlovni umumlashtirish.
4) Usul: n, tanlov, rozilik, vosita, muddat, tahlil yetarli yozilganmi.
5) Tashqi faktlar: maqolada boshqa manbaga tayangan eng muhim 1–3 ta raqamli da’voni web_search bilan tekshir (ko‘pi bilan ${MAX_SEARCHES} ta qidiruv). Muallifning o‘z so‘rovnoma natijalarini internetdan tekshirma.
6) Tuzilma, manbalar (havola ro‘yxatda bormi), uslub — faqat jiddiy bo‘lsa.
Qoidalar: issues — muhimligi bo‘yicha tartiblangan, ko‘pi bilan 12 ta; quote — maqoladan AYNAN ko‘chirilgan qisqa parcha (yoki umumiy muammo bo‘lsa null); how_to_fix — muallif nima qilishi kerakligi (matnni uning o‘rniga yozma, kerak bo‘lsa bitta qisqa namuna); sources — faqat web_search’da ko‘rilgan URL; raqam yoki manba o‘ylab topma. strengths — haqiqiy yutuqlar (1–3 ta). next_steps — keyingi 2–4 qadam.
Oxirida submit_review vositasini BIR marta chaqir.
${languageLine(ctx.lang)}
${auditLine}

${wrapText(`Sarlavha: ${title}\n\n${text}`, "maqola")}`;
}

/** Keeps quotes that are really in the text and sources the search really returned. */
function clean(review: Review, text: string, retrieved: ReadonlySet<string>): Review {
  const paragraphs = splitParagraphs(text);
  const issues: ReviewIssue[] = review.issues.map((i) => {
    const quote = i.quote
      ? (paragraphs.map((p) => locateInParagraph(p, i.quote!)).find(Boolean) ?? null)
      : null;
    const seen = new Set<string>();
    const sources = i.sources.filter((s) => {
      const key = normalizeUrl(s.url);
      if (!key || !retrieved.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { ...i, quote, sources };
  });
  const order = { high: 0, medium: 1, low: 2 } as const;
  issues.sort((a, b) => order[a.severity] - order[b.severity]);
  return { ...review, issues };
}

function mockReview(text: string): Review {
  const audit = auditNote(text);
  return {
    summary:
      "Sinov rejimi: faqat raqamlar kod bilan tekshirildi. To‘liq tahlil (moslik, da’volar, usul, tashqi faktlar) AI kaliti ulanganda ishlaydi.",
    strengths: [],
    issues: audit.misfits.map((m) => ({
      category: "numbers" as const,
      severity: "high" as const,
      quote: `${m.text} %`,
      problem: `${m.text} % qiymati n = ${audit.n} kishidan chiqishi mumkin emas.`,
      how_to_fix: `Diagrammadagi sonni tekshirib, foizni qayta hisoblang. Eng yaqin mumkin qiymatlar: ${m.nearest.join(", ")}.`,
      sources: [],
    })),
    next_steps: [
      "Har bir foiz yonida kishilar sonini ham yozing: “35 talabaning 13 tasi (37,1 %)”.",
    ],
  };
}

async function runLive(ctx: FeatureContext, title: string, text: string) {
  const model = await aiModel();
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    { type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES },
    PERCENT_TOOL,
    REVIEW_TOOL,
  ];
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: prompt(title, text, ctx) },
  ];
  const system = systemBlocks(await systemPrompt(ctx.articleType, ctx.categoryId));
  const retrieved = new Set<string>();
  let spend = NO_SPEND;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await (
      await anthropic()
    ).beta.messages.create({
      model,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system,
      output_config: { effort: "medium" },
      tools,
      messages,
    });
    spend = addSpend(spend, spendOf(model, res.usage));
    collectUrls(res.content, retrieved);
    if (res.stop_reason === "refusal") throw new AiError("refused");

    const calls = res.content.filter(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
    );
    const submit = calls.find((c) => c.name === "submit_review");
    if (submit) {
      const parsed = ReviewSchema.safeParse(submit.input);
      if (parsed.success)
        return {
          review: clean(parsed.data, text, retrieved),
          spend,
          model: res.model ?? model,
        };
    }
    messages.push({ role: "assistant", content: res.content });
    if (res.stop_reason === "pause_turn") continue;

    const results: Anthropic.Beta.BetaToolResultBlockParam[] = calls.map((c) => {
      if (c.name === "percent_check") {
        const input = PercentInput.safeParse(c.input);
        if (!input.success)
          return {
            type: "tool_result",
            tool_use_id: c.id,
            is_error: true,
            content: "n va values kerak.",
          };
        const out = input.data.values.map((v) => checkPercent(v, input.data.n));
        return {
          type: "tool_result",
          tool_use_id: c.id,
          content: JSON.stringify(
            out.map((o) => ({
              value: o.text,
              ok: o.ok,
              people: o.count,
              nearest_possible: o.nearest,
            })),
          ),
        };
      }
      if (c.name === "submit_review") {
        const issues = ReviewSchema.safeParse(c.input);
        return {
          type: "tool_result",
          tool_use_id: c.id,
          is_error: true,
          content: issues.success
            ? "Qayta yubor."
            : `Sxemaga mos emas: ${issues.error.issues.map((i) => i.path.join(".")).join(", ")}. Qaytadan yubor.`,
        };
      }
      return {
        type: "tool_result",
        tool_use_id: c.id,
        is_error: true,
        content: "Noma’lum vosita.",
      };
    });
    messages.push({
      role: "user",
      content: results.length
        ? results
        : "Tekshiruvni yakunla va natijani submit_review vositasi orqali yubor.",
    });
  }
  throw new AiError("unavailable");
}

export async function reviewDraft(ctx: FeatureContext, title: string, text: string) {
  if (!text.trim()) throw new AiError("empty");
  const res =
    (await aiMode()) === "mock"
      ? { review: mockReview(text), spend: NO_SPEND, model: "mock" }
      : await runLive(ctx, title, text);
  const checkId = await record(
    ctx,
    "review",
    "REVIEW",
    title + text,
    res.review,
    res.spend,
    res.model,
  );
  return { review: res.review, checkId };
}
