import { saveSettingsAction } from "@/app/admin/actions";
import { Field, PageTitle, input, panel } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/styles";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/settings/get";
import { isPlaceholder, SETTINGS } from "@/lib/settings/registry";
import { cn } from "@/lib/utils";

export const metadata = { title: "Sozlamalar" };

const GROUPS: Record<string, string> = {
  journal: "Jurnal",
  contacts: "Kontaktlar",
  pricing: "Narxlar",
  payments: "To‘lov",
  review: "Talablar va taqriz",
  ai: "Xorazmiy AI",
  integrations: "Integratsiyalar",
  seo: "SEO",
};

/** All placeholders ([NARX], [ISSN]...) are edited here — never in code (TZ 1.7, 19). */
export default async function SettingsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ natija?: string }>;
}) {
  await requireAdmin("/admin/sozlamalar");
  const { natija } = await searchParams;
  const values = await getSettings();
  const placeholders = SETTINGS.filter((s) => isPlaceholder(values[s.key])).length;
  return (
    <>
      <PageTitle title="Sozlamalar" />
      {natija === "saqlandi" ? (
        <p className="mt-4 rounded-control bg-success-bg px-4 py-3 text-sm font-semibold text-success">
          Saqlandi.
        </p>
      ) : null}
      <p className="mt-2 text-sm text-text-2">
        To‘ldirilmagan qiymatlar: <strong>{placeholders}</strong>. Maxfiy kalitlar (API, to‘lov,
        SMS, Telegram token) bu yerda emas — server .env faylida.
      </p>
      <form action={saveSettingsAction} className="mt-5 space-y-5">
        {Object.entries(GROUPS).map(([g, title]) => (
          <section key={g} className={cn(panel, "p-5")}>
            <h2 className="font-sans text-lg font-semibold">{title}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {SETTINGS.filter((s) => s.group === g).map((s) => (
                <Field key={s.key} label={s.description} hint={s.key}>
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
        <button className={buttonClass("primary", "lg")}>Saqlash</button>
      </form>
    </>
  );
}
