import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ListHeader } from "@/components/article/article-list";
import { PageShell } from "@/components/layout/page-shell";
import { cardClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import { getLessons } from "@/lib/queries/catalog";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "academy" });
  return pageMetadata({
    locale: locale as AppLocale,
    path: "/akademiya",
    title: t("title"),
    description: t("lead"),
  });
}

export default async function AcademyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const lessons = await getLessons();

  return (
    <PageShell>
      <ListHeader title={t("academy.title")} lead={t("academy.lead")} />
      <div className="container-site py-8 md:py-12">
        <ol className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((l, i) => (
            <li key={l.slug}>
              <Link
                href={`/akademiya/${l.slug}`}
                className={cn(
                  cardClass,
                  "block h-full p-5 transition-colors hover:border-blue-800",
                )}
              >
                <span className="block text-[13px] text-muted">
                  {t("home.lessonMeta", { n: i + 1, min: l.durationMin })}
                </span>
                <span className="mt-1 block font-semibold text-ink">{l.title}</span>
                {l.summary ? (
                  <span className="mt-1.5 block text-sm text-text-2">{l.summary}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </PageShell>
  );
}
