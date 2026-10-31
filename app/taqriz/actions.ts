"use server";

import { redirect } from "next/navigation";
import type { ReviewRecommendation } from "@/generated/prisma/client";
import { staffOrThrow } from "@/lib/admin/auth";
import { CRITERIA, submitReview } from "@/lib/editorial/review";
import { WorkflowError } from "@/lib/editorial/workflow";

export async function submitReviewAction(form: FormData) {
  const user = await staffOrThrow(["REVIEWER"]);
  const id = String(form.get("reviewId") ?? "");
  const scores = Object.fromEntries(CRITERIA.map((c) => [c, Number(form.get(c))])) as Record<
    (typeof CRITERIA)[number],
    number
  >;
  try {
    await submitReview(user, id, {
      scores,
      comment: String(form.get("comment") ?? ""),
      recommendation: String(form.get("recommendation")) as ReviewRecommendation,
    });
  } catch (err) {
    if (err instanceof WorkflowError) redirect(`/taqriz/${id}?xato=${err.code}`);
    throw err;
  }
  redirect(`/taqriz?yuborildi=1`);
}
