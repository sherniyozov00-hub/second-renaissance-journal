import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  claimClickQrAction,
  sandboxPayAction,
} from "@/app/[locale]/kabinet/(submit)/yuborish/actions";
import { buttonClass, cardClass } from "@/components/ui/styles";
import type { AppLocale } from "@/i18n/routing";
import { requireCabinetUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/l10n";
import { clickQrId, clickQrLinks, paymentCode } from "@/lib/payments/providers";
import { paymentsMode } from "@/lib/payments/service";
import { qrSvg } from "@/lib/qr";
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
  if (!payment) notFound();
  const t = await getTranslations("submit");
  if (payment.provider === "CLICK_QR") {
    const receiver = await clickQrId();
    if (!receiver) notFound();
    return <ClickQrCheckout payment={payment} receiver={receiver} locale={locale as AppLocale} />;
  }
  if (paymentsMode() !== "sandbox") notFound();

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

/** Click QR of a self-employed receiver: the payer pays in Click, an admin confirms. */
async function ClickQrCheckout({
  payment,
  receiver,
  locale,
}: {
  payment: {
    id: string;
    amount: number;
    purpose: string;
    providerData: unknown;
    article: { titleUz: string } | null;
  };
  receiver: string;
  locale: AppLocale;
}) {
  const t = await getTranslations("submit");
  const amount = formatNumber(payment.amount, locale);
  const links = clickQrLinks(receiver, payment.amount);
  const svg = await qrSvg(links.url);
  const code = paymentCode(payment.id);
  const claimed = Boolean((payment.providerData as { claimedAt?: number } | null)?.claimedAt);

  return (
    <section className={cn(cardClass, "mx-auto max-w-[520px] p-6")}>
      <p className="eyebrow">Click</p>
      <h1 className="mt-2 text-[26px]">{claimed ? t("qr.waitTitle") : t("qr.title")}</h1>
      <p className="mt-2 text-sm text-text-2">
        {payment.purpose === "AI_PACKAGE" ? t("aiPackageLabel") : payment.article?.titleUz}
      </p>
      {claimed ? (
        <p role="status" className="mt-5 rounded-control bg-success-bg px-4 py-3 text-success">
          {t("qr.wait")}
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-ink">{t("qr.lead", { amount })}</p>
          <p className="mt-4 text-center font-serif text-3xl font-bold text-ink">{amount} so‘m</p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <a
              href={links.url}
              className="block size-56 rounded-card border border-border bg-white p-3"
            >
              <span className="block size-full" dangerouslySetInnerHTML={{ __html: svg }} />
            </a>
            <p className="text-xs text-text-2">{t("qr.scan")}</p>
          </div>
          <div className="mt-4 rounded-control bg-blue-50 px-4 py-3 text-sm">
            <p className="text-text-2">{t("qr.ussd")}</p>
            <p className="mt-1 flex items-center justify-between gap-3">
              <code className="font-mono text-lg font-semibold text-ink">{links.ussd}</code>
              <a
                href={`tel:${links.ussd.replace("#", "%23")}`}
                className={buttonClass("secondary", "sm")}
              >
                {t("qr.dial")}
              </a>
            </p>
          </div>
          <div className="mt-3 rounded-control border border-gold px-4 py-3 text-sm">
            <p>
              {t("qr.code")}: <strong className="font-mono text-base">{code}</strong>
            </p>
            <p className="mt-1 text-text-2">{t("qr.codeHint")}</p>
          </div>
          <p className="mt-3 text-xs text-text-2">{t("qr.amountHint", { amount })}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <form action={claimClickQrAction} className="flex-1">
              <input type="hidden" name="paymentId" value={payment.id} />
              <button type="submit" className={buttonClass("primary", "lg", "w-full")}>
                {t("qr.paid")}
              </button>
            </form>
            <form action={sandboxPayAction}>
              <input type="hidden" name="paymentId" value={payment.id} />
              <button
                type="submit"
                name="decision"
                value="cancel"
                className={buttonClass("secondary", "lg", "text-ink")}
              >
                {t("qr.cancel")}
              </button>
            </form>
          </div>
        </>
      )}
    </section>
  );
}
