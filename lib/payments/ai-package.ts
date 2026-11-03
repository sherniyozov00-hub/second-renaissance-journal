import "server-only";
import { getSettings } from "@/lib/settings/get";
import { parsePrice } from "@/lib/submission/pricing";

/** Xorazmiy AI Premium (one month): the price shown and charged, UZS. */
export const PREMIUM_DEFAULT_PRICE = 39_990;

export async function aiPackagePrice(): Promise<number | null> {
  return parsePrice((await getSettings())["pricing.premium"]) ?? PREMIUM_DEFAULT_PRICE;
}
