import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonClass } from "@/components/ui/styles";
import type { AppLocale } from "@/i18n/routing";
import { requireCabinetUser } from "@/lib/auth/session";
import { formatNumber } from "@/lib/l10n";
import { getAiQuota } from "@/lib/queries/cabinet";
import { getSettings } from "@/lib/settings/get";
import { aiPackagePrice, PAYMENT_PROVIDERS } from "@/lib/submission/service";
import { buyAiPackageAction } from "./actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cabinet" });
  return { title: t("aiPackageTitle"), robots: { index: false, follow: false } };
}

/** Extra Xorazmiy AI checks (TZ 10.4, Ekran 7 “Limitni oshirish”). */
export default async function AiPackagePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tolandi?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireCabinetUser(locale, "/kabinet/ai-paket");
  const { tolandi } = await searchParams;
  const [t, ts, quota, price, settings] = await Promise.all([
    getTranslations("cabinet"),
    getTranslations("submit"),
    getAiQuota(user),
    aiPackagePrice(),
    getSettings(),
  ]);
  const monthly = user.aiQuota ?? (Number(settings["ai.authorMonthlyChecks"]) || 0);
  const checks = Number(settings["ai.packageChecks"]) || 20;

  return (
    <>
      <h1 className="text-[28px] leading-tight md:text-section">{t("aiPackageTitle")}</h1>
      <p className="mt-2 max-w-[640px] text-text-2">{t("aiPackageLead", { monthly })}</p>
      {tolandi ? (
        <p role="status" className="mt-4 rounded-card bg-success-bg px-4 py-3 text-success">
          {t("aiPackagePaid")}
        </p>
      ) : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <p className="rounded-card border border-border bg-white p-4">
          {t("aiPackageLeft", { count: quota.left - quota.credits })}
        </p>
        <p className="rounded-card border border-border bg-white p-4">
          {t("aiCredits", { count: quota.credits })}
        </p>
      </div>
      {price === null ? (
        <p className="mt-5 rounded-card border border-border bg-white p-5 text-text-2">
          {t("aiPackageNoPrice")}
        </p>
      ) : (
        <form
          action={buyAiPackageAction}
          className="mt-5 max-w-[520px] rounded-card border border-border bg-white p-5"
        >
          <p className="font-serif text-2xl font-bold text-ink">
            {t("aiPackageOffer", { checks })}
          </p>
          <p className="mt-1 text-lg text-blue-800">
            {formatNumber(price, locale as AppLocale)} so‘m
          </p>
          <fieldset className="mt-4">
            <legend className="text-sm font-semibold">{t("method")}</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PAYMENT_PROVIDERS.map((p, i) => (
                <label
                  key={p}
                  className="flex min-h-11 items-center gap-2 rounded-control border border-border px-3 text-sm has-[:checked]:border-blue-800 has-[:checked]:bg-blue-50"
                >
                  <input type="radio" name="provider" value={p} defaultChecked={i === 0} />
                  {ts(`methods.${p}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className={buttonClass("primary", "lg", "mt-5 w-full")}>
            {t("aiPackageBuy")}
          </button>
        </form>
      )}
    </>
  );
}
