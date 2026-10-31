import Link from "next/link";
import { panel, td, th } from "@/components/admin/ui";
import { requireReviewer } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { formatDate, pick } from "@/lib/l10n";
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
      article: { select: { number: true, titleUz: true, category: { select: { name: true } } } },
    },
  });
  const now = new Date();
  return (
    <>
      <h1 className="font-sans text-[28px] font-bold text-ink">Menga biriktirilgan maqolalar</h1>
      <p className="mt-1 text-sm text-text-2">
        Ko‘r taqriz: mualliflar haqidagi ma’lumot sizga ko‘rsatilmaydi.
      </p>
      {yuborildi ? (
        <p className="mt-4 rounded-control bg-success-bg px-4 py-3 text-sm font-semibold text-success">
          Taqriz yuborildi. Rahmat!
        </p>
      ) : null}
      <section className={cn(panel, "mt-5 overflow-x-auto")}>
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-border bg-blue-50/40">
            <tr>
              {["Maqola", "Yo‘nalish", "Muddat", "Holat", ""].map((h) => (
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
                  #{String(r.article.number).padStart(4, "0")} {r.article.titleUz}
                </td>
                <td className={td}>{pick(r.article.category.name, "uz")}</td>
                <td
                  className={cn(
                    td,
                    !r.submittedAt && r.dueAt && r.dueAt < now && "font-semibold text-danger",
                  )}
                >
                  {formatDate(r.dueAt, "uz")}
                </td>
                <td className={td}>{r.submittedAt ? "Topshirilgan" : "Kutilmoqda"}</td>
                <td className={td}>
                  <Link
                    href={`/taqriz/${r.id}`}
                    className="font-semibold text-blue-800 hover:underline"
                  >
                    {r.submittedAt ? "Ko‘rish" : "Taqriz yozish"}
                  </Link>
                </td>
              </tr>
            ))}
            {!reviews.length ? (
              <tr>
                <td colSpan={5} className={cn(td, "py-8 text-center text-text-2")}>
                  Hozircha biriktirilgan maqola yo‘q.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
