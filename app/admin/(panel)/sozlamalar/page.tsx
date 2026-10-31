import { getTranslations } from "next-intl/server";
import { saveSettingsAction } from "@/app/admin/actions";
import { Field, PageTitle, input, panel } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/styles";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/settings/get";
import { isPlaceholder, SETTINGS } from "@/lib/settings/registry";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  return { title: (await getTranslations("admin.settings"))("title") };
}

const GROUPS = [
  "journal",
  "contacts",
  "pricing",
  "payments",
  "review",
  "ai",
  "integrations",
  "seo",
];

/** All placeholders ([NARX], [ISSN]...) are edited here — never in code (TZ 1.7, 19). */
export default async function SettingsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ natija?: string }>;
}) {
  await requireAdmin("/admin/sozlamalar");
  const { natija } = await searchParams;
  const values = await getSettings();
  const [t, tc] = await Promise.all([
    getTranslations("admin.settings"),
    getTranslations("admin.common"),
  ]);
  /** Translated label of a setting; unknown keys show the registry description. */
  const label = (key: string, fallback: string) => {
    const k = key.replace(/\./g, "_");
    return t.has(k) ? t(k) : fallback;
  };
  const placeholders = SETTINGS.filter((s) => isPlaceholder(values[s.key])).length;
  return (
    <>
      <PageTitle title={t("title")} />
      {natija === "saqlandi" ? (
        <p className="mt-4 rounded-control bg-success-bg px-4 py-3 text-sm font-semibold text-success">
          {tc("saved")}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-text-2">{t("unfilled", { count: placeholders })}</p>
      <form action={saveSettingsAction} className="mt-5 space-y-5">
        {GROUPS.map((g) => (
          <section key={g} className={cn(panel, "p-5")}>
            <h2 className="font-sans text-lg font-semibold">{t(`g_${g}`)}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {SETTINGS.filter((s) => s.group === g).map((s) => (
                <Field key={s.key} label={label(s.key, s.description)} hint={s.key}>
                  <input
                    name={s.key}
                    defaultValue={String(values[s.key] ?? "")}
                    className={cn(
                      input,
                      "w-full",
                      isPlaceholder(values[s.key]) && "border-warning bg-warning-bg/40",
                    )}
                  />
                </Field>
              ))}
            </div>
          </section>
        ))}
        <button className={buttonClass("primary", "lg")}>{tc("save")}</button>
      </form>
    </>
  );
}
