import "server-only";
import { randomBytes } from "node:crypto";
import type { ArticleType, Locale, PaymentProvider } from "@/generated/prisma/client";
import { prepareArticleHtml } from "@/lib/article-html";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings/get";
import { getStorage } from "@/lib/storage";
import {
  analyzeManuscript,
  countWords,
  extractDocx,
  validateDocx,
  type DocxError,
  type TemplateReport,
} from "./docx";
import { originality, type OriginalityReport } from "./originality";
import { computePrice, parsePrice, SANDBOX_DEMO_PRICE, type PriceBreakdown } from "./pricing";
import { paymentsMode } from "@/lib/payments/service";

export type SubmitUser = {
  id: string;
  profile: {
    id: string;
    fullName: string;
    affiliation: string | null;
    orcid: string | null;
  } | null;
};

/** Statuses in which the author may still edit the submission. */
const EDITABLE = ["DRAFT", "AWAITING_PAYMENT", "REVISION_REQUESTED"] as const;

export function loadSubmission(user: SubmitUser, articleId?: string | null) {
  return db.article.findFirst({
    where: {
      submitterId: user.id,
      status: { in: [...EDITABLE] },
      ...(articleId ? { id: articleId } : { status: "DRAFT" }),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      authors: { orderBy: { order: "asc" } },
      versions: { orderBy: { version: "desc" }, take: 1 },
      payments: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export type Submission = NonNullable<Awaited<ReturnType<typeof loadSubmission>>>;

export type AuthorInput = {
  name: string;
  affiliation: string;
  orcid: string;
  corresponding: boolean;
};

export type DraftInput = {
  titleUz: string;
  titleEn: string;
  titleRu: string;
  categoryId: string;
  type: ArticleType;
  language: Locale;
  abstractUz: string;
  abstractEn: string;
  keywords: string[];
  authors: AuthorInput[];
};

const TYPES: ArticleType[] = ["RESEARCH", "REVIEW", "CASE_STUDY", "POPULAR"];
const LANGS: Locale[] = ["uz", "ru", "en"];

export function parseKeywords(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[,;\n]/)
        .map((k) => k.trim().replace(/\s+/g, " "))
        .filter(Boolean),
    ),
  ].slice(0, 10);
}

/** Reads the draft fields from the form; anything may still be incomplete. */
export function parseDraftForm(form: FormData): DraftInput {
  const str = (k: string, max = 400) =>
    String(form.get(k) ?? "")
      .trim()
      .slice(0, max);
  const names = form.getAll("authorName").map(String);
  const affs = form.getAll("authorAffiliation").map(String);
  const orcids = form.getAll("authorOrcid").map(String);
  const corresponding = Number(form.get("corresponding") ?? 0);
  const type = str("type") as ArticleType;
  const language = str("language") as Locale;
  return {
    titleUz: str("titleUz"),
    titleEn: str("titleEn"),
    titleRu: str("titleRu"),
    categoryId: str("categoryId", 40),
    type: TYPES.includes(type) ? type : "RESEARCH",
    language: LANGS.includes(language) ? language : "uz",
    abstractUz: str("abstractUz", 4000),
    abstractEn: str("abstractEn", 4000),
    keywords: parseKeywords(str("keywords", 600)),
    authors: names
      .map((name, i) => ({
        name: name.trim().slice(0, 120),
        affiliation: (affs[i] ?? "").trim().slice(0, 200),
        orcid: (orcids[i] ?? "").trim().toUpperCase().slice(0, 19),
        corresponding: i === corresponding,
      }))
      .filter((a) => a.name || a.affiliation || a.orcid)
      .slice(0, 12),
  };
}

/** Creates or updates the draft; returns its id. */
export async function saveDraft(
  user: SubmitUser,
  articleId: string | null,
  input: DraftInput,
): Promise<string> {
  const categoryId =
    input.categoryId ||
    (await db.category.findFirst({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { id: true },
    }))!.id;

  const data = {
    titleUz: input.titleUz,
    titleEn: input.titleEn || null,
    titleRu: input.titleRu || null,
    categoryId,
    type: input.type,
    language: input.language,
    abstractUz: input.abstractUz,
    abstractEn: input.abstractEn || null,
    keywords: input.keywords,
  };

  return db.$transaction(async (tx) => {
    let id = articleId;
    if (id) {
      const own = await tx.article.findFirst({
        where: { id, submitterId: user.id, status: { in: [...EDITABLE] } },
        select: { id: true },
      });
      if (!own) throw new Error("Not your editable submission");
      await tx.article.update({ where: { id }, data });
    } else {
      const created = await tx.article.create({
        data: {
          ...data,
          slug: `qoralama-${randomBytes(6).toString("hex")}`,
          status: "DRAFT",
          submitterId: user.id,
        },
      });
      id = created.id;
    }

    await tx.articleAuthor.deleteMany({ where: { articleId: id } });
    const authors = input.authors.length
      ? input.authors
      : user.profile
        ? [
            {
              name: user.profile.fullName,
              affiliation: user.profile.affiliation ?? "",
              orcid: user.profile.orcid ?? "",
              corresponding: true,
            },
          ]
        : [];
    for (const [order, a] of authors.entries()) {
      // The submitting author's own row links to their public profile.
      const own = order === 0 && user.profile && a.name === user.profile.fullName;
      await tx.articleAuthor.create({
        data: {
          articleId: id,
          order,
          isCorresponding: a.corresponding,
          authorProfileId: own ? user.profile!.id : null,
          name: own ? null : a.name,
          affiliation: own ? null : a.affiliation || null,
          orcid: own ? null : a.orcid || null,
        },
      });
    }
    return id;
  });
}

export type UploadResult = { ok: true; report: TemplateReport } | { ok: false; error: DocxError };

/** Stores the manuscript as a new version; a revision goes back to review (TZ 7). */
export async function uploadManuscript(
  user: SubmitUser,
  articleId: string,
  file: { name: string; size: number; buffer: Buffer },
): Promise<UploadResult> {
  const article = await db.article.findFirst({
    where: { id: articleId, submitterId: user.id, status: { in: [...EDITABLE] } },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!article) throw new Error("Not your editable submission");

  const invalid = await validateDocx(file);
  if (invalid) return { ok: false, error: invalid };
  const { html, text } = await extractDocx(file.buffer);
  if (countWords(text) < 50) return { ok: false, error: "empty" };

  const version = (article.versions[0]?.version ?? 0) + 1;
  const key = `manuscripts/${article.id}/v${version}-${Date.now()}.docx`;
  await getStorage().put(
    key,
    file.buffer,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );

  const revision = article.status === "REVISION_REQUESTED";
  await db.$transaction([
    db.articleVersion.create({
      data: {
        articleId: article.id,
        version,
        docxUrl: key,
        htmlBody: prepareArticleHtml(html).html,
        note: `${file.name} · ${Math.round(file.size / 1024)} KB`,
      },
    }),
    ...(revision
      ? [
          db.article.update({ where: { id: article.id }, data: { status: "UNDER_REVIEW" } }),
          db.auditLog.create({
            data: {
              actorId: user.id,
              action: "status_change",
              entity: "Article",
              entityId: article.id,
              before: { status: "REVISION_REQUESTED" },
              after: { status: "UNDER_REVIEW", version },
            },
          }),
        ]
      : []),
  ]);
  return { ok: true, report: analyzeManuscript(text) };
}

export type Precheck = {
  template: TemplateReport;
  originality: OriginalityReport;
  abstractWords: number;
  keywords: number;
  requirements: {
    minWords: number;
    maxWords: number;
    minReferences: number;
    minOriginality: number | null;
  };
};

/** "Xorazmiy AI oldindan tekshiruvi" (TZ 7.4): warnings only, never blocking. */
export async function precheck(articleId: string): Promise<Precheck | null> {
  const article = await db.article.findUnique({
    where: { id: articleId },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  const version = article?.versions[0];
  if (!article || !version?.docxUrl) return null;

  const buffer = await getStorage().get(version.docxUrl);
  const { text } = await extractDocx(buffer);
  const published = await db.article.findMany({
    where: { status: "PUBLISHED", id: { not: article.id } },
    select: {
      id: true,
      titleUz: true,
      versions: { orderBy: { version: "desc" }, take: 1, select: { htmlBody: true } },
    },
  });
  const report = originality(
    text,
    published.map((p) => ({
      id: p.id,
      title: p.titleUz,
      text: (p.versions[0]?.htmlBody ?? "").replace(/<[^>]+>/g, " "),
    })),
  );

  await db.aiCheck.create({
    data: {
      articleId: article.id,
      type: "ORIGINALITY",
      inputHash: version.docxUrl,
      model: "shingles-5",
      result: report,
    },
  });

  const s = await getSettings();
  const minOriginality = parsePrice(s["requirements.minOriginalityPercent"]);
  return {
    template: analyzeManuscript(text),
    originality: report,
    abstractWords: countWords(article.abstractUz),
    keywords: article.keywords.length,
    requirements: {
      minWords: Number(s["requirements.minWords"]) || 3000,
      maxWords: Number(s["requirements.maxWords"]) || 8000,
      minReferences: Number(s["requirements.minReferences"]) || 10,
      minOriginality,
    },
  };
}

export type SubmitIssue =
  | "titleUz"
  | "titleEn"
  | "abstract"
  | "keywords"
  | "authors"
  | "file"
  | "consents"
  | "price"
  | "promo";

/** Required before payment (TZ 7, 16). */
export function submissionIssues(a: {
  titleUz: string;
  titleEn: string | null;
  abstractUz: string;
  keywords: string[];
  authorsCount: number;
  hasFile: boolean;
}): SubmitIssue[] {
  const issues: SubmitIssue[] = [];
  if (a.titleUz.trim().length < 10) issues.push("titleUz");
  if (!a.titleEn || a.titleEn.trim().length < 10) issues.push("titleEn");
  const words = countWords(a.abstractUz);
  if (words < 150 || words > 250) issues.push("abstract");
  if (a.keywords.length < 5 || a.keywords.length > 7) issues.push("keywords");
  if (a.authorsCount < 1) issues.push("authors");
  if (!a.hasFile) issues.push("file");
  return issues;
}

export type Pricing = PriceBreakdown & { fastTrackPrice: number | null; demo: boolean };

/** Current prices from Settings; in sandbox an unset price uses a demo amount. */
export async function getPricing(opts: { fastTrack: boolean; promoCode: string | null }) {
  const s = await getSettings();
  let base = parsePrice(s["pricing.publication"]);
  const demo = base === null && paymentsMode() === "sandbox";
  if (base === null && demo) base = SANDBOX_DEMO_PRICE;
  const fastTrackPrice = parsePrice(s["pricing.fastTrack"]);

  let promo: { id: string; discountPercent: number | null; discountAmount: number | null } | null =
    null;
  let promoError = false;
  if (opts.promoCode) {
    const p = await db.promoCode.findUnique({
      where: { code: opts.promoCode.trim().toUpperCase() },
    });
    const valid =
      p &&
      p.isActive &&
      (!p.validUntil || p.validUntil > new Date()) &&
      (p.usageLimit === null || p.used < p.usageLimit);
    if (valid) promo = p;
    else promoError = true;
  }

  if (base === null) return { pricing: null, promo: null, promoError };
  const breakdown = computePrice({ base, fastTrackPrice, fastTrack: opts.fastTrack, promo });
  return { pricing: { ...breakdown, fastTrackPrice, demo } satisfies Pricing, promo, promoError };
}

const PROVIDERS: PaymentProvider[] = ["CLICK", "PAYME", "UZUM", "CARD"];

export function parseProvider(v: unknown): PaymentProvider {
  return PROVIDERS.includes(v as PaymentProvider) ? (v as PaymentProvider) : "CLICK";
}

/** Creates the pending payment and moves the article to AWAITING_PAYMENT. */
export async function startPayment(
  user: SubmitUser,
  article: Submission,
  opts: { provider: PaymentProvider; fastTrack: boolean; promoCode: string | null },
) {
  const { pricing, promo, promoError } = await getPricing({
    fastTrack: opts.fastTrack,
    promoCode: opts.promoCode,
  });
  if (promoError) return { error: "promo" as const };
  if (!pricing) return { error: "price" as const };

  // Re-use the pending payment if the author comes back to the payment step.
  await db.payment.updateMany({
    where: { articleId: article.id, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  const payment = await db.payment.create({
    data: {
      articleId: article.id,
      userId: user.id,
      provider: opts.provider,
      amount: pricing.total,
      fastTrack: opts.fastTrack && pricing.fastTrack > 0,
      promoCodeId: promo?.id ?? null,
    },
  });
  if (article.status === "DRAFT") {
    await db.article.update({ where: { id: article.id }, data: { status: "AWAITING_PAYMENT" } });
    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "status_change",
        entity: "Article",
        entityId: article.id,
        before: { status: "DRAFT" },
        after: { status: "AWAITING_PAYMENT", paymentId: payment.id },
      },
    });
  }
  return { payment };
}
