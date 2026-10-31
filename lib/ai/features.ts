import "server-only";
import { z } from "zod";
import type { AiCheckType, ArticleType, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { originality, type OriginalityReport } from "@/lib/submission/originality";
import { aiMode, structured, textAnswer } from "./client";
import { mockAssist, mockChat, mockEdits, mockPlan, mockTranslation } from "./mock";
import { NO_SPEND, type Spend } from "./pricing";
import { languageLine, numbered, systemPrompt, wrapText } from "./prompts";
import {
  type AiFeature,
  type AiLang,
  type Assist,
  AssistSchema,
  type ChatMessage,
  type EditSuggestion,
  EditsSchema,
  type Plan,
  PlanSchema,
  type ScholarItem,
  type Translation,
  TranslateSchema,
} from "./schemas";
import { searchScholar } from "./scholar";
import { hashText, locateInParagraph, splitParagraphs } from "./text";

/**
 * Xorazmiy AI features other than the fact check (TZ 10.1). Each returns
 * validated data; `record` writes tokens and cost to AiCheck (TZ 10.4) and
 * notes the feature on the draft (TZ 10.2).
 */

export type FeatureContext = {
  userId: string | null;
  draftId: string | null;
  articleId: string | null;
  articleType: ArticleType;
  categoryId: string | null;
  /** Interface language of the author; explanations come back in it. */
  lang: AiLang;
};

export async function record(
  ctx: FeatureContext,
  feature: AiFeature,
  type: AiCheckType,
  input: string,
  result: unknown,
  spend: Spend,
  model: string,
) {
  const [check] = await Promise.all([
    db.aiCheck.create({
      data: {
        type,
        inputHash: hashText(feature, input),
        userId: ctx.userId,
        draftId: ctx.draftId,
        articleId: ctx.articleId,
        model,
        result: result as Prisma.InputJsonValue,
        tokensIn: spend.tokensIn,
        tokensOut: spend.tokensOut,
        cost: spend.cost,
      },
      select: { id: true },
    }),
    markFeature(ctx, feature),
  ]);
  return check.id;
}

/** TZ 10.2: which AI features were used is stored on the draft and later on the article. */
export async function markFeature(
  ctx: Pick<FeatureContext, "draftId" | "articleId">,
  feature: AiFeature,
) {
  if (ctx.draftId) {
    const d = await db.draft.findUnique({
      where: { id: ctx.draftId },
      select: { aiFeaturesUsed: true },
    });
    if (d && !d.aiFeaturesUsed.includes(feature)) {
      await db.draft.update({
        where: { id: ctx.draftId },
        data: { aiFeaturesUsed: { push: feature } },
      });
    }
  }
  if (ctx.articleId) {
    const a = await db.article.findUnique({
      where: { id: ctx.articleId },
      select: { aiFeaturesUsed: true },
    });
    if (a && !a.aiFeaturesUsed.includes(feature)) {
      await db.article.update({
        where: { id: ctx.articleId },
        data: { aiFeaturesUsed: { push: feature } },
      });
    }
  }
}

const mockResult = <T>(data: T) => ({ data, spend: NO_SPEND, model: "mock" });

export async function makePlan(ctx: FeatureContext, title: string, notes: string) {
  const res: { data: Plan; spend: Spend; model: string } =
    aiMode() === "mock"
      ? mockResult(mockPlan(title))
      : await structured({
          system: await systemPrompt(ctx.articleType, ctx.categoryId),
          effort: "medium",
          schema: PlanSchema,
          prompt: `Vazifa: “Reja tuzish”. Mavzu va muallif izohlari asosida tadqiqot savoli, gipoteza (tadqiqot turi uchun mos bo‘lsa) va maqola turiga mos bo‘limlar rejasini tuz. Har bo‘limda nima yozilishi va qaysi savollarga javob berilishi kerakligini tushuntir. sample_sentence — ixtiyoriy, bitta qisqa namuna jumla; raqam yoki manba o‘ylab topma, o‘rniga [raqam], [manba] qo‘y. Bo‘limni muallif o‘rniga yozma.
${languageLine(ctx.lang)}
${wrapText(`Mavzu: ${title}\nIzohlar: ${notes || "—"}`)}`,
        });
  const checkId = await record(ctx, "plan", "PLAN", title + notes, res.data, res.spend, res.model);
  return { plan: res.data, checkId };
}

export async function assistWriting(ctx: FeatureContext, text: string, question: string) {
  const res: { data: Assist; spend: Spend; model: string } =
    aiMode() === "mock"
      ? mockResult(mockAssist())
      : await structured({
          system: await systemPrompt(ctx.articleType, ctx.categoryId),
          effort: "medium",
          schema: AssistSchema,
          prompt: `Vazifa: “Yozishga yordam”. Muallif yozgan qismni maqola turi qo‘llanmasi va tekshiruv ro‘yxati bo‘yicha baholab, uni o‘zi yaxshilashi uchun savollar va aniq maslahatlar ber. Matnni qayta yozib berma; sample_sentence — faqat usulni ko‘rsatuvchi bitta qisqa namuna (raqam va manbani o‘ylab topma).
${languageLine(ctx.lang)}
Muallif savoli: ${question || "—"}
${wrapText(text)}`,
        });
  const checkId = await record(
    ctx,
    "assist",
    "ASSIST",
    text + question,
    res.data,
    res.spend,
    res.model,
  );
  return { assist: res.data, checkId };
}

/** Edit suggestions shown as tracked changes; each is checked against the paragraph it quotes. */
export async function suggestEdits(ctx: FeatureContext, text: string) {
  const paragraphs = splitParagraphs(text);
  const res =
    aiMode() === "mock"
      ? mockResult({ edits: mockEdits(paragraphs, ctx.lang) })
      : await structured({
          system: await systemPrompt(ctx.articleType, ctx.categoryId),
          effort: "medium",
          schema: EditsSchema,
          prompt: `Vazifa: “Tahrir” — muallifga matnini o‘zi yaxshilashi uchun aniq takliflar ber (eng muhim 30 tasigacha). Ikki darajada qara:
1) Til: imlo, punktuatsiya, uslub, akademik til, atamalar (kind: spelling, punctuation, style, clarity, terminology, academic).
2) Ma’no va mantiq — eng muhimi: kelishmagan, ma’nosi to‘g‘ri chiqmagan yoki kontekstga zid joylar (kind: meaning), bir-biriga zid da’volar, dalildan kelib chiqmaydigan xulosa, jumlalar orasidagi uzilgan bog‘lanish, bir tushuncha uchun turli atamalar (kind: logic). Bunday joyda butun jumlani olish mumkin.
Har taklif: paragraph — xatboshi raqami; original — o‘sha xatboshidan AYNAN ko‘chirilgan qism (til tuzatishida faqat o‘zgaradigan so‘zlar, ma’no/mantiqda — jumla); replacement — eng yaxshi variant; alternatives — ma’no/mantiq va uslub uchun yana 1–2 ta boshqacha variant (muallif tanlaydi), oddiy imlo uchun bo‘sh ro‘yxat; reason — nima kelishmagani va nega shunday tuzatish yaxshiroq, 1–2 jumla.
Variantlar muallifning o‘z fikrini aniqroq aytadi: yangi ma’lumot, raqam yoki manba qo‘shma, muallif ma’lumotlarini o‘zgartirma, yangi jumla yoki bo‘lim yozma. Jumla to‘g‘ri bo‘lsa, unga taklif berma.
${languageLine(ctx.lang)}
${wrapText(numbered(paragraphs))}`,
        });
  const edits: EditSuggestion[] = [];
  for (const e of res.data.edits) {
    const p = paragraphs[e.paragraph];
    const original = p ? locateInParagraph(p, e.original) : null;
    if (!original || original === e.replacement) continue;
    if (edits.some((x) => x.paragraph === e.paragraph && x.original === original)) continue;
    edits.push({ ...e, original, id: `e${edits.length}` });
  }
  const checkId = await record(ctx, "edit", "EDIT", text, { edits }, res.spend, res.model);
  return { edits, checkId };
}

export async function translate(ctx: FeatureContext, title: string, abstract: string) {
  const res: { data: Translation; spend: Spend; model: string } =
    aiMode() === "mock"
      ? mockResult(mockTranslation(title, abstract, ctx.lang))
      : await structured({
          system: await systemPrompt(ctx.articleType, ctx.categoryId),
          effort: "medium",
          schema: TranslateSchema,
          prompt: `Vazifa: “Tarjima”. Sarlavha va annotatsiyani ingliz va rus tiliga ilmiy uslubda tarjima qil. Sohaning xalqaro atamalarini ishlat, raqam va birliklarni o‘zgartirma, yangi ma’lumot qo‘shma. notes — muallif tekshirishi kerak bo‘lgan atamalar (2–5 ta), ${{ uz: "o‘zbek", ru: "rus", en: "ingliz" }[ctx.lang]} tilida izoh bilan.
${wrapText(`Sarlavha: ${title}\n\nAnnotatsiya: ${abstract}`)}`,
        });
  const checkId = await record(
    ctx,
    "translate",
    "TRANSLATE",
    title + abstract,
    res.data,
    res.spend,
    res.model,
  );
  return { translation: res.data, checkId };
}

const QueriesSchema = z.object({ queries: z.array(z.string().max(200)).min(1).max(2) });

/** International sources for a topic or a claim; the model only writes the search queries. */
export async function findSources(ctx: FeatureContext, topic: string) {
  let queries = [topic.slice(0, 200)];
  let spend = NO_SPEND;
  let model = "none";
  if (aiMode() === "live") {
    const res = await structured({
      system: await systemPrompt(ctx.articleType, ctx.categoryId),
      effort: "low",
      maxTokens: 1000,
      schema: QueriesSchema,
      prompt: `Vazifa: OpenAlex/Crossref’da qidirish uchun 1–2 ta inglizcha qidiruv so‘rovi yoz (3–8 so‘z, ilmiy atamalar bilan). Faqat so‘rovlar.
${wrapText(topic.slice(0, 2000))}`,
    });
    queries = res.data.queries;
    spend = res.spend;
    model = res.model;
  }
  const { items, failed } = await searchScholar(queries);
  const checkId = await record(
    ctx,
    "sources",
    "SOURCES",
    topic,
    { queries, items, failed },
    spend,
    model,
  );
  return { items, queries, failed, checkId } satisfies {
    items: ScholarItem[];
    queries: string[];
    failed: string[];
    checkId: string;
  };
}

/** Similarity with published articles (shingles); external services can replace it later. */
export async function draftOriginality(ctx: FeatureContext, text: string) {
  const published = await db.article.findMany({
    where: { status: "PUBLISHED", ...(ctx.articleId ? { id: { not: ctx.articleId } } : {}) },
    select: {
      id: true,
      slug: true,
      titleUz: true,
      versions: { orderBy: { version: "desc" }, take: 1, select: { htmlBody: true } },
    },
  });
  const report: OriginalityReport = originality(
    text,
    published.map((p) => ({
      id: p.id,
      title: p.titleUz,
      text: (p.versions[0]?.htmlBody ?? "").replace(/<[^>]+>/g, " "),
    })),
  );
  const slugs = new Map(published.map((p) => [p.id, p.slug]));
  const result = {
    ...report,
    matches: report.matches.map((m) => ({ ...m, slug: slugs.get(m.id) ?? null })),
  };
  await record(ctx, "originality", "ORIGINALITY", text, result, NO_SPEND, "shingles-5");
  return result;
}

export async function chat(
  ctx: FeatureContext,
  history: ChatMessage[],
  question: string,
  draft: { title: string; text: string },
) {
  if (aiMode() === "mock") {
    const answer = mockChat(question, ctx.lang);
    await record(ctx, "chat", "CHAT", question, { question, answer }, NO_SPEND, "mock");
    return { answer };
  }
  const context = `${wrapText(`Sarlavha: ${draft.title}\n\n${draft.text.slice(0, 40000)}`, "maqola")}

Vazifa: “Chat”. Muallifning maqolasi bo‘yicha savoliga javob ber. Qisqa (odatda 3–8 jumla), aniq va amaliy bo‘l. Manba yoki raqamni o‘ylab topma — kerak bo‘lsa “Xalqaro manbalar” yoki “Fakt tekshiruvi” asbobini tavsiya qil. Bo‘limni muallif o‘rniga noldan yozma; muallifning o‘z matnini qisqartirish yoki tahrir qilish so‘ralsa — bajarishing mumkin.
${languageLine(ctx.lang)} Muallif boshqa tilda yozsa, shu tilda javob ber.`;
  const messages = [
    { role: "user" as const, content: context },
    { role: "assistant" as const, content: "Tushunarli. Savolingizni bering." },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.text.slice(0, 4000) })),
    { role: "user" as const, content: question.slice(0, 4000) },
  ];
  const res = await textAnswer({
    system: await systemPrompt(ctx.articleType, ctx.categoryId),
    effort: "low",
    messages,
  });
  await record(ctx, "chat", "CHAT", question, { question, answer: res.text }, res.spend, res.model);
  return { answer: res.text };
}
