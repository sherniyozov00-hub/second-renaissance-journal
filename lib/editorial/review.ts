import "server-only";
import type { ReviewRecommendation } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { type Actor, WorkflowError } from "./workflow";

export const RECOMMENDATIONS: ReviewRecommendation[] = [
  "ACCEPT",
  "MINOR_REVISION",
  "MAJOR_REVISION",
  "REJECT",
];
export const CRITERIA = [
  "scoreRelevance",
  "scoreMethodology",
  "scoreResults",
  "scoreLanguage",
] as const;

/**
 * What a reviewer may see (TZ 3, 17 — blind review): the manuscript, abstract,
 * keywords and AI check results — never authors, affiliations or the submitter.
 */
export async function getBlindReview(actor: Actor | null, reviewId: string) {
  if (!actor?.roles.includes("REVIEWER")) throw new WorkflowError("forbidden");
  const review = await db.review.findFirst({
    where: { id: reviewId, reviewerId: actor.id },
    select: {
      id: true,
      dueAt: true,
      submittedAt: true,
      comment: true,
      recommendation: true,
      scoreRelevance: true,
      scoreMethodology: true,
      scoreResults: true,
      scoreLanguage: true,
      article: {
        select: {
          id: true,
          number: true,
          titleUz: true,
          titleEn: true,
          abstractUz: true,
          abstractEn: true,
          keywords: true,
          type: true,
          status: true,
          aiFeaturesUsed: true,
          category: { select: { name: true } },
          versions: {
            orderBy: { version: "desc" },
            take: 1,
            select: { version: true, docxUrl: true, htmlBody: true },
          },
          aiChecks: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { type: true, result: true, createdAt: true },
          },
        },
      },
    },
  });
  if (!review) throw new WorkflowError("not_found");
  return review;
}

export type ReviewInput = {
  scores: Record<(typeof CRITERIA)[number], number>;
  comment: string;
  recommendation: ReviewRecommendation;
};

export async function submitReview(actor: Actor | null, reviewId: string, input: ReviewInput) {
  if (!actor?.roles.includes("REVIEWER")) throw new WorkflowError("forbidden");
  const review = await db.review.findFirst({
    where: { id: reviewId, reviewerId: actor.id },
    include: { article: true },
  });
  if (!review) throw new WorkflowError("not_found");
  if (review.submittedAt) throw new WorkflowError("bad_status");
  if (!RECOMMENDATIONS.includes(input.recommendation)) throw new WorkflowError("invalid");
  if (
    CRITERIA.some(
      (c) => !Number.isInteger(input.scores[c]) || input.scores[c] < 1 || input.scores[c] > 5,
    )
  ) {
    throw new WorkflowError("invalid");
  }
  if (input.comment.trim().length < 20) throw new WorkflowError("invalid");

  await db.$transaction([
    db.review.update({
      where: { id: reviewId },
      data: {
        ...input.scores,
        comment: input.comment.trim(),
        recommendation: input.recommendation,
        submittedAt: new Date(),
      },
    }),
    db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "review_submitted",
        entity: "Article",
        entityId: review.articleId,
        after: { reviewId, recommendation: input.recommendation },
      },
    }),
  ]);
}
