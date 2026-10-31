import { Search } from "lucide-react";
import Link from "next/link";
import {
  PageTitle,
  PaymentText,
  StatCard,
  StatusBadge,
  STATUSES,
  panel,
  select,
  td,
  th,
} from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/styles";
import { requireEditor } from "@/lib/admin/auth";
import {
  ADMIN_PAGE_SIZE,
  articleStats,
  listAdminArticles,
  parseAdminFilters,
} from "@/lib/admin/articles";
import { db } from "@/lib/db";
import { articleTitle, formatDate, formatNumber, pick } from "@/lib/l10n";
import { cn } from "@/lib/utils";
import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata() {
  return { title: (await getTranslations("admin.articles"))("title") };
}

function shortName(full: string) {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]![0]}. ${parts.slice(1).join(" ")}` : full;
}

/** Ekran 8: articles table, statuses, filters. */
export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireEditor("/admin/maqolalar");
  const sp = await searchParams;
  const f = parseAdminFilters(sp);
  const [stats, { items, total }, categories, issues] = await Promise.all([
    articleStats(),
    listAdminArticles(f),
    db.category.findMany({ orderBy: { order: "asc" } }),
    db.issue.findMany({ orderBy: [{ year: "desc" }, { number: "desc" }] }),
  ]);
  const [t, tc, locale] = await Promise.all([
    getTranslations("admin.articles"),
    getTranslations("admin.common"),
    getLocale() as Promise<AppLocale>,
  ]);
  const from = total ? (f.page - 1) * ADMIN_PAGE_SIZE + 1 : 0;
  const to = Math.min(total, f.page * ADMIN_PAGE_SIZE);
  const qs = (page: number) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    p.set("page", String(page));
    return `/admin/maqolalar?${p}`;
  };

  return (
    <>
      <PageTitle title={t("title")}>
        <a
          href={`/admin/eksport?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])}`}
          className={buttonClass("secondary", "md", "text-ink")}
        >
          {t("export")}
        </a>
        <Link href="/kabinet/yuborish" className={buttonClass("primary", "md")}>
          {t("addArticle")}
        </Link>
      </PageTitle>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label={t("fresh")} value={stats.fresh} />
        <StatCard label={t("awaiting")} value={stats.awaiting} />
        <StatCard label={t("review")} value={stats.review} />
        <StatCard label={t("ready")} value={stats.accepted} />
        <StatCard
          label={t("revenue")}
          value={`${formatNumber(stats.revenue, locale)} ${tc("som")}`}
        />
      </div>

      <section className={cn(panel, "mt-6 overflow-hidden")}>
        <form className="flex flex-wrap gap-3 border-b border-border p-4" role="search">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">{t("search")}</span>
            <Search
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              name="q"
              defaultValue={f.q}
              placeholder={t("searchPlaceholder")}
              className="h-11 w-full rounded-control border border-border-strong pr-3 pl-9 text-[15px] outline-none focus:border-blue-800"
            />
          </label>
          <select name="holat" defaultValue={f.status} aria-label={t("status")} className={select}>
            <option value="">{t("allStatuses")}</option>
            {STATUSES.filter((k) => k !== "DRAFT").map((k) => (
              <option key={k} value={k}>
                {tc(`status_${k}`)}
              </option>
            ))}
          </select>
          <select
            name="yonalish"
            defaultValue={f.category}
            aria-label={t("category")}
            className={select}
          >
            <option value="">{t("allCategories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {pick(c.name, locale)}
              </option>
            ))}
          </select>
          <select name="son" defaultValue={f.issue} aria-label={t("issue")} className={select}>
            <option value="">{t("allIssues")}</option>
            {issues.map((i) => (
              <option key={i.id} value={i.id}>
                {t("issueLabel", { year: i.year, number: i.number })}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonClass("primary", "md")}>
            {t("filter")}
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-border bg-blue-50/40">
              <tr>
                {["ID", t("colTitle"), t("colAuthor"), t("category"), t("colPayment"), t("status"), t("colDate"), ""].map(
                  (h) => (
                    <th key={h} scope="col" className={th}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const author = a.authors[0]?.authorProfile?.fullName ?? a.authors[0]?.name ?? "—";
                return (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className={cn(td, "text-text-2")}>#{String(a.number).padStart(4, "0")}</td>
                    <td className={cn(td, "max-w-[320px] font-semibold text-ink")}>{articleTitle(a, locale)}</td>
                    <td className={td}>{shortName(author)}</td>
                    <td className={td}>{pick(a.category.name, locale)}</td>
                    <td className={td}>
                      <PaymentText status={a.payments[0]?.status ?? null} />
                    </td>
                    <td className={td}>
                      <StatusBadge status={a.status} />
                    </td>
                    <td className={cn(td, "whitespace-nowrap text-text-2")}>
                      {formatDate(a.submittedAt ?? a.updatedAt, locale)}
                    </td>
                    <td className={td}>
                      <Link
                        href={`/admin/maqolalar/${a.id}`}
                        className="font-semibold text-blue-800 hover:underline"
                      >
                        {tc("open")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!items.length ? (
                <tr>
                  <td colSpan={8} className={cn(td, "py-8 text-center text-text-2")}>
                    {t("notFound")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-text-2">
          <span>
            {from}–{to} / {total}
          </span>
          <span className="flex gap-4">
            {f.page > 1 ? (
              <Link href={qs(f.page - 1)} className="text-blue-800 hover:underline">
                {t("prev")}
              </Link>
            ) : null}
            {to < total ? (
              <Link href={qs(f.page + 1)} className="text-blue-800 hover:underline">
                {t("next")}
              </Link>
            ) : null}
          </span>
        </div>
      </section>
    </>
  );
}
