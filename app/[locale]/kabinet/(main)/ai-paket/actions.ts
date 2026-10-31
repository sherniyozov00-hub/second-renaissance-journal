"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { currentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { checkoutUrl } from "@/lib/payments/service";
import { siteConfig } from "@/lib/site";
import { aiPackagePrice, parseProvider } from "@/lib/submission/service";

/** "Limitni oshirish" (TZ 10.4): pays for an extra Xorazmiy AI package. */
export async function buyAiPackageAction(form: FormData) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  const price = await aiPackagePrice();
  const locale = (await getLocale()) as AppLocale;
  if (price === null) redirect(getPathname({ href: "/kabinet/ai-paket", locale }));
  const provider = parseProvider(form.get("provider"));
  await db.payment.updateMany({
    where: { userId: user.id, purpose: "AI_PACKAGE", status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  const payment = await db.payment.create({
    data: { userId: user.id, provider, amount: price!, purpose: "AI_PACKAGE" },
  });
  redirect(
    checkoutUrl({
      provider,
      paymentId: payment.id,
      amount: payment.amount,
      returnUrl: `${siteConfig.url}${getPathname({ href: "/kabinet/ai-paket", locale })}`,
      sandboxUrl: getPathname({ href: `/kabinet/tolov/${payment.id}`, locale }),
    }),
  );
}
