import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { pick } from "@/lib/l10n";
import type { ArticleCard } from "@/lib/queries/articles";
import { cn } from "@/lib/utils";

/** "AGROTEXNOLOGIYALAR · Tadqiqot maqolasi" eyebrow above article titles. */
export async function ArticleEyebrow({
  article,
  withType = false,
  withIssue = false,
  className,
}: {
  article: Pick<ArticleCard, "category" | "type" | "issue">;
  withType?: boolean;
  withIssue?: boolean;
  className?: string;
}) {
  const t = await getTranslations("article");
  const locale = (await getLocale()) as AppLocale;
  return (
    <p className={cn("text-eyebrow font-semibold tracking-[0.06em] text-gold-text", className)}>
      <Link href={`/yonalish/${article.category.slug}`} className="uppercase hover:underline">
        {pick(article.category.name, locale)}
      </Link>
      {withType ? <span> · {t(`types.${article.type}`)}</span> : null}
      {withIssue && article.issue ? (
        <span>
          {" "}
          · {t("issueShort", { year: article.issue.year, number: article.issue.number })}
        </span>
      ) : null}
    </p>
  );
}

/** Display names of an article's authors, in order. */
export function authorNames(article: Pick<ArticleCard, "authors">): string[] {
  return article.authors.map((a) => a.authorProfile?.fullName ?? a.name ?? "").filter(Boolean);
}

/** Linked author names: "Aziza Karimova, Bekzod Rahimov". */
export function AuthorLinks({
  article,
  className,
}: {
  article: Pick<ArticleCard, "authors">;
  className?: string;
}) {
  return (
    <span className={className}>
      {article.authors.map((a, i) => {
        const name = a.authorProfile?.fullName ?? a.name ?? "";
        return (
          <span key={`${name}-${i}`}>
            {i > 0 ? ", " : null}
            {a.authorProfile ? (
              <Link href={`/muallif/${a.authorProfile.slug}`} className="hover:underline">
                {name}
              </Link>
            ) : (
              name
            )}
          </span>
        );
      })}
    </span>
  );
}
