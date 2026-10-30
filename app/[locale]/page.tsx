import { setRequestLocale } from "next-intl/server";
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

const SORTS: LatestSort[] = ["newest", "mostRead", "mostCited"];

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

  const [categories, latest, lessons, price] = await Promise.all([
    getCategories(),
    getLatestArticles(sort, 5),
    getLessons(),
    getSetting("pricing.publication"),
  ]);

  return (
    <PageShell header="home">
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
