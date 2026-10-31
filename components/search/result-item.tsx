import { getLocale, getTranslations } from "next-intl/server";
import { ArticleEyebrow, AuthorLinks } from "@/components/article/article-meta";
import { getPathname, Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { articleAbstract, articleTitle, formatNumber } from "@/lib/l10n";
import type { ArticleCard } from "@/lib/queries/articles";
import { hasMatch, highlightSnippet, highlightText, type Segment } from "@/lib/search/normalize";

export function Highlighted({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((s, i) =>
        s.hit ? (
          <mark key={i} className="rounded-[3px] bg-warning-bg px-0.5 text-inherit">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

/** Search result (Ekran 5): the matched word is highlighted in title and snippet. */
export async function SearchResultItem({ article, q }: { article: ArticleCard; q: string }) {
  const t = await getTranslations();
  const locale = (await getLocale()) as AppLocale;
  const title = articleTitle(article, locale);
  const abstract = articleAbstract(article, locale);
  const affiliation =
    article.authors[0]?.authorProfile?.affiliation ?? article.authors[0]?.affiliation ?? null;

  // Prefer the abstract; fall back to keywords when only they match (as in Ekran 5).
  const keywordsText = article.keywords.join(", ");
  const snippet =
    q && !hasMatch(abstract, q) && hasMatch(keywordsText, q) ? (
      <>
        {t("search.keywordsPrefix")} <Highlighted segments={highlightText(keywordsText, q)} />
      </>
    ) : (
      <Highlighted segments={highlightSnippet(abstract, q, 200)} />
    );

  return (
    <article className="border-b border-border py-6">
      <ArticleEyebrow article={article} withType withIssue />
      <h3 className="mt-1.5 font-serif text-xl leading-snug font-bold text-blue-900 md:text-[22px]">
        <Link href={`/maqola/${article.slug}`} className="hover:text-blue-800">
          <Highlighted segments={highlightText(title, q)} />
        </Link>
      </h3>
      <p className="mt-1.5 text-[15px]">
        <AuthorLinks article={article} className="text-blue-800" />
        {affiliation ? <span className="text-text-2"> · {affiliation}</span> : null}
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-text-2">{snippet}</p>
      <p className="mt-2 flex flex-wrap gap-x-4 text-sm">
        <a
          href={getPathname({ href: `/maqola/${article.slug}/pdf`, locale })}
          className="font-semibold text-blue-800 hover:underline"
        >
          PDF
        </a>
        <Link href={`/maqola/${article.slug}#iqtibos`} className="text-blue-800 hover:underline">
          {t("article.cites")}
        </Link>
        <span className="text-text-2">
          {t("article.viewsCount", { count: formatNumber(article.views, locale) })}
        </span>
      </p>
    </article>
  );
}
