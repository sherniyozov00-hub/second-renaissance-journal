import { Check, FileDown } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ListHeader } from "@/components/article/article-list";
import { PageShell } from "@/components/layout/page-shell";
import { buttonClass, cardClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { lessonProgress, sampleArticles } from "@/lib/academy/service";
import { currentUser } from "@/lib/auth/session";
import { articleTitle, pick } from "@/lib/l10n";
import { getLessons } from "@/lib/queries/catalog";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

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

/** Akademiya (TZ 15): lessons with progress, the .docx template and sample articles by field. */
export default async function AcademyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale as AppLocale;
  const [t, lessons, samples, user] = await Promise.all([
    getTranslations(),
    getLessons(),
    sampleArticles(),
    currentUser(),
  ]);
  const progress = user ? await lessonProgress(user.id) : null;

  return (
    <PageShell>
      <ListHeader title={t("academy.title")} lead={t("academy.lead")} />
      <div className="container-site py-8 md:py-12">
        {progress ? (
          <div className="mb-6 max-w-[520px]">
            <p className="text-sm font-semibold text-ink">
              {t("academy.progress", { finished: progress.finished, total: progress.total })}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-50" aria-hidden>
              <div
                className="h-full rounded-full bg-gold"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        ) : null}
        <ol className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson, i) => {
            const done = progress?.ids.has(lesson.id);
            return (
              <li key={lesson.slug}>
                <Link
                  href={`/akademiya/${lesson.slug}`}
                  className={cn(
                    cardClass,
                    "block h-full p-5 transition-colors hover:border-blue-800",
                  )}
                >
                  <span className="flex items-center justify-between gap-2 text-[13px] text-muted">
                    {t("home.lessonMeta", { n: i + 1, min: lesson.durationMin })}
                    {done ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-success">
                        <Check className="size-4" aria-hidden /> {t("academy.done")}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block font-semibold text-ink">{lesson.title}</span>
                  {lesson.summary ? (
                    <span className="mt-1.5 block text-sm text-text-2">{lesson.summary}</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ol>

        <section className="mt-10 flex flex-wrap items-center gap-5 rounded-card bg-blue-900 p-6 text-white md:p-8">
          <FileDown className="size-10 shrink-0 text-gold" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="font-sans text-xl font-semibold text-white">
              {t("academy.templateTitle")}
            </h2>
            <p className="mt-1 text-blue-50/80">{t("academy.templateText")}</p>
          </div>
          <a href="/shablon/maqola-shabloni.docx" className={buttonClass("gold", "lg")} download>
            {t("academy.templateButton")}
          </a>
        </section>

        {samples.length ? (
          <section className="mt-10">
            <h2 className="text-[26px] leading-tight">{t("academy.samplesTitle")}</h2>
            <p className="mt-1 text-text-2">{t("academy.samplesLead")}</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {samples.map((c) => (
                <div key={c.id} className={cn(cardClass, "p-5")}>
                  <Link href={`/yonalish/${c.slug}`} className="eyebrow hover:underline">
                    {pick(c.name, l)}
                  </Link>
                  <ul className="mt-2 space-y-2">
                    {c.articles.map((a) => (
                      <li key={a.slug}>
                        <Link
                          href={`/maqola/${a.slug}`}
                          className="font-serif font-semibold text-ink hover:text-blue-800"
                        >
                          {articleTitle(a, l)}
                        </Link>
                        <span className="block text-xs text-text-2">
                          {t(`article.types.${a.type}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}
