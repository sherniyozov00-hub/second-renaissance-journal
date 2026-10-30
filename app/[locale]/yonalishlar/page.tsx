import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ListHeader } from "@/components/article/article-list";
import { PageShell } from "@/components/layout/page-shell";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { pick } from "@/lib/l10n";
import { getCategories } from "@/lib/queries/catalog";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "lists" });
  return { title: t("categoriesTitle"), description: t("categoriesLead") };
}

export default async function CategoriesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("lists");
  const categories = await getCategories();

  return (
    <PageShell>
      <ListHeader title={t("categoriesTitle")} lead={t("categoriesLead")} />
      <div className="container-site py-8 md:py-12">
        <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/yonalish/${c.slug}`}
                className="block h-full rounded-card border border-border bg-blue-50/45 px-5 py-4 transition-colors hover:border-blue-800"
              >
                <span className="block font-semibold text-ink">
                  {pick(c.name, locale as AppLocale)}
                </span>
                <span className="mt-1 block text-sm text-text-2">
                  {pick(c.description, locale as AppLocale)}
                </span>
                <span className="mt-3 block text-[13px] text-muted">
                  {t("articleCount", { count: c._count.articles })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
