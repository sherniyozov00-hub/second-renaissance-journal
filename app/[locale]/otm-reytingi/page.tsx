import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ListHeader } from "@/components/article/article-list";
import { PageShell } from "@/components/layout/page-shell";
import { chipClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatNumber } from "@/lib/l10n";
import { getInstitutionRanking } from "@/lib/queries/ranking-db";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ yil?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ranking" });
  return pageMetadata({
    locale: locale as AppLocale,
    path: "/otm-reytingi",
    title: t("title"),
    description: t("lead"),
  });
}

/** OTMlar reytingi: universities by articles published in the journal. */
export default async function RankingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale as AppLocale;
  const { yil } = await searchParams;
  const year = /^\d{4}$/.test(yil ?? "") ? Number(yil) : null;
  const [t, { rows, years }] = await Promise.all([
    getTranslations("ranking"),
    getInstitutionRanking(year),
  ]);
  const th = "px-4 py-3 text-left text-sm font-semibold text-ink";
  const td = "px-4 py-3 text-sm";

  return (
    <PageShell>
      <ListHeader title={t("title")} lead={t("lead")} />
      <div className="container-site py-8 md:py-12">
        {years.length > 1 ? (
          <nav aria-label={t("year")} className="mb-5 flex flex-wrap gap-2">
            <Link href="/otm-reytingi" className={chipClass(!year)}>
              {t("allYears")}
            </Link>
            {years.map((y) => (
              <Link key={y} href={`/otm-reytingi?yil=${y}`} className={chipClass(year === y)}>
                {y}
              </Link>
            ))}
          </nav>
        ) : null}
        {rows.length ? (
          <div className="overflow-x-auto rounded-card border border-border bg-white">
            <table className="w-full min-w-[640px]">
              <caption className="sr-only">{t("title")}</caption>
              <thead className="border-b border-border bg-blue-50">
                <tr>
                  <th scope="col" className={cn(th, "w-14")}>
                    #
                  </th>
                  <th scope="col" className={th}>
                    {t("institution")}
                  </th>
                  <th scope="col" className={cn(th, "text-right")}>
                    {t("articles")}
                  </th>
                  <th scope="col" className={cn(th, "text-right")}>
                    {t("authors")}
                  </th>
                  <th scope="col" className={cn(th, "text-right")}>
                    {t("citations")}
                  </th>
                  <th scope="col" className={cn(th, "text-right")}>
                    {t("views")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.name} className="border-b border-border last:border-0">
                    <td className={cn(td, "font-bold", i < 3 ? "text-gold-text" : "text-text-2")}>
                      {i + 1}
                    </td>
                    <th scope="row" className={cn(td, "text-left font-semibold text-ink")}>
                      {r.name}
                    </th>
                    <td className={cn(td, "text-right font-semibold")}>{r.articles}</td>
                    <td className={cn(td, "text-right")}>{r.authors}</td>
                    <td className={cn(td, "text-right")}>{r.citations}</td>
                    <td className={cn(td, "text-right")}>{formatNumber(r.views, l)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-card border border-border bg-white p-6 text-text-2">{t("empty")}</p>
        )}
        <p className="mt-4 text-sm text-text-2">{t("method")}</p>
      </div>
    </PageShell>
  );
}
