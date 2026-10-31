import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/article/print-button";
import type { AppLocale } from "@/i18n/routing";
import { prepareArticleHtml } from "@/lib/article-html";
import { articleTitle, formatDate } from "@/lib/l10n";
import { getArticleBySlug } from "@/lib/queries/articles";
import { siteConfig } from "@/lib/site";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  return article ? { title: article.titleUz, robots: { index: false } } : {};
}

/**
 * Print-ready view of an article (browser "Save as PDF"). Stage 5 replaces this
 * with a server-generated PDF file (Playwright) stored in S3.
 */
export default async function ArticlePrintPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const article = await getArticleBySlug(slug);
  if (!article) notFound();
  const { html } = prepareArticleHtml(article.versions[0]?.htmlBody ?? "");
  const authors = article.authors.map((a) => a.authorProfile?.fullName ?? a.name).join(", ");

  return (
    <main className="mx-auto max-w-[760px] px-6 py-10 print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>
      <p className="text-sm text-muted">
        {siteConfig.name}
        {article.issue ? ` · ${article.issue.year}, ${article.issue.number}` : ""} · CC BY 4.0
      </p>
      <h1 className="mt-3 font-serif text-3xl font-bold text-ink">
        {articleTitle(article, locale as AppLocale)}
      </h1>
      <p className="mt-3 font-semibold text-blue-800">{authors}</p>
      <p className="mt-1 text-sm text-text-2">
        {formatDate(article.publishedAt, locale as AppLocale)}
      </p>
      <p className="mt-6 font-serif leading-relaxed text-ink">{article.abstractUz}</p>
      <p className="mt-3 text-sm text-text-2">{article.keywords.join(", ")}</p>
      <div className="article-body mt-6" dangerouslySetInnerHTML={{ __html: html }} />
      <ol className="mt-8 list-decimal space-y-1 pl-6 text-sm text-text-2">
        {article.references.map((r) => (
          <li key={r.id}>{r.raw}</li>
        ))}
      </ol>
    </main>
  );
}
