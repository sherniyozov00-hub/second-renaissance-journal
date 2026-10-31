"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { currentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { checkoutUrl, markPaid } from "@/lib/payments/service";
import { siteConfig } from "@/lib/site";
import type { DocxError } from "@/lib/submission/docx";
import {
  getPricing,
  loadSubmission,
  parseDraftForm,
  parseProvider,
  precheck,
  saveDraft,
  startPayment,
  submissionIssues,
  uploadManuscript,
  type Precheck,
  type SubmitIssue,
} from "@/lib/submission/service";

async function requireAuthor() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

/** Autosave (every 10 s and on blur — TZ 7). */
export async function saveDraftAction(
  form: FormData,
): Promise<{ id: string } | { error: "title" }> {
  const user = await requireAuthor();
  const input = parseDraftForm(form);
  const id = String(form.get("articleId") ?? "") || null;
  if (!id && !input.titleUz) return { error: "title" };
  return { id: await saveDraft(user, id, input) };
}

export type UploadState =
  | { ok: true; name: string; sizeKb: number; revision: boolean }
  | { ok: false; error: DocxError | "save_first" };

export async function uploadAction(form: FormData): Promise<UploadState> {
  const user = await requireAuthor();
  const articleId = String(form.get("articleId") ?? "");
  const file = form.get("file");
  if (!articleId) return { ok: false, error: "save_first" };
  if (!(file instanceof File)) return { ok: false, error: "not_docx" };
  const before = await loadSubmission(user, articleId);
  const result = await uploadManuscript(user, articleId, {
    name: file.name,
    size: file.size,
    buffer: Buffer.from(await file.arrayBuffer()),
  });
  if (!result.ok) return result;
  revalidatePath("/[locale]/kabinet", "layout");
  return {
    ok: true,
    name: file.name,
    sizeKb: Math.round(file.size / 1024),
    revision: before?.status === "REVISION_REQUESTED",
  };
}

export async function precheckAction(articleId: string): Promise<Precheck | null> {
  const user = await requireAuthor();
  const own = await loadSubmission(user, articleId);
  if (!own) return null;
  return precheck(own.id);
}

export async function priceAction(fastTrack: boolean, promoCode: string) {
  await requireAuthor();
  const { pricing, promoError } = await getPricing({ fastTrack, promoCode: promoCode || null });
  return { pricing, promoError };
}

export type PayResult = { redirect: string } | { issues: SubmitIssue[] };

/** Validates the submission, creates the payment and returns the checkout URL. */
export async function payAction(form: FormData): Promise<PayResult> {
  const user = await requireAuthor();
  const articleId = String(form.get("articleId") ?? "");
  const article = await loadSubmission(user, articleId);
  if (!article) return { issues: ["titleUz"] };

  const issues = submissionIssues({
    titleUz: article.titleUz,
    titleEn: article.titleEn,
    abstractUz: article.abstractUz,
    keywords: article.keywords,
    authorsCount: article.authors.length,
    hasFile: Boolean(article.versions[0]?.docxUrl),
  });
  if (form.get("consentOriginal") !== "1" || form.get("consentOffer") !== "1")
    issues.push("consents");
  if (issues.length) return { issues };

  const provider = parseProvider(form.get("provider"));
  const result = await startPayment(user, article, {
    provider,
    fastTrack: form.get("fastTrack") === "1",
    promoCode: String(form.get("promo") ?? "").trim() || null,
  });
  if ("error" in result) return { issues: [result.error!] };

  const locale = (await getLocale()) as AppLocale;
  const sandboxUrl = getPathname({ href: `/kabinet/tolov/${result.payment.id}`, locale });
  // A 100 % promo code means there is nothing to pay.
  if (result.payment.amount === 0) {
    await markPaid(result.payment.id, `free-${result.payment.id}`);
    return {
      redirect: getPathname({ href: { pathname: "/kabinet", query: { tolandi: "1" } }, locale }),
    };
  }
  return {
    redirect: checkoutUrl({
      provider,
      paymentId: result.payment.id,
      amount: result.payment.amount,
      returnUrl: `${siteConfig.url}${getPathname({ href: "/kabinet", locale })}`,
      sandboxUrl,
    }),
  };
}

/** Sandbox checkout: the author plays the provider's part. */
export async function sandboxPayAction(form: FormData) {
  const user = await requireAuthor();
  const id = String(form.get("paymentId") ?? "");
  const payment = await db.payment.findFirst({ where: { id, userId: user.id } });
  const locale = (await getLocale()) as AppLocale;
  const { redirect } = await import("next/navigation");
  if (!payment) redirect(getPathname({ href: "/kabinet", locale }));
  if (form.get("decision") === "pay") {
    await markPaid(payment!.id, `sandbox-${payment!.id}`, { sandbox: true, at: Date.now() });
    revalidatePath("/[locale]/kabinet", "layout");
    redirect(getPathname({ href: { pathname: "/kabinet", query: { tolandi: "1" } }, locale }));
  }
  await db.payment.updateMany({
    where: { id: payment!.id, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  redirect(
    getPathname({
      href: { pathname: "/kabinet/yuborish", query: { maqola: payment!.articleId ?? "" } },
      locale,
    }),
  );
}
