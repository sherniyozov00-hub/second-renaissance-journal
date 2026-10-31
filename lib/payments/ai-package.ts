import "server-only";
import { getSettings } from "@/lib/settings/get";
import { parsePrice } from "@/lib/submission/pricing";
import { paymentsMode } from "./service";

/** Extra Xorazmiy AI checks sold in the cabinet (TZ 10.4 “Limitni oshirish”). */
export const AI_PACKAGE_DEMO_PRICE = 20_000;

/** Price of an extra AI package; in sandbox an unset price uses a demo amount. */
export async function aiPackagePrice(): Promise<number | null> {
  const price = parsePrice((await getSettings())["pricing.aiPackage"]);
  if (price === null && paymentsMode() === "sandbox") return AI_PACKAGE_DEMO_PRICE;
  return price;
}
