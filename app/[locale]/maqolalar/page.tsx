import { Search, X } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { AutoSubmit, FilterPanel, SearchAutocomplete } from "@/components/search/client";
import { SEARCH_FORM_ID, SearchFiltersForm } from "@/components/search/filters";
import { SearchResultItem } from "@/components/search/result-item";
import { buttonClass } from "@/components/ui/styles";
import { getPathname, Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { initials, pick } from "@/lib/l10n";
import { getCategories, getPublishedIssues } from "@/lib/queries/catalog";
import {
  filtersToQuery,
  parseFilters,
  SCOPES,
  searchArticles,
  searchAuthors,
  type SearchFilters,
} from "@/lib/search/query";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const BASE = "/maqolalar";

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const f = parseFilters(await searchParams);
  const t = await getTranslations({ locale, namespace: "lists" });
  // Filtered result pages are not indexed; the canonical list is.
  return pageMetadata({
    locale: locale as AppLocale,
    path: BASE,
    title: f.q ? t("searchResults", { q: f.q }) : t("articlesTitle"),
    description: t("articlesLead"),
    noindex: Object.keys(filtersToQuery(f)).length > 0,
  });
}

function withChange(f: SearchFilters, change: Partial<SearchFilters>) {
  return { pathname: BASE, query: filtersToQuery({ ...f, page: 1, ...change }) };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as AppLocale;
  const f = parseFilters(await searchParams);
  const t = await getTranslations();

  const [articles, authors, categories, issues] = await Promise.all([
    searchArticles(f),
    searchAuthors(f),
    getCategories(),
    getPublishedIssues(),
  ]);

  const years = [...new Set(issues.map((i) => i.year))];
  const thisYear = new Date().getFullYear();
  if (!years.includes(thisYear)) years.unshift(thisYear);
  years.sort((a, b) => b - a);

  // Active filter chips with a remove link (Ekran 5).
  const chips: { label: string; href: ReturnType<typeof withChange> }[] = [
    ...f.categories.map((slug) => ({
      label: pick(categories.find((c) => c.slug === slug)?.name, locale) || slug,
      href: withChange(f, { categories: f.categories.filter((c) => c !== slug) }),
    })),
    ...f.types.map((type) => ({
      label: t(`article.types.${type}`),
      href: withChange(f, { types: f.types.filter((x) => x !== type) }),
    })),
    ...f.languages.map((l) => ({
      label: t(`search.languages.${l}`),
      href: withChange(f, { languages: f.languages.filter((x) => x !== l) }),
    })),
    ...(f.yearFrom || f.yearTo
      ? [
          {
            label: `${f.yearFrom ?? "…"}–${f.yearTo ?? "…"}`,
            href: withChange(f, { yearFrom: null, yearTo: null }),
          },
        ]
      : []),
    ...(f.issue ? [{ label: f.issue, href: withChange(f, { issue: null }) }] : []),
    ...(f.institution ? [{ label: f.institution, href: withChange(f, { institution: "" }) }] : []),
  ];

  const pages = f.tab === "articles" ? articles.pages : 1;

  return (
    <PageShell narrow>
      <AutoSubmit formId={SEARCH_FORM_ID} />

      <section className="border-b border-border bg-blue-50">
        <div className="container-site py-6 md:py-8 lg:max-w-[1248px]">
          <h1 className="sr-only">
            {f.q ? t("lists.searchResults", { q: f.q }) : t("search.title")}
          </h1>
          <Form
            id={SEARCH_FORM_ID}
            action={getPathname({ href: BASE, locale })}
            role="search"
            className="flex flex-wrap items-center gap-2 rounded-card border border-border-strong bg-white p-2 pl-4 md:flex-nowrap md:pl-5"
          >
            <Search className="size-[18px] shrink-0 text-muted" strokeWidth={2} aria-hidden />
            <SearchAutocomplete
              defaultValue={f.q}
              placeholder={t("common.searchPlaceholderShort")}
              formId={SEARCH_FORM_ID}
            />
            <select
              name="joy"
              defaultValue={f.scope}
              aria-label={t("search.scope.all")}
              className="hidden h-12 w-[200px] shrink-0 rounded-control border border-border-strong bg-blue-50/60 px-3 text-[15px] text-ink md:block"
            >
              {SCOPES.map((s) => (
                <option key={s} value={s}>
                  {t(`search.scope.${s}`)}
                </option>
              ))}
            </select>
            {f.tab === "authors" ? <input type="hidden" name="tab" value="mualliflar" /> : null}
            <button type="submit" className={buttonClass("primary", "lg", "w-full md:w-auto")}>
              {t("common.search")}
            </button>
          </Form>

          <p className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[15px] text-text-2">
            <span>
              {f.q
                ? t.rich("search.summary", {
                    q: f.q,
                    articles: articles.total,
                    authors: authors.total,
                    b: (chunks) => <strong className="font-semibold text-ink">{chunks}</strong>,
                  })
                : t("search.summaryNoQuery", { articles: articles.total })}
            </span>
            {articles.related.length ? (
              <span>
                {t("search.also")}{" "}
                {articles.related.map((k, i) => (
                  <span key={k}>
                    {i > 0 ? ", " : null}
                    <Link
                      href={{ pathname: BASE, query: { q: k } }}
                      className="text-blue-800 hover:underline"
                    >
                      {k}
                    </Link>
                  </span>
                ))}
              </span>
            ) : null}
          </p>
        </div>
      </section>

      <div className="container-site grid gap-8 py-8 md:grid-cols-[240px_1fr] md:gap-10 lg:max-w-[1248px] lg:grid-cols-[260px_1fr]">
        <aside>
          <FilterPanel activeCount={chips.length}>
            <SearchFiltersForm
              filters={f}
              categories={categories}
              categoryCounts={articles.categoryCounts}
              issues={issues}
              years={years}
              basePath={BASE}
            />
          </FilterPanel>
        </aside>

        <section className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
            <nav className="flex gap-1" aria-label={t("search.title")}>
              {(["articles", "authors"] as const).map((tab) => {
                const active = f.tab === tab;
                const count = tab === "articles" ? articles.total : authors.total;
                return (
                  <Link
                    key={tab}
                    href={withChange(f, { tab })}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "-mb-px border-b-2 px-3.5 pt-2 pb-3 text-base",
                      active
                        ? "border-blue-800 font-semibold text-blue-800"
                        : "border-transparent text-text-2",
                    )}
                  >
                    {t(tab === "articles" ? "search.tabArticles" : "search.tabAuthors")}{" "}
                    <span className={active ? "font-normal" : ""}>{count}</span>
                  </Link>
                );
              })}
            </nav>
            {f.tab === "articles" ? (
              <label className="mb-2 flex items-center gap-2 text-sm text-text-2">
                {t("search.sort")}
                <select
                  name="saralash"
                  form={SEARCH_FORM_ID}
                  defaultValue={f.sort}
                  data-autosubmit
                  className="h-10 rounded-control border border-border-strong bg-blue-50/60 px-3 text-sm text-ink"
                >
                  <option value="relevance">{t("search.sortRelevance")}</option>
                  <option value="newest">{t("search.sortNewest")}</option>
                  <option value="popular">{t("search.sortPopular")}</option>
                </select>
              </label>
            ) : null}
          </div>

          {chips.length ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {chips.map((c) => (
                <li key={c.label}>
                  <Link
                    href={c.href}
                    aria-label={t("search.remove", { label: c.label })}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full bg-info-bg/70 px-3.5 text-sm text-ink hover:bg-info-bg"
                  >
                    {c.label} <X className="size-3.5 text-blue-800" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {f.tab === "articles" ? (
            articles.items.length ? (
              <div className="mt-2">
                {articles.items.map((a) => (
                  <SearchResultItem key={a.id} article={a} q={f.q} />
                ))}
              </div>
            ) : (
              <p className="mt-8 text-text-2">{t("search.noResults")}</p>
            )
          ) : authors.items.length ? (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {authors.items.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/muallif/${a.slug}`}
                    className="flex items-center gap-3 rounded-card border border-border p-4 hover:border-blue-800"
                  >
                    <span
                      aria-hidden
                      className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-800"
                    >
                      {initials(a.fullName)}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-blue-800">{a.fullName}</span>
                      <span className="block text-[13px] text-text-2">
                        {[a.affiliation, a.position].filter(Boolean).join(" · ")}
                      </span>
                      <span className="block text-[13px] text-muted">
                        {t("lists.articleCount", { count: a.articles })}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 text-text-2">{t("search.noAuthors")}</p>
          )}

          {pages > 1 ? (
            <nav
              aria-label={t("common.pageOf", { page: f.page, total: pages })}
              className="mt-8 flex flex-wrap gap-2"
            >
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={{ pathname: BASE, query: filtersToQuery({ ...f, page: p }) }}
                  aria-current={p === f.page ? "page" : undefined}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-control border text-[15px]",
                    p === f.page
                      ? "border-blue-800 bg-blue-800 font-semibold text-white"
                      : "border-border-strong text-blue-800",
                  )}
                >
                  {p}
                </Link>
              ))}
              {f.page < pages ? (
                <Link
                  href={{ pathname: BASE, query: filtersToQuery({ ...f, page: f.page + 1 }) }}
                  className="flex h-11 items-center rounded-control border border-border-strong px-4 text-[15px] text-blue-800"
                >
                  {t("common.next")} →
                </Link>
              ) : null}
            </nav>
          ) : null}
        </section>
      </div>
    </PageShell>
  );
}
