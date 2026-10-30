import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AiDemoCard } from "@/components/home/ai-demo-card";
import { AiFeatures } from "@/components/home/sections";
import { PageShell } from "@/components/layout/page-shell";
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

// Landing for Xorazmiy AI. The guest trial and the workspace arrive in stage 6.
export default async function AiLandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("aiLanding");

  return (
    <PageShell>
      <section className="border-b border-border bg-blue-50">
        <div className="container-site grid gap-8 py-10 md:py-16 lg:grid-cols-[1fr_400px] lg:gap-16">
          <div>
            <p className="eyebrow">Xorazmiy AI</p>
            <h1 className="mt-3 text-hero-mobile md:text-[44px] md:leading-tight">{t("title")}</h1>
            <p className="mt-5 max-w-[600px] text-lg leading-relaxed text-text-2">{t("lead")}</p>
            <p className="mt-6 rounded-card border border-border bg-white p-4 text-sm text-text-2">
              {t("soon")}
            </p>
          </div>
          <AiDemoCard />
        </div>
      </section>
      <AiFeatures />
    </PageShell>
  );
}
