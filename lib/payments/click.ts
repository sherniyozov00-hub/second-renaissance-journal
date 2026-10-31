import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { cancelPayment, markPaid } from "./service";

/**
 * Click SHOP API: Prepare (action=0) and Complete (action=1). Requests are
 * form-encoded and signed with MD5 over the documented fields + secret key.
 */
export const CLICK_ERRORS = {
  OK: 0,
  SIGN: -1,
  AMOUNT: -2,
  ACTION: -3,
  ALREADY_PAID: -4,
  ORDER: -5,
  TRANSACTION: -6,
  CANCELLED: -9,
} as const;

export type ClickParams = Record<string, string>;

export function clickSign(p: ClickParams, secret: string, withPrepareId: boolean): string {
  const parts = [
    p.click_trans_id,
    p.service_id,
    secret,
    p.merchant_trans_id,
    withPrepareId ? p.merchant_prepare_id : "",
    p.amount,
    p.action,
    p.sign_time,
  ];
  return createHash("md5").update(parts.join("")).digest("hex");
}

export type ClickReply = {
  click_trans_id?: string;
  merchant_trans_id?: string;
  merchant_prepare_id?: string;
  merchant_confirm_id?: string;
  error: number;
  error_note: string;
};

function reply(
  p: ClickParams,
  error: number,
  note: string,
  extra: Pick<ClickReply, "merchant_prepare_id" | "merchant_confirm_id"> = {},
): ClickReply {
  return {
    click_trans_id: p.click_trans_id,
    merchant_trans_id: p.merchant_trans_id,
    error,
    error_note: note,
    ...extra,
  };
}

export async function handleClick(p: ClickParams, step: "prepare" | "complete") {
  const secret = process.env.CLICK_SECRET_KEY ?? "";
  const complete = step === "complete";
  if (!secret || p.sign_string !== clickSign(p, secret, complete))
    return reply(p, CLICK_ERRORS.SIGN, "SIGN CHECK FAILED");
  if (p.action !== (complete ? "1" : "0")) return reply(p, CLICK_ERRORS.ACTION, "Action not found");

  const payment = await db.payment.findUnique({ where: { id: p.merchant_trans_id } });
  if (!payment) return reply(p, CLICK_ERRORS.ORDER, "Order not found");
  if (Number(p.amount) !== payment.amount) return reply(p, CLICK_ERRORS.AMOUNT, "Incorrect amount");
  if (payment.status === "PAID") return reply(p, CLICK_ERRORS.ALREADY_PAID, "Already paid");
  if (payment.status !== "PENDING")
    return reply(p, CLICK_ERRORS.CANCELLED, "Transaction cancelled");

  if (!complete) {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        provider: "CLICK",
        providerData: { click_trans_id: p.click_trans_id, prepared_at: Date.now() },
      },
    });
    return reply(p, CLICK_ERRORS.OK, "Success", { merchant_prepare_id: payment.id });
  }

  if (p.merchant_prepare_id !== payment.id)
    return reply(p, CLICK_ERRORS.TRANSACTION, "Transaction not found");
  // Click reports a failed payment on its side with a negative error.
  if (Number(p.error) < 0) {
    await cancelPayment(payment.id, { click_trans_id: p.click_trans_id, error: p.error });
    return reply(p, CLICK_ERRORS.CANCELLED, "Transaction cancelled");
  }
  await markPaid(payment.id, p.click_trans_id!, {
    click_trans_id: p.click_trans_id,
    completed_at: Date.now(),
  });
  return reply(p, CLICK_ERRORS.OK, "Success", { merchant_confirm_id: payment.id });
}
