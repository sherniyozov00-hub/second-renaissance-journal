import Link from "next/link";
import { PageTitle, panel, td, th } from "@/components/admin/ui";
import { requireEditor } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata = { title: "Mualliflar" };

export default async function AuthorsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireEditor("/admin/mualliflar");
  const q = ((await searchParams).q ?? "").trim();
  const authors = await db.authorProfile.findMany({
    where: q ? { fullName: { contains: q, mode: "insensitive" } } : {},
    orderBy: { fullName: "asc" },
    take: 200,
    include: {
      user: { select: { phone: true, email: true } },
      _count: { select: { articles: true } },
    },
  });
  return (
    <>
      <PageTitle title="Mualliflar" />
      <form className="mt-5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Ism bo‘yicha qidirish"
          aria-label="Qidirish"
          className="h-11 w-full max-w-md rounded-control border border-border-strong px-3"
        />
      </form>
      <section className={cn(panel, "mt-5 overflow-x-auto")}>
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-border bg-blue-50/40">
            <tr>
              {["F.I.Sh.", "Muassasa", "ORCID", "Maqolalar", "Aloqa", "Profil"].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {authors.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0">
                <td className={cn(td, "font-semibold")}>{a.fullName}</td>
                <td className={td}>{a.affiliation ?? "—"}</td>
                <td className={td}>{a.orcid ?? "—"}</td>
                <td className={td}>{a._count.articles}</td>
                <td className={cn(td, "text-text-2")}>{a.user?.phone ?? a.user?.email ?? "—"}</td>
                <td className={td}>
                  {a.isPublic ? (
                    <Link
                      href={`/muallif/${a.slug}`}
                      className="text-blue-800 hover:underline"
                      target="_blank"
                    >
                      ochiq ↗
                    </Link>
                  ) : (
                    "yopiq"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
