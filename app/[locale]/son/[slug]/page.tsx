import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArticleList, ListHeader, parsePage } from "@/components/article/article-list";
import { PageShell } from "@/components/layout/page-shell";
import type { AppLocale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/l10n";
import { listArticles } from "@/lib/queries/articles";
import { parseIssueSlug } from "@/lib/queries/catalog";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

async function findIssue(slug: string) {
  const parsed = parseIssueSlug(slug);
  if (!parsed) return null;
  return db.issue.findFirst({ where: { ...parsed, status: "PUBLISHED" } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const issue = await findIssue(slug);
  if (!issue) return {};
  const t = await getTranslations({ locale, namespace: "lists" });
  return { title: t("issueTitle", { year: issue.year, number: issue.number }) };
}

export default async function IssuePage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const issue = await findIssue(slug);
  if (!issue) notFound();
  const page = parsePage((await searchParams).page);
  const t = await getTranslations("lists");
  const { items, pages, total } = await listArticles({ issueId: issue.id }, page);

  return (
    <PageShell>
      <ListHeader
        eyebrow={t("issuesTitle")}
        title={t("issueTitle", { year: issue.year, number: issue.number })}
        lead={`${formatDate(issue.publishedAt, locale as AppLocale)} · ${t("articleCount", { count: total })}`}
      />
      <div className="container-site py-8 md:py-12 lg:max-w-[1000px]">
        <ArticleList items={items} page={page} pages={pages} basePath={`/son/${slug}`} />
      </div>
    </PageShell>
  );
}
