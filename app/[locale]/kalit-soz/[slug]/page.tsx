import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArticleList, ListHeader, parsePage } from "@/components/article/article-list";
import { PageShell } from "@/components/layout/page-shell";
import { findKeywordBySlug, listArticles } from "@/lib/queries/articles";
import { pageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const keyword = await findKeywordBySlug(slug);
  if (!keyword) return {};
  const t = await getTranslations({ locale, namespace: "lists" });
  return pageMetadata({
    locale: locale as AppLocale,
    path: `/kalit-soz/${slug}`,
    title: t("keywordTitle", { keyword }),
  });
}

export default async function KeywordPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const keyword = await findKeywordBySlug(slug);
  if (!keyword) notFound();
  const page = parsePage((await searchParams).page);
  const t = await getTranslations("lists");
  const { items, pages, total } = await listArticles({ keywords: { has: keyword } }, page);

  return (
    <PageShell>
      <ListHeader
        title={t("keywordTitle", { keyword })}
        lead={t("articleCount", { count: total })}
      />
      <div className="container-site py-8 md:py-12 lg:max-w-[1000px]">
        <ArticleList items={items} page={page} pages={pages} basePath={`/kalit-soz/${slug}`} />
      </div>
    </PageShell>
  );
}
