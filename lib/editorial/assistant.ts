import "server-only";
import { z } from "zod";
import { aiMode, structured } from "@/lib/ai/client";
import { systemPrompt, wrapText } from "@/lib/ai/prompts";
import { db } from "@/lib/db";
import { enqueue } from "@/lib/jobs";
import { getEmailProvider } from "@/lib/notify/email";
import { sendTelegram } from "@/lib/notify/telegram";
import { getSettings } from "@/lib/settings/get";
import { siteConfig } from "@/lib/site";
import { getStorage } from "@/lib/storage";
import { analyzeManuscript, countWords, extractDocx } from "@/lib/submission/docx";
import { originality, type OriginalityReport } from "@/lib/submission/originality";

/**
 * Muharrir yordamchisi (editor's assistant): when a manuscript reaches review
 * (paid, or resubmitted after a revision), it checks it against the journal's
 * requirements, compares it with published articles, ranks reviewers and —
 * when the Claude API is connected — writes a short assessment. The result is
 * shown on the editor's article page and sent to editors by email/Telegram.
 * It only advises: every decision stays with the editor.
 */

export type BriefCheck = {
  key:
    | "words"
    | "sections"
    | "references"
    | "referencesYear"
    | "abstract"
    | "keywords"
    | "titleEn"
    | "originality";
  ok: boolean;
  /** Values for the message, e.g. { value: 2400, min: 3000, max: 8000 }. */
  values: Record<string, string | number>;
};

export type ReviewerSuggestion = {
  id: string;
  name: string;
  /** Reviews in this category already done. */
  inCategory: number;
  /** Reviews assigned and not yet submitted. */
  open: number;
  /** Same affiliation as an author: possible conflict of interest. */
  conflict: boolean;
};

export const AiAssessment = z.object({
  summary: z.string().describe("3–4 jumla: maqola nima haqida, usul va asosiy natija"),
  strengths: z.array(z.string()).max(4).describe("Kuchli tomonlar"),
  concerns: z.array(z.string()).max(5).describe("Muharrir e’tibor berishi kerak bo‘lgan joylar"),
  scopeFit: z.enum(["good", "partial", "poor"]).describe("Yo‘nalish va jurnal mavzusiga mosligi"),
  recommendation: z
    .enum(["send_to_review", "minor_fixes_first", "major_revision", "desk_reject"])
    .describe("Taqrizga yuborishdan oldingi tavsiya"),
});
export type AiAssessment = z.infer<typeof AiAssessment>;

export type EditorBrief = {
  version: number;
  words: number;
  checks: BriefCheck[];
  warnings: number;
  originality: OriginalityReport;
  sectionsMissing: string[];
  reviewers: ReviewerSuggestion[];
  ai: AiAssessment | null;
  /** Why there is no AI part: "mock" (no key) or "error". */
  aiNote?: "mock" | "error";
  createdAt: string;
};

const MAX_AI_CHARS = 60_000;

/** Builds the brief, stores it (AiCheck EDITOR_BRIEF) and returns it. */
export async function buildEditorBrief(articleId: string): Promise<EditorBrief | null> {
  const article = await db.article.findUnique({
    where: { id: articleId },
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 },
      authors: { include: { authorProfile: true } },
      category: true,
    },
  });
  const version = article?.versions[0];
  if (!article || !version?.docxUrl) return null;

  const { text } = await extractDocx(await getStorage().get(version.docxUrl));
  const template = analyzeManuscript(text);
  const s = await getSettings();
  const req = {
    minWords: Number(s["requirements.minWords"]) || 3000,
    maxWords: Number(s["requirements.maxWords"]) || 8000,
    minReferences: Number(s["requirements.minReferences"]) || 10,
    minOriginality: Number(s["requirements.minOriginalityPercent"]) || 0,
  };

  const published = await db.article.findMany({
    where: { status: "PUBLISHED", id: { not: article.id } },
    select: {
      id: true,
      titleUz: true,
      versions: { orderBy: { version: "desc" }, take: 1, select: { htmlBody: true } },
    },
  });
  const orig = originality(
    text,
    published.map((p) => ({
      id: p.id,
      title: p.titleUz,
      text: (p.versions[0]?.htmlBody ?? "").replace(/<[^>]+>/g, " "),
    })),
  );

  const sectionsMissing = Object.entries(template.sections)
    .filter(([, present]) => !present)
    .map(([key]) => key);
  const abstractWords = countWords(article.abstractUz);
  const checks: BriefCheck[] = [
    {
      key: "words",
      ok: template.words >= req.minWords && template.words <= req.maxWords,
      values: { value: template.words, min: req.minWords, max: req.maxWords },
    },
    {
      key: "sections",
      ok: sectionsMissing.length === 0,
      values: { missing: sectionsMissing.length },
    },
    {
      key: "references",
      ok: template.references >= req.minReferences,
      values: { value: template.references, min: req.minReferences },
    },
    {
      key: "referencesYear",
      ok: template.references === 0 || template.referencesWithYear / template.references >= 0.8,
      values: { value: template.referencesWithYear, total: template.references },
    },
    {
      key: "abstract",
      ok: abstractWords >= 150 && abstractWords <= 250,
      values: { value: abstractWords },
    },
    {
      key: "keywords",
      ok: article.keywords.length >= 5 && article.keywords.length <= 7,
      values: { value: article.keywords.length },
    },
    { key: "titleEn", ok: Boolean(article.titleEn?.trim()), values: {} },
    {
      key: "originality",
      ok: orig.originality >= (req.minOriginality || 70),
      values: { value: orig.originality, min: req.minOriginality || 70 },
    },
  ];

  const reviewers = await suggestReviewers(article);

  let ai: AiAssessment | null = null;
  let aiNote: EditorBrief["aiNote"];
  if ((await aiMode()) === "mock") aiNote = "mock";
  else {
    try {
      const res = await structured({
        system: await systemPrompt(article.type, article.categoryId),
        schema: AiAssessment,
        effort: "medium",
        maxTokens: 6000,
        prompt: [
          "Vazifa: sen jurnal muharririga yordamchisan. Quyidagi qo‘lyozmani taqrizga yuborishdan oldin baholab, muharrir uchun qisqa xulosa yoz. Muallifga emas, muharrirga yozasan. Qaror qabul qilma — tavsiya ber.",
          `Yo‘nalish: ${(article.category.name as { uz?: string }).uz ?? article.category.slug}. Maqola turi: ${article.type}.`,
          `Sarlavha: ${article.titleUz}`,
          `Annotatsiya: ${article.abstractUz}`,
          `Kalit so‘zlar: ${article.keywords.join(", ")}`,
          `Avtomatik tekshiruv: ${
            checks
              .filter((c) => !c.ok)
              .map((c) => c.key)
              .join(", ") || "hammasi joyida"
          }.`,
          "Javob tili: o‘zbek (lotin).",
          wrapText(text.slice(0, MAX_AI_CHARS)),
        ].join("\n\n"),
      });
      ai = res.data;
      await db.aiCheck.create({
        data: {
          articleId: article.id,
          type: "EDITOR_BRIEF",
          inputHash: `${version.docxUrl}#ai`,
          model: res.model,
          tokensIn: res.spend.tokensIn,
          tokensOut: res.spend.tokensOut,
          cost: res.spend.cost,
          result: { ai },
        },
      });
    } catch (err) {
      console.error("[editor-brief] AI part failed", err);
      aiNote = "error";
    }
  }

  const brief: EditorBrief = {
    version: version.version,
    words: template.words,
    checks,
    warnings: checks.filter((c) => !c.ok).length,
    originality: orig,
    sectionsMissing,
    reviewers,
    ai,
    aiNote,
    createdAt: new Date().toISOString(),
  };
  await db.aiCheck.create({
    data: {
      articleId: article.id,
      type: "EDITOR_BRIEF",
      inputHash: version.docxUrl,
      model: ai ? "brief+ai" : "brief",
      result: brief as unknown as object,
    },
  });
  return brief;
}

/** Reviewers ranked by experience in the category, then by current load. */
async function suggestReviewers(article: {
  id: string;
  categoryId: string;
  submitterId: string | null;
  authors: {
    affiliation: string | null;
    authorProfile: { userId: string | null; affiliation: string | null } | null;
  }[];
}): Promise<ReviewerSuggestion[]> {
  const authorUsers = new Set(
    [article.submitterId, ...article.authors.map((a) => a.authorProfile?.userId)].filter(
      Boolean,
    ) as string[],
  );
  const affiliations = new Set(
    article.authors
      .map((a) => (a.affiliation ?? a.authorProfile?.affiliation)?.trim().toLowerCase())
      .filter((x): x is string => Boolean(x)),
  );
  const reviewers = await db.user.findMany({
    where: { roles: { has: "REVIEWER" }, isBlocked: false },
    select: {
      id: true,
      name: true,
      profile: { select: { fullName: true, affiliation: true } },
      reviews: {
        select: { articleId: true, submittedAt: true, article: { select: { categoryId: true } } },
      },
    },
  });
  return reviewers
    .filter((r) => !authorUsers.has(r.id) && !r.reviews.some((x) => x.articleId === article.id))
    .map((r) => ({
      id: r.id,
      name: r.profile?.fullName || r.name || "—",
      inCategory: r.reviews.filter(
        (x) => x.submittedAt && x.article.categoryId === article.categoryId,
      ).length,
      open: r.reviews.filter((x) => !x.submittedAt).length,
      conflict: affiliations.has(r.profile?.affiliation?.trim().toLowerCase() ?? "\u0000"),
    }))
    .sort(
      (a, b) =>
        Number(a.conflict) - Number(b.conflict) || b.inCategory - a.inCategory || a.open - b.open,
    )
    .slice(0, 3);
}

/** The latest stored brief of an article, if any. */
export async function latestBrief(articleId: string): Promise<EditorBrief | null> {
  const row = await db.aiCheck.findFirst({
    where: { articleId, type: "EDITOR_BRIEF", model: { in: ["brief", "brief+ai"] } },
    orderBy: { createdAt: "desc" },
  });
  return (row?.result as unknown as EditorBrief) ?? null;
}

/** Job: build the brief and tell the editors (email and Telegram). */
export async function editorBriefJob(articleId: string) {
  const brief = await buildEditorBrief(articleId);
  if (!brief) return;
  const article = await db.article.findUnique({
    where: { id: articleId },
    select: { id: true, number: true, titleUz: true },
  });
  if (!article) return;
  const editors = await db.user.findMany({
    where: { roles: { hasSome: ["EDITOR", "ADMIN"] }, isBlocked: false },
    select: { email: true, telegramChatId: true },
  });
  const url = `${siteConfig.url.replace(/\/$/, "")}/admin/maqolalar/${article.id}`;
  const no = `#${String(article.number).padStart(4, "0")}`;
  const subject = `Muharrir yordamchisi: ${no} — ${brief.warnings ? `${brief.warnings} ta ogohlantirish` : "talablarga mos"}`;
  const lines = [
    `«${article.titleUz}» (v${brief.version}, ${brief.words} so‘z) taqrizga tushdi.`,
    `Originallik: ${brief.originality.originality}%.`,
    brief.ai ? `Xulosa: ${brief.ai.summary}` : null,
    brief.ai ? `Tavsiya: ${RECOMMENDATION_UZ[brief.ai.recommendation]}.` : null,
    brief.reviewers.length
      ? `Taqrizchi taklifi: ${brief.reviewers.map((r) => r.name).join(", ")}.`
      : "Taqrizchi taklifi yo‘q: REVIEWER roli berilgan foydalanuvchi yo‘q.",
    `Batafsil: ${url}`,
  ].filter(Boolean);
  const text = lines.join("\n");
  const email = await getEmailProvider();
  const results = await Promise.allSettled(
    editors.flatMap((e) => [
      ...(e.email ? [email.send({ to: e.email, subject, text })] : []),
      ...(e.telegramChatId ? [sendTelegram(e.telegramChatId, `${subject}\n\n${text}`)] : []),
    ]),
  );
  for (const r of results) if (r.status === "rejected") console.error("[editor-brief]", r.reason);
}

const RECOMMENDATION_UZ: Record<AiAssessment["recommendation"], string> = {
  send_to_review: "taqrizga yuborish mumkin",
  minor_fixes_first: "avval kichik tuzatishlar",
  major_revision: "jiddiy qayta ishlash kerak",
  desk_reject: "jurnal mavzusiga mos emas / rad etish ko‘rib chiqilsin",
};

/** Queues the assistant for an article that has just reached review. */
export function queueEditorBrief(articleId: string) {
  return enqueue("editor.brief", { articleId });
}
