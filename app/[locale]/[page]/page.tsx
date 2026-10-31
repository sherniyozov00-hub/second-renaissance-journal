import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ListHeader } from "@/components/article/article-list";
import { ProcessAndPrice } from "@/components/home/sections";
import { SimpleMarkdown } from "@/components/ui/simple-markdown";
import { PageShell } from "@/components/layout/page-shell";
import type { AppLocale } from "@/i18n/routing";
import { pick } from "@/lib/l10n";
import { getPage } from "@/lib/queries/catalog";
import { getSettings } from "@/lib/settings/get";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page } = await params;
  const row = await getPage(page);
  if (!row) return {};
  const l = locale as AppLocale;
  return pageMetadata({
    locale: l,
    path: `/${page}`,
    title: pick(row.seoTitle, l) || pick(row.title, l),
    description: pick(row.seoDescription, l) || undefined,
  });
}

/** Requirements table (TZ 16), driven by Settings so the admin can change values. */
async function Requirements() {
  const t = await getTranslations("pages");
  const s = await getSettings();
  const rows: [string, string][] = [
    [
      t("volume"),
      t("volumeValue", {
        min: String(s["requirements.minWords"]),
        max: String(s["requirements.maxWords"]),
      }),
    ],
    [t("structure"), t("structureValue")],
    [t("abstract"), t("abstractValue")],
    [t("keywords"), t("keywordsValue")],
    [t("references"), t("referencesValue", { min: String(s["requirements.minReferences"]) })],
    [t("figures"), t("figuresValue")],
    [t("file"), t("fileValue")],
    [
      t("originality"),
      t("originalityValue", { min: String(s["requirements.minOriginalityPercent"]) }),
    ],
    [t("ethics"), t("ethicsValue")],
    [t("license"), t("licenseValue")],
  ];
  return (
    <section className="mb-10">
      <h2 className="font-serif text-2xl font-bold text-blue-900">{t("requirementsTitle")}</h2>
      <div className="mt-4 overflow-x-auto rounded-card border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-blue-50 text-ink">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t("requirement")}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t("value")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-t border-border">
                <th scope="row" className="px-4 py-3 align-top font-medium text-ink">
                  {k}
                </th>
                <td className="px-4 py-3 text-text-2">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted">
        {t("reviewDeadline", { days: String(s["review.deadlineDays"]) })}
      </p>
    </section>
  );
}

export default async function StaticPage({ params }: Props) {
  const { locale, page } = await params;
  setRequestLocale(locale);
  const row = await getPage(page);
  if (!row) notFound();
  const l = locale as AppLocale;
  const body = pick(row.body, l);
  const price = page === "narxlar" ? (await getSettings())["pricing.publication"] : null;

  return (
    <PageShell>
      <ListHeader title={pick(row.title, l)} />
      {price !== null ? <ProcessAndPrice price={price as string | number} /> : null}
      <div className="container-site py-8 md:py-12 lg:max-w-[880px]">
        {page === "mualliflarga" ? <Requirements /> : null}
        <SimpleMarkdown text={body} className="space-y-4 text-base leading-relaxed text-text-2" />
      </div>
    </PageShell>
  );
}
