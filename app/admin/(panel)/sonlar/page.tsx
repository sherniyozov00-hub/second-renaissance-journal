import { createIssueAction, publishIssueAction } from "@/app/admin/actions";
import { Field, PageTitle, input, panel, td, th } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/styles";
import { requireEditor } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/l10n";
import { cn } from "@/lib/utils";

export const metadata = { title: "Jurnal sonlari" };

export default async function IssuesAdminPage() {
  await requireEditor("/admin/sonlar");
  const issues = await db.issue.findMany({
    orderBy: [{ year: "desc" }, { number: "desc" }],
    include: { _count: { select: { articles: true } } },
  });
  const year = new Date().getFullYear();
  return (
    <>
      <PageTitle title="Jurnal sonlari" />
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <section className={cn(panel, "overflow-x-auto")}>
          <table className="w-full">
            <thead className="border-b border-border bg-blue-50/40">
              <tr>
                {["Son", "Maqolalar", "Holat", "Nashr sanasi", ""].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {issues.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0">
                  <td className={cn(td, "font-semibold")}>
                    {i.year} · {i.number}-son
                  </td>
                  <td className={td}>{i._count.articles}</td>
                  <td className={td}>{i.status === "PUBLISHED" ? "Nashr qilingan" : "Qoralama"}</td>
                  <td className={td}>{formatDate(i.publishedAt, "uz")}</td>
                  <td className={td}>
                    {i.status === "DRAFT" ? (
                      <form action={publishIssueAction}>
                        <input type="hidden" name="issueId" value={i.id} />
                        <button className="font-semibold text-blue-800 hover:underline">
                          Nashr qilish
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <form action={createIssueAction} className={cn(panel, "space-y-3 p-5")}>
          <h2 className="font-sans text-lg font-semibold">Yangi son</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Yil">
              <input
                name="year"
                type="number"
                defaultValue={year}
                className={cn(input, "w-full")}
              />
            </Field>
            <Field label="Raqam">
              <input name="number" type="number" min={1} required className={cn(input, "w-full")} />
            </Field>
          </div>
          <Field label="Sarlavha (ixtiyoriy)">
            <input name="title" className={cn(input, "w-full")} />
          </Field>
          <button className={buttonClass("primary", "md", "w-full")}>Yaratish</button>
        </form>
      </div>
    </>
  );
}
