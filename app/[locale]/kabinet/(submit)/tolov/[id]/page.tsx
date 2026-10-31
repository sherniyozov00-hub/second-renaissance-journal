import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { sandboxPayAction } from "@/app/[locale]/kabinet/(submit)/yuborish/actions";
import { buttonClass, cardClass } from "@/components/ui/styles";
import type { AppLocale } from "@/i18n/routing";
import { requireCabinetUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/l10n";
import { paymentsMode } from "@/lib/payments/service";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "submit" });
  return { title: t("sandboxTitle"), robots: { index: false, follow: false } };
}

/** Sandbox checkout (PAYMENTS_MODE=sandbox, TZ 11): stands in for the provider page. */
export default async function SandboxCheckoutPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireCabinetUser(locale, `/kabinet/tolov/${id}`);
  const payment = await db.payment.findFirst({
    where: { id, userId: user.id, status: "PENDING" },
    include: { article: { select: { titleUz: true, number: true } } },
  });
  if (!payment || (paymentsMode() !== "sandbox" && payment.provider !== "UZUM")) notFound();
  const t = await getTranslations("submit");

  return (
    <section className={cn(cardClass, "mx-auto max-w-[520px] p-6")}>
      <p className="eyebrow">{t(`methods.${payment.provider}`)} · sandbox</p>
      <h1 className="mt-2 text-[26px]">{t("sandboxTitle")}</h1>
      <p className="mt-2 text-sm text-text-2">
        {t("sandboxLead", { provider: t(`methods.${payment.provider}`) })}
      </p>
      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-text-2">{t("articleLabel")}</dt>
          <dd className="text-right text-ink">
            {payment.purpose === "AI_PACKAGE" ? t("aiPackageLabel") : payment.article?.titleUz}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-border pt-2 text-base font-semibold">
          <dt>{t("total")}</dt>
          <dd>{formatNumber(payment.amount, locale as AppLocale)} so‘m</dd>
        </div>
      </dl>
      <form action={sandboxPayAction} className="mt-6 flex flex-wrap gap-3">
        <input type="hidden" name="paymentId" value={payment.id} />
        <button
          type="submit"
          name="decision"
          value="pay"
          className={buttonClass("primary", "lg", "flex-1")}
        >
          {t("sandboxPay")}
        </button>
        <button
          type="submit"
          name="decision"
          value="cancel"
          className={buttonClass("secondary", "lg", "text-ink")}
        >
          {t("sandboxCancel")}
        </button>
      </form>
    </section>
  );
}
