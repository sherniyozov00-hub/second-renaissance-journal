import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import type { AppLocale } from "@/i18n/routing";
import { panel, td, th } from "@/components/admin/ui";
import { requireReviewer } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { articleTitle, formatDate, pick } from "@/lib/l10n";
import { cn } from "@/lib/utils";

export default async function ReviewerHome({
  searchParams,
}: {
  searchParams: Promise<{ yuborildi?: string }>;
}) {
  const user = await requireReviewer();
  const { yuborildi } = await searchParams;
  const reviews = await db.review.findMany({
    where: { reviewerId: user.id },
    orderBy: [{ submittedAt: { sort: "asc", nulls: "first" } }, { dueAt: "asc" }],
    include: {
      article: {
        select: {
          number: true,
          titleUz: true,
          titleRu: true,
          titleEn: true,
          category: { select: { name: true } },
        },
      },
    },
  });
  const now = new Date();
  const [t, locale] = await Promise.all([
    getTranslations("admin.review"),
    getLocale() as Promise<AppLocale>,
  ]);
  return (
    <>
      <h1 className="font-sans text-[28px] font-bold text-ink">{t("mine")}</h1>
      <p className="mt-1 text-sm text-text-2">{t("blind")}</p>
      {yuborildi ? (
        <p className="mt-4 rounded-control bg-success-bg px-4 py-3 text-sm font-semibold text-success">
          {t("sent")}
        </p>
      ) : null}
      <section className={cn(panel, "mt-5 overflow-x-auto")}>
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-border bg-blue-50/40">
            <tr>
              {[t("colArticle"), t("colCategory"), t("colDue"), t("colStatus"), ""].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className={cn(td, "font-semibold")}>
                  #{String(r.article.number).padStart(4, "0")} {articleTitle(r.article, locale)}
                </td>
                <td className={td}>{pick(r.article.category.name, locale)}</td>
                <td
                  className={cn(
                    td,
                    !r.submittedAt && r.dueAt && r.dueAt < now && "font-semibold text-danger",
                  )}
                >
                  {formatDate(r.dueAt, locale)}
                </td>
                <td className={td}>{r.submittedAt ? t("submitted") : t("pending")}</td>
                <td className={td}>
                  <Link
                    href={`/taqriz/${r.id}`}
                    className="font-semibold text-blue-800 hover:underline"
                  >
                    {r.submittedAt ? t("view") : t("write")}
                  </Link>
                </td>
              </tr>
            ))}
            {!reviews.length ? (
              <tr>
                <td colSpan={5} className={cn(td, "py-8 text-center text-text-2")}>
                  {t("none")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
