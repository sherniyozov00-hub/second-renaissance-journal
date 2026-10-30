import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArticleList, ListHeader, parsePage } from "@/components/article/article-list";
import { PageShell } from "@/components/layout/page-shell";
import type { AppLocale } from "@/i18n/routing";
import { pick } from "@/lib/l10n";
import { listArticles } from "@/lib/queries/articles";
import { getCategoryBySlug } from "@/lib/queries/catalog";
import { pageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return pageMetadata({
    locale: locale as AppLocale,
    path: `/yonalish/${slug}`,
    title: pick(category.name, locale as AppLocale),
    description: pick(category.description, locale as AppLocale),
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  const page = parsePage((await searchParams).page);
  const t = await getTranslations("lists");
  const { items, pages, total } = await listArticles({ categoryId: category.id }, page);

  return (
    <PageShell>
      <ListHeader
        eyebrow={t("categoriesTitle")}
        title={pick(category.name, locale as AppLocale)}
        lead={`${pick(category.description, locale as AppLocale)} · ${t("articleCount", { count: total })}`}
      />
      <div className="container-site py-8 md:py-12 lg:max-w-[1000px]">
        <ArticleList items={items} page={page} pages={pages} basePath={`/yonalish/${slug}`} />
      </div>
    </PageShell>
  );
}
