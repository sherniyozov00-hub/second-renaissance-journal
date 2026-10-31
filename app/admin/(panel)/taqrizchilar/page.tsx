import Link from "next/link";
import { PageTitle, panel, td, th } from "@/components/admin/ui";
import { requireEditor } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/l10n";
import { cn } from "@/lib/utils";

export const metadata = { title: "Taqrizchilar" };

/** TZ 13: reviewers with their load and overdue reviews. */
export default async function ReviewersAdminPage() {
  await requireEditor("/admin/taqrizchilar");
  const now = new Date();
  const reviewers = await db.user.findMany({
    where: { roles: { has: "REVIEWER" } },
    orderBy: { name: "asc" },
    include: {
      reviews: {
        orderBy: { dueAt: "asc" },
        include: {
          article: {
            select: { id: true, number: true, titleUz: true, category: { select: { name: true } } },
          },
        },
      },
    },
  });
  return (
    <>
      <PageTitle title="Taqrizchilar" />
      <p className="mt-2 text-sm text-text-2">
        Taqrizchi rolini “Foydalanuvchilar va rollar” bo‘limida berasiz; maqolaga biriktirish maqola
        sahifasida.
      </p>
      <section className={cn(panel, "mt-5 overflow-x-auto")}>
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-border bg-blue-50/40">
            <tr>
              {["Taqrizchi", "Ochiq", "Muddati o‘tgan", "Bajarilgan", "Joriy maqolalar"].map(
                (h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {reviewers.map((r) => {
              const open = r.reviews.filter((x) => !x.submittedAt);
              const overdue = open.filter((x) => x.dueAt && x.dueAt < now);
              return (
                <tr key={r.id} className="border-b border-border align-top last:border-0">
                  <td className={cn(td, "font-semibold")}>{r.name ?? r.phone}</td>
                  <td className={td}>{open.length}</td>
                  <td className={cn(td, overdue.length ? "font-semibold text-danger" : "")}>
                    {overdue.length}
                  </td>
                  <td className={td}>{r.reviews.length - open.length}</td>
                  <td className={td}>
                    <ul className="space-y-1">
                      {open.map((x) => (
                        <li key={x.id}>
                          <Link
                            href={`/admin/maqolalar/${x.article.id}`}
                            className="text-blue-800 hover:underline"
                          >
                            #{String(x.article.number).padStart(4, "0")}
                          </Link>{" "}
                          {x.article.titleUz.slice(0, 60)} · {formatDate(x.dueAt, "uz")}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
