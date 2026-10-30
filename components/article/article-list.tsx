import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ArticleCard } from "@/lib/queries/articles";
import { cn } from "@/lib/utils";
import { ArticleListItem } from "./article-list-item";

/** Page heading band used by list pages (category, keyword, issue, author...). */
export function ListHeader({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border bg-blue-50">
      <div className="container-site py-8 md:py-12">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="text-[28px] leading-tight md:text-section">{title}</h1>
        {lead ? <p className="mt-2 max-w-[680px] text-text-2">{lead}</p> : null}
        {children}
      </div>
    </div>
  );
}

export async function ArticleList({
  items,
  page,
  pages,
  basePath,
  query = {},
}: {
  items: ArticleCard[];
  page: number;
  pages: number;
  basePath: string;
  query?: Record<string, string>;
}) {
  const t = await getTranslations("common");
  if (!items.length) return <p className="py-6 text-text-2">{t("empty")}</p>;

  return (
    <div>
      <div>
        {items.map((a) => (
          <ArticleListItem key={a.id} article={a} />
        ))}
      </div>
      {pages > 1 ? (
        <nav
          aria-label={t("pageOf", { page, total: pages })}
          className="mt-8 flex flex-wrap items-center gap-2"
        >
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={{
                pathname: basePath,
                query: { ...query, ...(p > 1 ? { page: String(p) } : {}) },
              }}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "flex size-10 items-center justify-center rounded-control border text-sm",
                p === page
                  ? "border-blue-800 bg-blue-800 font-semibold text-white"
                  : "border-border-strong text-ink",
              )}
            >
              {p}
            </Link>
          ))}
          {page < pages ? (
            <Link
              href={{ pathname: basePath, query: { ...query, page: String(page + 1) } }}
              className="flex h-10 items-center rounded-control border border-border-strong px-4 text-sm text-ink"
            >
              {t("next")} →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

export function parsePage(raw: string | undefined) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
