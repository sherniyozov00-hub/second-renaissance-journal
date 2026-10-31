import { getLocale, getTranslations } from "next-intl/server";
import { getPathname, Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { articleAbstract, articleTitle, formatNumber } from "@/lib/l10n";
import type { ArticleCard } from "@/lib/queries/articles";
import { ArticleEyebrow, AuthorLinks } from "./article-meta";

function truncate(text: string, max = 220) {
  return text.length <= max ? text : `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

/** Search/list result row (Ekran 5): eyebrow, title, authors, snippet, actions. */
export async function ArticleListItem({ article }: { article: ArticleCard }) {
  const t = await getTranslations("article");
  const locale = (await getLocale()) as AppLocale;
  const affiliation =
    article.authors[0]?.authorProfile?.affiliation ?? article.authors[0]?.affiliation ?? null;

  return (
    <article className="border-b border-border py-6 first:pt-0">
      <ArticleEyebrow article={article} withType withIssue />
      <h2 className="mt-1.5 font-serif text-xl leading-snug font-bold text-blue-900 md:text-[22px]">
        <Link href={`/maqola/${article.slug}`} className="hover:text-blue-800">
          {articleTitle(article, locale)}
        </Link>
      </h2>
      <p className="mt-1.5 text-sm">
        <AuthorLinks article={article} className="font-semibold text-blue-800" />
        {affiliation ? <span className="text-muted"> · {affiliation}</span> : null}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-text-2">
        {truncate(articleAbstract(article, locale))}
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 text-[13px]">
        <a
          href={getPathname({ href: `/maqola/${article.slug}/pdf`, locale })}
          className="font-semibold text-blue-800 hover:underline"
        >
          PDF
        </a>
        <Link href={`/maqola/${article.slug}#iqtibos`} className="text-blue-800 hover:underline">
          {t("cites")}
        </Link>
        <span className="text-muted">
          {t("viewsCount", { count: formatNumber(article.views, locale) })}
        </span>
      </p>
    </article>
  );
}
