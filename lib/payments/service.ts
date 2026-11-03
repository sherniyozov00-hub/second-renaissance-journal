import "server-only";
import type { PaymentProvider, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings/get";

export function paymentsMode(): "sandbox" | "live" {
  return process.env.PAYMENTS_MODE === "live" ? "live" : "sandbox";
}

/**
 * Marks a payment paid and moves the article AWAITING_PAYMENT → UNDER_REVIEW
 * (TZ 7, 11). Idempotent: providers may call twice.
 */
export async function markPaid(
  paymentId: string,
  providerTxId: string,
  providerData?: Prisma.InputJsonValue,
): Promise<"paid" | "already_paid" | "not_found" | "cancelled"> {
  const premiumDays = Number((await getSettings())["ai.premiumDays"]) || 30;
  return db
    .$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) return "not_found";
      if (payment.status === "PAID") return "already_paid";
      if (payment.status !== "PENDING") return "cancelled";

      const now = new Date();
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          paidAt: now,
          providerTxId,
          ...(providerData ? { providerData } : {}),
        },
      });
      if (payment.promoCodeId) {
        await tx.promoCode.update({
          where: { id: payment.promoCodeId },
          data: { used: { increment: 1 } },
        });
      }
      if (payment.purpose === "AI_PACKAGE") {
        // Premium: a month from now, or added to the time still left.
        const u = await tx.user.findUnique({
          where: { id: payment.userId },
          select: { premiumUntil: true },
        });
        const from = u?.premiumUntil && u.premiumUntil > now ? u.premiumUntil : now;
        await tx.user.update({
          where: { id: payment.userId },
          data: { premiumUntil: new Date(from.getTime() + premiumDays * 864e5) },
        });
      }
      if (payment.articleId && payment.purpose === "PUBLICATION") {
        const article = await tx.article.findUnique({ where: { id: payment.articleId } });
        if (article?.status === "AWAITING_PAYMENT") {
          await tx.article.update({
            where: { id: article.id },
            data: { status: "UNDER_REVIEW", submittedAt: now, fastTrack: payment.fastTrack },
          });
          await tx.auditLog.create({
            data: {
              actorId: payment.userId,
              action: "status_change",
              entity: "Article",
              entityId: article.id,
              before: { status: article.status },
              after: { status: "UNDER_REVIEW", via: "payment", paymentId: payment.id },
            },
          });
        }
      }
      await tx.auditLog.create({
        data: {
          actorId: payment.userId,
          action: "payment_paid",
          entity: "Payment",
          entityId: payment.id,
          after: { provider: payment.provider, amount: payment.amount, providerTxId },
        },
      });
      return "paid";
    })
    .then(async (result) => {
      if (result === "paid") await notifyPaid(paymentId);
      return result;
    });
}

async function notifyPaid(paymentId: string) {
  const p = await db.payment.findUnique({ where: { id: paymentId }, include: { article: true } });
  if (!p?.article) return;
  const { enqueue } = await import("@/lib/jobs");
  // Muharrir yordamchisi looks at a manuscript as soon as it reaches review.
  if (p.purpose === "PUBLICATION" && p.article.status === "UNDER_REVIEW")
    await enqueue("editor.brief", { articleId: p.article.id });
  await enqueue("notify", {
    userId: p.userId,
    event: { kind: "paid", title: p.article.titleUz, number: p.article.number, amount: p.amount },
  });
}

export async function cancelPayment(paymentId: string, providerData?: Prisma.InputJsonValue) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "PENDING") return payment;
  return db.payment.update({
    where: { id: paymentId },
    data: { status: "CANCELLED", ...(providerData ? { providerData } : {}) },
  });
}

/** Where the user is sent to pay. Sandbox: our own fake checkout page. */
export function checkoutUrl(opts: {
  provider: PaymentProvider;
  paymentId: string;
  amount: number;
  returnUrl: string;
  sandboxUrl: string;
}): string {
  if (paymentsMode() === "sandbox") return opts.sandboxUrl;
  switch (opts.provider) {
    case "PAYME":
    case "CARD": {
      // Payme checkout accepts Uzcard/Humo/Visa cards too.
      const params = `m=${process.env.PAYME_MERCHANT_ID};ac.payment_id=${opts.paymentId};a=${opts.amount * 100};c=${opts.returnUrl}`;
      const host = process.env.PAYME_CHECKOUT_URL || "https://checkout.paycom.uz";
      return `${host}/${Buffer.from(params).toString("base64")}`;
    }
    case "CLICK": {
      const q = new URLSearchParams({
        service_id: process.env.CLICK_SERVICE_ID ?? "",
        merchant_id: process.env.CLICK_MERCHANT_ID ?? "",
        amount: String(opts.amount),
        transaction_param: opts.paymentId,
        return_url: opts.returnUrl,
      });
      return `https://my.click.uz/services/pay?${q}`;
    }
    case "UZUM":
      // Uzum Bank checkout needs merchant onboarding; until its keys and API
      // contract are provided the sandbox page is used (see docs/decisions.md).
      return opts.sandboxUrl;
  }
}
