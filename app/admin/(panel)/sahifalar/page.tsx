import { savePageAction } from "@/app/admin/actions";
import { Field, PageTitle, input, panel } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/styles";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata = { title: "Sahifalar va SEO" };

const LANGS = [
  ["Uz", "uz"],
  ["Ru", "ru"],
  ["En", "en"],
] as const;
const get = (v: unknown, k: string) =>
  v && typeof v === "object" ? String((v as Record<string, string>)[k] ?? "") : "";

/** Static pages with per-page SEO title/description (TZ 13). Verification codes are in Settings. */
export default async function PagesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ natija?: string }>;
}) {
  await requireAdmin("/admin/sahifalar");
  const { natija } = await searchParams;
  const pages = await db.page.findMany({ orderBy: { slug: "asc" } });
  return (
    <>
      <PageTitle title="Sahifalar va SEO" />
      {natija === "saqlandi" ? (
        <p className="mt-4 rounded-control bg-success-bg px-4 py-3 text-sm font-semibold text-success">
          Saqlandi.
        </p>
      ) : null}
      <p className="mt-2 text-sm text-text-2">
        Search Console va Bing tasdiqlash kodlari, sitemap holati — Sozlamalar bo‘limida va
        /sitemap.xml da.
      </p>
      <div className="mt-5 space-y-4">
        {pages.map((p) => (
          <details key={p.id} className={panel}>
            <summary className="cursor-pointer px-5 py-4 font-semibold">
              /{p.slug} — {get(p.title, "uz")}
            </summary>
            <form action={savePageAction} className="space-y-4 border-t border-border p-5">
              <input type="hidden" name="id" value={p.id} />
              {LANGS.map(([k, l]) => (
                <fieldset key={k} className="grid gap-3 md:grid-cols-2">
                  <legend className="mb-2 text-sm font-semibold text-text-2">{k}</legend>
                  <Field label="Sarlavha">
                    <input
                      name={`title${k}`}
                      defaultValue={get(p.title, l)}
                      className={cn(input, "w-full")}
                    />
                  </Field>
                  <Field label="SEO title">
                    <input
                      name={`seoTitle${k}`}
                      defaultValue={get(p.seoTitle, l)}
                      className={cn(input, "w-full")}
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="SEO description (≤155)">
                      <input
                        name={`seoDesc${k}`}
                        maxLength={300}
                        defaultValue={get(p.seoDescription, l)}
                        className={cn(input, "w-full")}
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Matn (paragraflar bo‘sh qator bilan)">
                      <textarea
                        name={`body${k}`}
                        rows={6}
                        defaultValue={get(p.body, l)}
                        className={cn(input, "h-auto w-full py-2")}
                      />
                    </Field>
                  </div>
                </fieldset>
              ))}
              <button className={buttonClass("primary", "md")}>Saqlash</button>
            </form>
          </details>
        ))}
      </div>
    </>
  );
}
