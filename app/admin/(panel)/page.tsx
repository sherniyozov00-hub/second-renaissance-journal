import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PageTitle, StatCard, STATUSES, panel } from "@/components/admin/ui";
import type { AppLocale } from "@/i18n/routing";
import { requireEditor } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/l10n";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  return { title: (await getTranslations("admin.dashboard"))("title") };
}

/** TZ 13: articles by status, monthly revenue, new users, AI cost, most read. */
export default async function AdminDashboard() {
  await requireEditor("/admin");
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const now = new Date();
  const [todoPayments, todoNoReviewer, todoOverdue, todoRevised] = await Promise.all([
    db.payment.count({ where: { provider: "CLICK_QR", status: "PENDING" } }),
    db.article.count({ where: { status: "UNDER_REVIEW", reviews: { none: {} } } }),
    db.review.count({ where: { submittedAt: null, dueAt: { lt: now } } }),
    db.article.count({
      where: {
        status: "UNDER_REVIEW",
        reviews: { some: {}, every: { submittedAt: { not: null } } },
      },
    }),
  ]);
  const [byStatus, revenue, users, ai, top] = await Promise.all([
    db.article.groupBy({ by: ["status"], _count: true }),
    db.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    db.user.count({ where: { createdAt: { gte: monthStart } } }),
    db.aiCheck.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { cost: true },
      _count: true,
    }),
    db.article.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { views: "desc" },
      take: 5,
      select: { id: true, titleUz: true, views: true, downloads: true },
    }),
  ]);
  const [t, tc, locale] = await Promise.all([
    getTranslations("admin.dashboard"),
    getTranslations("admin.common"),
    getLocale() as Promise<AppLocale>,
  ]);
  const count = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));

  return (
    <>
      <PageTitle title={t("title")} />
      <section className={cn(panel, "mt-6 p-5")} aria-labelledby="todo">
        <h2 id="todo" className="font-sans text-lg font-semibold">
          {t("todoTitle")}
        </h2>
        {todoPayments + todoNoReviewer + todoOverdue + todoRevised === 0 ? (
          <p className="mt-2 text-sm text-success">{t("todoNone")}</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: todoPayments, label: t("todoPayments"), href: "/admin/tolovlar" },
              {
                n: todoNoReviewer,
                label: t("todoNoReviewer"),
                href: "/admin/maqolalar?holat=UNDER_REVIEW",
              },
              {
                n: todoOverdue,
                label: t("todoOverdue"),
                href: "/admin/maqolalar?holat=UNDER_REVIEW",
              },
              {
                n: todoRevised,
                label: t("todoDecide"),
                href: "/admin/maqolalar?holat=UNDER_REVIEW",
              },
            ]
              .filter((x) => x.n > 0)
              .map((x) => (
                <li key={x.label}>
                  <Link
                    href={x.href}
                    className="flex items-center gap-3 rounded-control border border-l-4 border-gold/60 border-l-gold px-4 py-3 hover:bg-blue-50"
                  >
                    <span className="font-serif text-2xl font-bold text-ink">{x.n}</span>
                    <span className="text-sm text-ink">{x.label}</span>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t("revenue")}
          value={`${formatNumber(revenue._sum.amount ?? 0, locale)} ${tc("som")}`}
        />
        <StatCard label={t("newUsers")} value={users} />
        <StatCard label={t("aiChecks")} value={ai._count} />
        <StatCard label={t("aiCost")} value={`$${Number(ai._sum.cost ?? 0).toFixed(2)}`} />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className={cn(panel, "p-5")}>
          <h2 className="font-sans text-lg font-semibold">{t("statuses")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {STATUSES.map((k) => (
              <li
                key={k}
                className="flex justify-between border-b border-border pb-2 last:border-0"
              >
                <Link
                  href={`/admin/maqolalar?holat=${k}`}
                  className="text-blue-800 hover:underline"
                >
                  {tc(`status_${k}`)}
                </Link>
                <span className="font-semibold">{count[k] ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className={cn(panel, "p-5")}>
          <h2 className="font-sans text-lg font-semibold">{t("mostRead")}</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {top.map((a) => (
              <li
                key={a.id}
                className="flex justify-between gap-3 border-b border-border pb-2 last:border-0"
              >
                <Link href={`/admin/maqolalar/${a.id}`} className="text-ink hover:text-blue-800">
                  {a.titleUz}
                </Link>
                <span className="shrink-0 text-text-2">
                  {a.views} / {a.downloads}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
