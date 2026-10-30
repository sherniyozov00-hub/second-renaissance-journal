import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArticleList, ListHeader, parsePage } from "@/components/article/article-list";
import { SearchForm } from "@/components/home/hero";
import { PageShell } from "@/components/layout/page-shell";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { listArticles, simpleSearchWhere } from "@/lib/queries/articles";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "lists" });
  return { title: t("articlesTitle"), description: t("articlesLead") };
}

// Basic listing and substring search; full-text search and filters (Ekran 5)
// replace this in stage 2.
export default async function ArticlesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q = "", page: rawPage } = await searchParams;
  const page = parsePage(rawPage);
  const t = await getTranslations();
  const { items, pages } = await listArticles(simpleSearchWhere(q), page);

  return (
    <PageShell>
      <ListHeader
        title={q ? t("lists.searchResults", { q }) : t("lists.articlesTitle")}
        lead={q ? undefined : t("lists.articlesLead")}
      >
        <div className="mt-6 max-w-[760px]">
          <SearchForm
            action={getPathname({ href: "/maqolalar", locale: locale as AppLocale })}
            placeholder={t("common.searchPlaceholder")}
            placeholderShort={t("common.searchPlaceholderShort")}
            submitLabel={t("common.search")}
            defaultValue={q}
            showButtonOnMobile
          />
        </div>
      </ListHeader>
      <div className="container-site py-8 md:py-12 lg:max-w-[1000px]">
        <ArticleList
          items={items}
          page={page}
          pages={pages}
          basePath="/maqolalar"
          query={q ? { q } : {}}
        />
      </div>
    </PageShell>
  );
}
