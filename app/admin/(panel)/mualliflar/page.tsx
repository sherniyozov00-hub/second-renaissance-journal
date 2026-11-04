import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PageTitle, panel, td, th } from "@/components/admin/ui";
import { requireEditor } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  return { title: (await getTranslations("admin.people"))("authorsTitle") };
}

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
  const t = await getTranslations("admin.people");
  return (
    <>
      <PageTitle title={t("authorsTitle")} />
      <form className="mt-5">
        <input
          name="q"
          defaultValue={q}
          placeholder={t("searchByName")}
          aria-label={t("search")}
          className="h-11 w-full max-w-md rounded-control border border-border-strong px-3"
        />
      </form>
      <section className={cn(panel, "mt-5 overflow-x-auto")}>
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-border bg-blue-50/40">
            <tr>
              {[
                t("fullName"),
                t("affiliation"),
                "ORCID",
                t("articles"),
                t("contact"),
                t("profile"),
              ].map((h) => (
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
                <td className={cn(td, "text-text-2")}>
                  {[a.phone ?? a.user?.phone, a.user?.email].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className={td}>
                  {a.isPublic ? (
                    <Link
                      href={`/muallif/${a.slug}`}
                      className="text-blue-800 hover:underline"
                      target="_blank"
                    >
                      {t("public")}
                    </Link>
                  ) : (
                    t("private")
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
