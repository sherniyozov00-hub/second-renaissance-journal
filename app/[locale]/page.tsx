import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/hero";
import {
  Academy,
  AiFeatures,
  Categories,
  LatestArticles,
  PlatformMore,
  ProcessAndPrice,
} from "@/components/home/sections";
import { PageShell } from "@/components/layout/page-shell";
import { getLatestArticles, type LatestSort } from "@/lib/queries/articles";
import { getCategories, getLessons } from "@/lib/queries/catalog";
import { getSetting } from "@/lib/settings/get";
import { JsonLd } from "@/components/seo/json-ld";
import type { AppLocale } from "@/i18n/routing";
import { absoluteUrl, pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { homeGraph } from "@/lib/structured-data";

const SORTS: LatestSort[] = ["newest", "mostRead", "mostCited"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    ...pageMetadata({
      locale: locale as AppLocale,
      path: "/",
      title: siteConfig.name,
      description: t("lead"),
    }),
    // The home page shows the bare site name, without the "— site name" suffix.
    title: { absolute: siteConfig.name },
  };
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { tab } = await searchParams;
  const sort = SORTS.find((s) => s === tab) ?? "newest";

  const [categories, latest, lessons, price, issn, t] = await Promise.all([
    getCategories(),
    getLatestArticles(sort, 5),
    getLessons(locale),
    getSetting("pricing.publication"),
    getSetting("journal.issn"),
    getTranslations("common"),
  ]);
  const l = locale as AppLocale;

  return (
    <PageShell header="home">
      <JsonLd
        data={homeGraph({
          name: siteConfig.name,
          url: absoluteUrl("/", l),
          searchUrl: absoluteUrl("/maqolalar", l),
          issn: String(issn),
          description: t("tagline"),
        })}
      />
      <Hero />
      <AiFeatures />
      <Categories categories={categories} />
      <LatestArticles articles={latest} sort={sort} />
      <Academy lessons={lessons} />
      <PlatformMore />
      <ProcessAndPrice price={price as string | number} />
    </PageShell>
  );
}
