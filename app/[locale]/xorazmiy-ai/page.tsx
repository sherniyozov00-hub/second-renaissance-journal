import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AiTrial } from "@/components/ai/fact-check-box";
import { AiDemoCard } from "@/components/home/ai-demo-card";
import { AiFeatures } from "@/components/home/sections";
import { PageShell } from "@/components/layout/page-shell";
import { aiLimits } from "@/lib/ai/quota";
import { currentUser } from "@/lib/auth/session";
import { pageMetadata } from "@/lib/seo";
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
  const [limits, user] = await Promise.all([aiLimits(), currentUser()]);

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
    </PageShell>
  );
}
