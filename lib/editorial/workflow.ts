import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { ArticleStatus, Prisma, Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { enqueue } from "@/lib/jobs";
import { absoluteUrl } from "@/lib/seo";
import { slugify } from "@/lib/text/uz";

/**
 * Editorial life cycle (TZ 7). Every transition is checked, written to the
 * AuditLog and announced to the submitting author (email + Telegram).
 */
export type Actor = { id: string; roles: Role[] };

export class WorkflowError extends Error {
  constructor(public readonly code: "forbidden" | "bad_status" | "not_found" | "invalid") {
    super(code);
  }
}

export function isEditor(actor: Actor | null): actor is Actor {
  return !!actor && (actor.roles.includes("EDITOR") || actor.roles.includes("ADMIN"));
}

/** Allowed transitions; anything else is refused. */
export const TRANSITIONS: Partial<Record<ArticleStatus, ArticleStatus[]>> = {
  AWAITING_PAYMENT: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["REVISION_REQUESTED", "ACCEPTED", "REJECTED"],
  REVISION_REQUESTED: ["UNDER_REVIEW", "REJECTED"],
  ACCEPTED: ["PUBLISHED", "REVISION_REQUESTED", "REJECTED"],
};

export function canTransition(from: ArticleStatus, to: ArticleStatus) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

type Tx = Prisma.TransactionClient;

async function audit(
  tx: Tx,
  actorId: string,
  action: string,
  entityId: string,
  before: object,
  after: object,
) {
  await tx.auditLog.create({
    data: { actorId, action, entity: "Article", entityId, before, after },
  });
}

async function loadForEditor(actor: Actor | null, articleId: string) {
  if (!isEditor(actor)) throw new WorkflowError("forbidden");
  const article = await db.article.findUnique({ where: { id: articleId } });
  if (!article) throw new WorkflowError("not_found");
  return { actor, article };
}

async function notifyAuthor(
  article: { submitterId: string | null; titleUz: string; number: number },
  status: ArticleStatus,
  note?: string | null,
) {
  if (!article.submitterId) return;
  await enqueue("notify", {
    userId: article.submitterId,
    event: { kind: "status", status, title: article.titleUz, number: article.number, note },
  });
}

async function changeStatus(
  actor: Actor | null,
  articleId: string,
  to: ArticleStatus,
  opts: { note?: string; extra?: Prisma.ArticleUpdateInput } = {},
) {
  const { actor: a, article } = await loadForEditor(actor, articleId);
  if (!canTransition(article.status, to)) throw new WorkflowError("bad_status");
  await db.$transaction(async (tx) => {
    await tx.article.update({ where: { id: article.id }, data: { status: to, ...opts.extra } });
    if (opts.note) {
      await tx.editorComment.create({
        data: { articleId: article.id, authorId: a.id, body: opts.note, visibleToAuthor: true },
      });
    }
    await audit(
      tx,
      a.id,
      "status_change",
      article.id,
      { status: article.status },
      { status: to, note: opts.note ?? null },
    );
  });
  await notifyAuthor(article, to, opts.note);
}

export async function requestRevision(actor: Actor | null, articleId: string, note: string) {
  if (note.trim().length < 5) throw new WorkflowError("invalid");
  return changeStatus(actor, articleId, "REVISION_REQUESTED", { note: note.trim() });
}

export async function acceptArticle(actor: Actor | null, articleId: string) {
  return changeStatus(actor, articleId, "ACCEPTED", { extra: { acceptedAt: new Date() } });
}

export async function rejectArticle(actor: Actor | null, articleId: string, reason: string) {
  if (reason.trim().length < 5) throw new WorkflowError("invalid");
  return changeStatus(actor, articleId, "REJECTED", { note: reason.trim() });
}

/** Editor note to the author without a status change. */
export async function addComment(
  actor: Actor | null,
  articleId: string,
  body: string,
  visibleToAuthor: boolean,
) {
  const { actor: a, article } = await loadForEditor(actor, articleId);
  if (body.trim().length < 2) throw new WorkflowError("invalid");
  await db.editorComment.create({
    data: { articleId, authorId: a.id, body: body.trim(), visibleToAuthor },
  });
  if (visibleToAuthor && article.submitterId) {
    await enqueue("notify", {
      userId: article.submitterId,
      event: { kind: "comment", title: article.titleUz, number: article.number, body: body.trim() },
    });
  }
}

/** Assigns a reviewer (blind review — the reviewer never sees author data). */
export async function assignReviewer(
  actor: Actor | null,
  articleId: string,
  reviewerId: string,
  dueAt: Date,
) {
  const { actor: a, article } = await loadForEditor(actor, articleId);
  if (article.status !== "UNDER_REVIEW") throw new WorkflowError("bad_status");
  const reviewer = await db.user.findUnique({ where: { id: reviewerId } });
  if (!reviewer?.roles.includes("REVIEWER") || reviewer.isBlocked)
    throw new WorkflowError("invalid");
  if (reviewer.id === article.submitterId) throw new WorkflowError("invalid");
  await db.$transaction(async (tx) => {
    await tx.review.create({ data: { articleId, reviewerId, dueAt } });
    await audit(
      tx,
      a.id,
      "reviewer_assigned",
      articleId,
      {},
      { reviewerId, dueAt: dueAt.toISOString() },
    );
  });
}

/** Issue, pages and DOI before publication. */
export async function setPublicationDetails(
  actor: Actor | null,
  articleId: string,
  d: {
    issueId: string | null;
    pageStart: number | null;
    pageEnd: number | null;
    doi: string | null;
  },
) {
  const { actor: a, article } = await loadForEditor(actor, articleId);
  if (d.doi && !/^10\.\d{4,9}\/\S+$/.test(d.doi)) throw new WorkflowError("invalid");
  if (d.pageStart && d.pageEnd && d.pageEnd < d.pageStart) throw new WorkflowError("invalid");
  await db.$transaction(async (tx) => {
    await tx.article.update({ where: { id: articleId }, data: d });
    await audit(
      tx,
      a.id,
      "publication_details",
      articleId,
      {
        issueId: article.issueId,
        pageStart: article.pageStart,
        pageEnd: article.pageEnd,
        doi: article.doi,
      },
      d,
    );
  });
}

async function uniqueArticleSlug(tx: Tx, title: string, ownId: string) {
  const base = slugify(title) || "maqola";
  for (let i = 0; i < 50; i++) {
    const slug = i ? `${base}-${i + 1}` : base;
    const taken = await tx.article.findUnique({ where: { slug }, select: { id: true } });
    if (!taken || taken.id === ownId) return slug;
  }
  return `${base}-${randomBytes(3).toString("hex")}`;
}

/** Short public certificate code, stable per article author. */
function certificateCode(articleId: string, articleAuthorId: string) {
  const hex = createHash("sha256").update(`${articleId}:${articleAuthorId}`).digest("hex");
  return BigInt(`0x${hex.slice(0, 12)}`)
    .toString(36)
    .toUpperCase()
    .padStart(8, "0")
    .slice(0, 8);
}

/**
 * ACCEPTED → PUBLISHED (TZ 7): readable slug, publication date, a certificate
 * for every co-author, PDF generation and notifications. The sitemap is built
 * per request, so the article appears there immediately.
 */
export async function publishArticle(actor: Actor | null, articleId: string) {
  const { actor: a, article } = await loadForEditor(actor, articleId);
  if (!canTransition(article.status, "PUBLISHED")) throw new WorkflowError("bad_status");
  if (!article.issueId) throw new WorkflowError("invalid");

  const { slug, certificates } = await db.$transaction(async (tx) => {
    const slug = await uniqueArticleSlug(tx, article.titleUz, article.id);
    await tx.article.update({
      where: { id: article.id },
      data: { status: "PUBLISHED", slug, publishedAt: new Date() },
    });
    const authors = await tx.articleAuthor.findMany({
      where: { articleId: article.id },
      include: { authorProfile: true },
    });
    const certificates: string[] = [];
    for (const au of authors) {
      const id = certificateCode(article.id, au.id);
      await tx.certificate.upsert({
        where: { articleId_articleAuthorId: { articleId: article.id, articleAuthorId: au.id } },
        update: {},
        create: {
          id,
          articleId: article.id,
          articleAuthorId: au.id,
          authorName: au.authorProfile?.fullName ?? au.name ?? "",
        },
      });
      certificates.push(id);
    }
    await audit(
      tx,
      a.id,
      "status_change",
      article.id,
      { status: article.status, slug: article.slug },
      { status: "PUBLISHED", slug },
    );
    return { slug, certificates };
  });

  await enqueue("pdf.article", { articleId: article.id });
  for (const id of certificates) await enqueue("pdf.certificate", { certificateId: id });
  if (article.submitterId) {
    await enqueue("notify", {
      userId: article.submitterId,
      event: {
        kind: "published",
        title: article.titleUz,
        url: absoluteUrl(`/maqola/${slug}`, "uz"),
        certificateUrl: certificates[0]
          ? absoluteUrl(`/sertifikat/${certificates[0]}`, "uz")
          : undefined,
      },
    });
  }
  return { slug };
}

/** Refund from the admin panel with a reason (TZ 11). */
export async function refundPayment(actor: Actor | null, paymentId: string, reason: string) {
  if (!actor?.roles.includes("ADMIN")) throw new WorkflowError("forbidden");
  if (reason.trim().length < 5) throw new WorkflowError("invalid");
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new WorkflowError("not_found");
  if (payment.status !== "PAID") throw new WorkflowError("bad_status");
  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "REFUNDED", refundReason: reason.trim() },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "payment_refunded",
        entity: "Payment",
        entityId: paymentId,
        before: { status: "PAID" },
        after: { status: "REFUNDED", reason: reason.trim() },
      },
    });
  });
}
