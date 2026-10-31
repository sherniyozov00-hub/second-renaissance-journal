import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { createIssueAction, publishIssueAction } from "@/app/admin/actions";
import { Field, PageTitle, input, panel, td, th } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/styles";
import { requireEditor } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/l10n";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  return { title: (await getTranslations("admin.issues"))("title") };
}

export default async function IssuesAdminPage() {
  await requireEditor("/admin/sonlar");
  const issues = await db.issue.findMany({
    orderBy: [{ year: "desc" }, { number: "desc" }],
    include: { _count: { select: { articles: true } } },
  });
  const year = new Date().getFullYear();
  const [t, locale] = await Promise.all([
    getTranslations("admin.issues"),
    getLocale() as Promise<AppLocale>,
  ]);
  return (
    <>
      <PageTitle title={t("title")} />
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <section className={cn(panel, "overflow-x-auto")}>
          <table className="w-full">
            <thead className="border-b border-border bg-blue-50/40">
              <tr>
                {[t("colIssue"), t("colArticles"), t("colStatus"), t("colDate"), ""].map((h) => (
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
                    {t("label", { year: i.year, number: i.number })}
                  </td>
                  <td className={td}>{i._count.articles}</td>
                  <td className={td}>{i.status === "PUBLISHED" ? t("published") : t("draft")}</td>
                  <td className={td}>{formatDate(i.publishedAt, locale)}</td>
                  <td className={td}>
                    {i.status === "DRAFT" ? (
                      <form action={publishIssueAction}>
                        <input type="hidden" name="issueId" value={i.id} />
                        <button className="font-semibold text-blue-800 hover:underline">
                          {t("publish")}
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
          <h2 className="font-sans text-lg font-semibold">{t("new")}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("year")}>
              <input
                name="year"
                type="number"
                defaultValue={year}
                className={cn(input, "w-full")}
              />
            </Field>
            <Field label={t("number")}>
              <input name="number" type="number" min={1} required className={cn(input, "w-full")} />
            </Field>
          </div>
          <Field label={t("issueTitle")}>
            <input name="title" className={cn(input, "w-full")} />
          </Field>
          <button className={buttonClass("primary", "md", "w-full")}>{t("create")}</button>
        </form>
      </div>
    </>
  );
}
