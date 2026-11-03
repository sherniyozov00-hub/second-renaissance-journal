import "server-only";
import type { PaymentProvider } from "@/generated/prisma/client";
import { getSettings } from "@/lib/settings/get";
import { paymentsMode } from "./service";

/** Click QR receiver id from settings ("" when not set). */
export async function clickQrId(): Promise<string> {
  const v = String((await getSettings())["payments.clickQrId"] ?? "").trim();
  return /^\d{4,12}$/.test(v) ? v : "";
}

/**
 * Payment methods a payer can choose right now. In sandbox every method is
 * simulated; live, only those whose keys are configured — plus the Click QR
 * (paid in the Click app, confirmed by an admin) when its id is set.
 */
export async function availableProviders(): Promise<PaymentProvider[]> {
  const qr = (await clickQrId()) ? (["CLICK_QR"] as const) : [];
  if (paymentsMode() === "sandbox") return ["CLICK", "PAYME", "UZUM", "CARD", ...qr];
  const out: PaymentProvider[] = [...qr];
  if (process.env.CLICK_SERVICE_ID && process.env.CLICK_MERCHANT_ID) out.push("CLICK");
  if (process.env.PAYME_MERCHANT_ID) out.push("PAYME", "CARD");
  return out;
}

/** Click links for one payment: the QR/app link (amount pre-filled) and USSD. */
export function clickQrLinks(receiver: string, amount: number) {
  return {
    url: `https://indoor.click.uz/pay?id=${receiver}&t=0&amount=${amount}`,
    ussd: `*880*${receiver}*${amount}#`,
  };
}

/** Short code the payer writes in the Click comment, e.g. "P-7K2Q9D". */
export function paymentCode(paymentId: string) {
  return `P-${paymentId.slice(-6).toUpperCase()}`;
}
