import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { buttonClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { ARTICLE_TYPES, listDrafts } from "@/lib/ai/drafts";
import { requireCabinetUser } from "@/lib/auth/session";
import { pick } from "@/lib/l10n";
import { getCategories } from "@/lib/queries/catalog";
import { createDraftAction, deleteDraftAction } from "./actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ai" });
  return { title: t("listTitle"), robots: { index: false, follow: false } };
}

const field =
  "h-11 w-full rounded-control border border-border-strong bg-white px-3 text-[15px] focus:border-blue-800 focus:outline-none";

/** Drafts written with Xorazmiy AI; each opens the workspace (Ekran 3). */
export default async function DraftsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireCabinetUser(locale, "/kabinet/yozish");
  const [t, ta, format, drafts, categories] = await Promise.all([
    getTranslations("ai"),
    getTranslations("article"),
    getFormatter(),
    listDrafts(user.id),
    getCategories(),
  ]);

  return (
    <>
      <h1 className="text-[28px] leading-tight md:text-section">{t("listTitle")}</h1>
      <p className="mt-2 text-text-2">{t("listLead")}</p>

      <form
        action={createDraftAction}
        className="mt-6 grid gap-4 rounded-card border border-border bg-white p-5 md:grid-cols-[1fr_200px_220px_auto] md:items-end"
      >
        <label className="block text-sm font-semibold">
          {t("draftTitle")}
          <input name="title" required maxLength={300} className={`${field} mt-1.5 font-normal`} />
        </label>
        <label className="block text-sm font-semibold">
          {t("articleType")}
          <select name="type" className={`${field} mt-1.5 font-normal`}>
            {ARTICLE_TYPES.map((x) => (
              <option key={x} value={x}>
                {ta(`types.${x}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          {t("category")}
          <select name="categoryId" className={`${field} mt-1.5 font-normal`}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {pick(c.name, locale as AppLocale)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonClass("primary", "md")}>
          {t("create")}
        </button>
      </form>

      <ul className="mt-6 space-y-3">
        {drafts.length ? (
          drafts.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-white p-5"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/kabinet/yozish/${d.id}`}
                  className="font-serif text-lg font-bold text-ink hover:text-blue-800"
                >
                  {d.title}
                </Link>
                <p className="mt-1 text-sm text-text-2">
                  {ta(`types.${d.articleType}`)} · {t("words", { count: d.wordCount })} ·{" "}
                  {t("updated", {
                    date: format.dateTime(d.updatedAt, { dateStyle: "medium", timeStyle: "short" }),
                  })}
                  {d.article
                    ? ` · ${t("submittedAs", { number: String(d.article.number).padStart(4, "0") })}`
                    : ""}
                </p>
              </div>
              <Link href={`/kabinet/yozish/${d.id}`} className={buttonClass("outline", "sm")}>
                {t("open")}
              </Link>
              <form action={deleteDraftAction}>
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" className="text-sm font-semibold text-danger hover:underline">
                  {t("delete")}
                </button>
              </form>
            </li>
          ))
        ) : (
          <li className="rounded-card border border-border bg-white p-6 text-text-2">
            {t("noDrafts")}
          </li>
        )}
      </ul>
    </>
  );
}
