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
