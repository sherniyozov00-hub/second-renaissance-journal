import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AiTrial } from "@/components/ai/fact-check-box";
import { AiDemoCard } from "@/components/home/ai-demo-card";
import { AiFeatures } from "@/components/home/sections";
import { PageShell } from "@/components/layout/page-shell";
import { aiLimits } from "@/lib/ai/quota";
import { currentUser } from "@/lib/auth/session";
import { pageMetadata } from "@/lib/seo";
import { formatNumber } from "@/lib/l10n";
import { aiPackagePrice, PREMIUM_DEFAULT_PRICE } from "@/lib/payments/ai-package";
import { getSettings } from "@/lib/settings/get";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/styles";
import type { AppLocale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "aiLanding" });
  return pageMetadata({
    locale: locale as AppLocale,
    path: "/xorazmiy-ai",
    title: t("title"),
    description: t("lead"),
  });
}

// Landing for Xorazmiy AI with the free guest trial (TZ 10.4).
export default async function AiLandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("aiLanding");
  const [limits, user, premiumPrice, settings] = await Promise.all([
    aiLimits(),
    currentUser(),
    aiPackagePrice(),
    getSettings(),
  ]);
  const publicationPrice = Number(settings["pricing.publication"]) || 44444;

  return (
    <PageShell>
      <section className="border-b border-border bg-blue-50">
        <div className="container-site grid gap-8 py-10 md:py-16 lg:grid-cols-[1fr_400px] lg:gap-16">
          <div>
            <p className="eyebrow">Xorazmiy AI</p>
            <h1 className="mt-3 text-hero-mobile md:text-[44px] md:leading-tight">{t("title")}</h1>
            <p className="mt-5 max-w-[600px] text-lg leading-relaxed text-text-2">{t("lead")}</p>
            <div className="mt-8">
              <AiTrial
                maxChars={limits.guestMaxChars}
                perDay={limits.guestDaily}
                signedIn={Boolean(user)}
              />
            </div>
          </div>
          <AiDemoCard />
        </div>
      </section>
      <AiFeatures />
      <PlansTable
        freeChecks={limits.authorMonthly}
        articles={limits.premiumArticles}
        price={formatNumber(premiumPrice ?? PREMIUM_DEFAULT_PRICE, locale as AppLocale)}
        publication={formatNumber(publicationPrice, locale as AppLocale)}
      />
    </PageShell>
  );
}

/** Free vs Premium, and publication as a separate fee: formal and plain. */
async function PlansTable({
  freeChecks,
  articles,
  price,
  publication,
}: {
  freeChecks: number;
  articles: number;
  price: string;
  publication: string;
}) {
  const t = await getTranslations("aiLanding.plans");
  const rows = ["r1", "r2", "r3", "r4", "r5"] as const;
  const free: Record<(typeof rows)[number], string> = {
    r1: "✓",
    r2: t("freeTrial", { count: freeChecks }),
    r3: t("freeTrial", { count: freeChecks }),
    r4: "—",
    r5: "✓",
  };
  const prem: Record<(typeof rows)[number], string> = {
    r1: "✓",
    r2: "✓",
    r3: "✓",
    r4: "✓",
    r5: "✓",
  };
  return (
    <section className="border-t border-border bg-white py-12 md:py-16" aria-labelledby="plans">
      <div className="container-site">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 id="plans" className="mt-2 text-[28px] leading-tight md:text-section">
          {t("title")}
        </h2>
        <p className="mt-2 max-w-[680px] text-text-2">{t("lead", { publication })}</p>
        <div className="mt-6 overflow-x-auto rounded-card border border-border">
          <table className="w-full min-w-[560px] text-left text-[15px]">
            <thead className="bg-blue-50 text-ink">
              <tr>
                <th className="px-5 py-4 font-semibold">{t("feature")}</th>
                <th className="px-5 py-4 font-semibold">{t("free")}</th>
                <th className="border-l-4 border-gold px-5 py-4 font-semibold">
                  Premium · {price} {t("perMonth")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r} className="border-t border-border">
                  <td className="px-5 py-3.5 text-ink">{t(r, { articles })}</td>
                  <td className="px-5 py-3.5 text-text-2">{free[r]}</td>
                  <td className="border-l-4 border-gold/40 px-5 py-3.5 font-semibold text-ink">
                    {prem[r]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/kabinet/ai-paket" className={buttonClass("primary", "lg")}>
            {t("cta")}
          </Link>
          <Link href="/kabinet/yuborish" className={buttonClass("secondary", "lg")}>
            {t("submit", { publication })}
          </Link>
        </div>
      </div>
    </section>
  );
}
