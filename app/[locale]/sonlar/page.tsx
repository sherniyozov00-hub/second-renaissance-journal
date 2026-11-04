import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ListHeader } from "@/components/article/article-list";
import { PageShell } from "@/components/layout/page-shell";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatDate } from "@/lib/l10n";
import { getPublishedIssues } from "@/lib/queries/catalog";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "lists" });
  return pageMetadata({
    locale: locale as AppLocale,
    path: "/sonlar",
    title: t("issuesTitle"),
    description: t("issuesLead"),
  });
}

export default async function IssuesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, th] = await Promise.all([getTranslations("lists"), getTranslations("home")]);
  const issues = await getPublishedIssues();

  return (
    <PageShell>
      <ListHeader title={t("issuesTitle")} lead={t("issuesLead")} />
      <div className="container-site py-8 md:py-12">
        {!issues.length ? (
          <p className="rounded-card border border-dashed border-border-strong bg-white p-8 text-text-2">
            {th("issuesEmpty")}
          </p>
        ) : null}
        <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {issues.map((issue) => (
            <li key={issue.id}>
              <Link
                href={`/son/${issue.year}-${issue.number}`}
                className="block rounded-card border border-border bg-white p-5 transition-colors hover:border-blue-800"
              >
                <span className="block font-serif text-2xl font-bold text-blue-900">
                  {t("issueTitle", { year: issue.year, number: issue.number })}
                </span>
                <span className="mt-1 block text-sm text-text-2">
                  {formatDate(issue.publishedAt, locale as AppLocale)}
                </span>
                <span className="mt-3 block text-[13px] text-muted">
                  {t("articleCount", { count: issue._count.articles })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
