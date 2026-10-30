import { ArrowRight, Download } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AbstractTabs, CitationBox, CopyLinkButton, ViewBeacon } from "@/components/article/client";
import { PageShell } from "@/components/layout/page-shell";
import { buttonClass, cardClass, chipClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { prepareArticleHtml } from "@/lib/article-html";
import { formatApa, formatBibtex, formatGost } from "@/lib/citation";
import {
  articleAbstract,
  articleTitle,
  formatDate,
  formatNumber,
  initials,
  pick,
} from "@/lib/l10n";
import { getArticleBySlug, getRelatedArticles } from "@/lib/queries/articles";
import { getSettings } from "@/lib/settings/get";
import { absoluteUrl, pageMetadata } from "@/lib/seo";
import { breadcrumbList, scholarlyArticle } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
import { ScholarMeta } from "@/components/seo/scholar-meta";
import { siteConfig } from "@/lib/site";
import { slugify } from "@/lib/text/uz";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  const l = locale as AppLocale;
  const meta = pageMetadata({
    locale: l,
    path: `/maqola/${article.slug}`,
    title: articleTitle(article, l),
    description: articleAbstract(article, l),
    type: "article",
  });
  return {
    ...meta,
    openGraph: {
      ...meta.openGraph,
      type: "article",
      publishedTime: article.publishedAt?.toISOString(),
      authors: article.authors.map((a) => a.authorProfile?.fullName ?? a.name ?? ""),
      tags: article.keywords,
    },
  };
}

const SIDEBAR_LABEL = "font-sans text-[13px] font-semibold tracking-[0.08em] text-text-2 uppercase";

export default async function ArticlePage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as AppLocale;

  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const t = await getTranslations();
  const [related, settings] = await Promise.all([
    getRelatedArticles(article.id, article.categoryId, article.keywords),
    getSettings(),
  ]);

  const title = articleTitle(article, locale);
  const { html, toc } = prepareArticleHtml(article.versions[0]?.htmlBody ?? "");
  const authors = article.authors.map((a) => ({
    name: a.authorProfile?.fullName ?? a.name ?? "",
    slug: a.authorProfile?.slug,
    affiliation: a.authorProfile?.affiliation ?? a.affiliation,
    orcid: a.authorProfile?.orcid ?? a.orcid,
  }));
  const pages = article.pageStart
    ? `${article.pageStart}–${article.pageEnd ?? article.pageStart}`
    : null;
  const url = absoluteUrl(`/maqola/${article.slug}`, locale);
  const pdfUrl = absoluteUrl(`/maqola/${article.slug}/pdf`, locale);
  const issn = String(settings["journal.issn"]);
  const year = (article.publishedAt ?? new Date()).getFullYear();
  const startYear = Number(settings["journal.startYear"]) || year;

  const citation = {
    title: article.titleUz,
    authors: authors.map((a) => a.name),
    year,
    journal: siteConfig.name,
    volume: article.issue ? article.issue.year - startYear + 1 : null,
    issue: article.issue?.number ?? null,
    pages,
    doi: article.doi,
    url,
  };
  const firstAuthor = authors[0];
  const citeKey = `${slugify(firstAuthor?.name.split(" ").at(-1) ?? "article")}${year}`;

  const abstractTabs = [
    { key: "uz", label: t("article.abstractUz"), text: article.abstractUz, lang: "uz" },
    article.abstractEn
      ? { key: "en", label: t("article.abstractEn"), text: article.abstractEn, lang: "en" }
      : null,
    article.abstractRu
      ? { key: "ru", label: t("article.abstractRu"), text: article.abstractRu, lang: "ru" }
      : null,
  ].filter((x) => x !== null);

  return (
    <PageShell footer="compact" narrow>
      <ViewBeacon articleId={article.id} />
      <ScholarMeta
        title={article.titleUz}
        authors={authors.map((a) => ({ name: a.name, institution: a.affiliation }))}
        publicationDate={article.publishedAt}
        journalTitle={siteConfig.name}
        volume={citation.volume}
        issue={citation.issue}
        firstPage={article.pageStart}
        lastPage={article.pageEnd}
        pdfUrl={pdfUrl}
        abstractUrl={url}
        language={article.language}
        keywords={article.keywords}
        doi={article.doi}
        issn={issn}
      />
      <JsonLd
        data={scholarlyArticle({
          url,
          title,
          abstract: articleAbstract(article, locale),
          keywords: article.keywords,
          language: article.language,
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
          authors: authors.map((a) => ({
            name: a.name,
            url: a.slug ? absoluteUrl(`/muallif/${a.slug}`, locale) : undefined,
            affiliation: a.affiliation,
            orcid: a.orcid,
          })),
          pdfUrl,
          pageStart: article.pageStart,
          pageEnd: article.pageEnd,
          doi: article.doi,
          issue: article.issue
            ? {
                number: article.issue.number,
                year: article.issue.year,
                url: absoluteUrl(`/son/${article.issue.year}-${article.issue.number}`, locale),
              }
            : null,
          journal: { name: siteConfig.name, url: absoluteUrl("/", locale), issn },
        })}
      />
      <JsonLd
        data={breadcrumbList([
          { name: t("nav.home"), url: absoluteUrl("/", locale) },
          {
            name: pick(article.category.name, locale),
            url: absoluteUrl(`/yonalish/${article.category.slug}`, locale),
          },
          { name: title, url },
        ])}
      />
      <div className="container-site pt-6 pb-16 lg:max-w-[1248px]">
        <nav aria-label={t("nav.breadcrumbs")} className="text-sm">
          <ol className="flex flex-wrap items-center gap-2 text-blue-800">
            <li>
              <Link href="/" className="hover:underline">
                {t("nav.home")}
              </Link>
            </li>
            <li aria-hidden className="text-muted">
              /
            </li>
            <li>
              <Link href={`/yonalish/${article.category.slug}`} className="hover:underline">
                {pick(article.category.name, locale)}
              </Link>
            </li>
            {article.issue ? (
              <>
                <li aria-hidden className="text-muted">
                  /
                </li>
                <li className="text-text-2">
                  <Link
                    href={`/son/${article.issue.year}-${article.issue.number}`}
                    className="hover:underline"
                  >
                    {t("lists.issueTitle", {
                      year: article.issue.year,
                      number: article.issue.number,
                    })}
                  </Link>
                </li>
              </>
            ) : null}
          </ol>
        </nav>

        <div className="mt-5 grid gap-12 lg:grid-cols-[1fr_300px]">
          <article className="min-w-0">
            <p className="text-[13px] text-text-2">
              <Link
                href={`/yonalish/${article.category.slug}`}
                className="font-semibold tracking-[0.06em] text-gold-text uppercase hover:underline"
              >
                {pick(article.category.name, locale)}
              </Link>{" "}
              · {t(`article.types.${article.type}`)} · {t("common.openAccess")}
            </p>

            <h1 className="mt-3 font-serif text-[30px] leading-[1.2] font-bold text-ink md:text-[40px]">
              {title}
            </h1>

            <p className="mt-6 text-base font-semibold text-blue-800">
              {authors.map((a, i) => (
                <span key={`${a.name}-${i}`}>
                  {i > 0 ? ", " : null}
                  {a.slug ? (
                    <Link href={`/muallif/${a.slug}`} className="hover:underline">
                      {a.name}
                    </Link>
                  ) : (
                    a.name
                  )}
                  <sup className="font-normal">{i + 1}</sup>
                </span>
              ))}
            </p>
            <ul className="mt-2 space-y-0.5 text-[13px] text-text-2">
              {authors.map((a, i) => (
                <li key={`${a.name}-aff-${i}`}>
                  <sup>{i + 1}</sup> {a.affiliation ?? "—"}
                  {a.orcid ? ` · ORCID: ${a.orcid}` : null}
                </li>
              ))}
            </ul>

            <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-1 border-y border-border py-3 text-sm">
              <div className="flex gap-1">
                <dt className="font-semibold text-ink">{t("article.received")}</dt>
                <dd className="text-text-2">{formatDate(article.submittedAt, locale)}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-semibold text-ink">{t("article.published")}</dt>
                <dd className="text-text-2">{formatDate(article.publishedAt, locale)}</dd>
              </div>
              {article.issue ? (
                <div className="flex gap-1">
                  <dt className="font-semibold text-ink">{t("article.issue")}</dt>
                  <dd className="text-text-2">
                    {pages
                      ? t("article.issueValue", {
                          year: article.issue.year,
                          number: article.issue.number,
                          pages,
                        })
                      : t("article.issueShort", {
                          year: article.issue.year,
                          number: article.issue.number,
                        })}
                  </dd>
                </div>
              ) : null}
              <div className="flex gap-1">
                <dt className="font-semibold text-ink">{t("article.doi")}</dt>
                <dd className="text-text-2">
                  {article.doi ? (
                    <a
                      href={`https://doi.org/${article.doi}`}
                      className="text-blue-800 hover:underline"
                    >
                      {article.doi}
                    </a>
                  ) : (
                    t("article.doiPending")
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link href={`/maqola/${article.slug}/pdf`} className={buttonClass("primary", "md")}>
                <Download className="size-4" aria-hidden /> {t("article.downloadPdf")}
              </Link>
              <a href="#iqtibos" className={buttonClass("outline", "md")}>
                {t("article.cite")}
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass("secondary", "md")}
              >
                {t("article.shareTelegram")}
              </a>
              <CopyLinkButton
                url={url}
                label={t("article.copyLink")}
                copiedLabel={t("article.linkCopied")}
              />
            </div>

            <section
              className="mt-9 rounded-card bg-blue-50 p-5 md:p-7"
              aria-label={t("article.abstractUz")}
            >
              <AbstractTabs
                tabs={abstractTabs}
                initial={abstractTabs.some((x) => x.key === locale) ? locale : "uz"}
              />
              <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-ink">{t("article.keywords")}</span>
                {article.keywords.map((k) => (
                  <Link
                    key={k}
                    href={`/kalit-soz/${slugify(k)}`}
                    className={chipClass(false, "bg-white text-sm")}
                  >
                    {k}
                  </Link>
                ))}
              </div>
            </section>

            <div className="article-body mt-4" dangerouslySetInnerHTML={{ __html: html }} />

            {article.references.length ? (
              <section id="adabiyotlar" className="mt-12 scroll-mt-6 border-t border-border pt-10">
                <h2 className="font-serif text-2xl font-bold text-ink">
                  {t("article.references")}
                </h2>
                <ol className="mt-4 list-decimal space-y-1.5 pl-6 text-[15px] text-text-2">
                  {article.references.map((r) => (
                    <li key={r.id}>
                      {r.raw}
                      {r.doi ? (
                        <>
                          {" "}
                          <a
                            href={`https://doi.org/${r.doi}`}
                            className="text-blue-800 hover:underline"
                          >
                            doi:{r.doi}
                          </a>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            <div className="mt-8">
              <CitationBox
                formats={{
                  apa: formatApa(citation),
                  gost: formatGost(citation),
                  bibtex: formatBibtex(citation, citeKey),
                }}
                labels={{
                  title: t("article.citeTitle"),
                  copy: t("article.copy"),
                  copied: t("article.copied"),
                }}
              />
            </div>
          </article>

          <aside className="space-y-5 lg:pt-1">
            {toc.length ? (
              <nav className={cn(cardClass, "p-5")} aria-label={t("article.toc")}>
                <h2 className={SIDEBAR_LABEL}>{t("article.toc")}</h2>
                <ul className="mt-3 space-y-2 text-[15px] text-blue-800">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className="hover:underline">
                        {item.text}
                      </a>
                    </li>
                  ))}
                  {article.references.length ? (
                    <li>
                      <a href="#adabiyotlar" className="hover:underline">
                        {t("article.referencesShort")}
                      </a>
                    </li>
                  ) : null}
                </ul>
              </nav>
            ) : null}

            <div className={cn(cardClass, "grid grid-cols-2 gap-4 p-5")}>
              <div>
                <p className="font-serif text-[26px] leading-none font-bold text-ink">
                  {formatNumber(article.views, locale)}
                </p>
                <p className="mt-1.5 text-[13px] text-text-2">{t("article.views")}</p>
              </div>
              <div>
                <p className="font-serif text-[26px] leading-none font-bold text-ink">
                  {formatNumber(article.downloads, locale)}
                </p>
                <p className="mt-1.5 text-[13px] text-text-2">{t("article.downloads")}</p>
              </div>
            </div>

            {firstAuthor ? (
              <div className={cn(cardClass, "p-5")}>
                <h2 className={SIDEBAR_LABEL}>{t("article.author")}</h2>
                <div className="mt-3 flex items-center gap-3">
                  <span
                    aria-hidden
                    className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-800"
                  >
                    {initials(firstAuthor.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-blue-800">{firstAuthor.name}</span>
                    <span className="block text-[13px] text-text-2">{firstAuthor.affiliation}</span>
                  </span>
                </div>
                {firstAuthor.slug ? (
                  <Link
                    href={`/muallif/${firstAuthor.slug}`}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-800 hover:underline"
                  >
                    {t("article.allByAuthor")} <ArrowRight className="size-4" aria-hidden />
                  </Link>
                ) : null}
              </div>
            ) : null}

            {related.length ? (
              <div className={cn(cardClass, "p-5")}>
                <h2 className={SIDEBAR_LABEL}>{t("article.related")}</h2>
                <ul className="mt-3 space-y-3 font-serif text-base leading-snug text-ink">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link href={`/maqola/${r.slug}`} className="hover:text-blue-800">
                        {articleTitle(r, locale)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
