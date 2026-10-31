import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { saveCategoryAction } from "@/app/admin/actions";
import { PageTitle, input, panel } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/styles";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { pick } from "@/lib/l10n";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  return { title: (await getTranslations("admin.categories"))("title") };
}

type Cat = {
  id?: string;
  slug?: string;
  name?: unknown;
  description?: unknown;
  order?: number;
  isActive?: boolean;
};

async function CategoryForm({ c }: { c: Cat }) {
  const [t, tc] = await Promise.all([
    getTranslations("admin.categories"),
    getTranslations("admin.common"),
  ]);
  const l = (v: unknown, k: "uz" | "ru" | "en") =>
    v && typeof v === "object" ? String((v as Record<string, string>)[k] ?? "") : "";
  return (
    <form
      action={saveCategoryAction}
      className={cn(panel, "grid gap-2 p-4 md:grid-cols-[repeat(3,1fr)_90px_auto]")}
    >
      <input type="hidden" name="id" value={c.id ?? ""} />
      {(["Uz", "Ru", "En"] as const).map((k) => (
        <div key={k} className="space-y-1">
          <input
            name={`name${k}`}
            defaultValue={l(c.name, k.toLowerCase() as "uz")}
            placeholder={t("name", { lang: k })}
            aria-label={t("name", { lang: k })}
            required={k === "Uz"}
            className={cn(input, "h-10 w-full")}
          />
          <input
            name={`desc${k}`}
            defaultValue={l(c.description, k.toLowerCase() as "uz")}
            placeholder={t("description", { lang: k })}
            aria-label={t("description", { lang: k })}
            className={cn(input, "h-10 w-full text-sm")}
          />
        </div>
      ))}
      <div className="space-y-1">
        <input
          name="order"
          type="number"
          defaultValue={c.order ?? 0}
          aria-label={t("order")}
          className={cn(input, "h-10 w-full")}
        />
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" name="isActive" defaultChecked={c.isActive ?? true} />{" "}
          {t("active")}
        </label>
      </div>
      <div className="flex flex-col gap-1">
        {!c.id ? (
          <input
            name="slug"
            placeholder="slug"
            aria-label="Slug"
            className={cn(input, "h-10 w-full text-sm")}
          />
        ) : (
          <span className="text-xs text-muted">{c.slug}</span>
        )}
        <button
          className={buttonClass(c.id ? "secondary" : "primary", "sm", c.id ? "text-ink" : "")}
        >
          {c.id ? tc("save") : tc("add")}
        </button>
      </div>
    </form>
  );
}

export default async function CategoriesAdminPage() {
  await requireAdmin("/admin/kategoriyalar");
  const cats = await db.category.findMany({ orderBy: { order: "asc" } });
  const [t, locale] = await Promise.all([
    getTranslations("admin.categories"),
    getLocale() as Promise<AppLocale>,
  ]);
  return (
    <>
      <PageTitle title={t("title")} />
      <p className="mt-2 text-sm text-text-2">{t("count", { count: cats.length })}</p>
      <div className="mt-5 space-y-3">
        {cats.map((c) => (
          <div key={c.id}>
            <p className="mb-1 text-sm font-semibold">{pick(c.name, locale)}</p>
            <CategoryForm c={c} />
          </div>
        ))}
        <p className="pt-4 text-sm font-semibold">{t("new")}</p>
        <CategoryForm c={{}} />
      </div>
    </>
  );
}
