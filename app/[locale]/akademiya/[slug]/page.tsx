import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { SimpleMarkdown } from "@/components/ui/simple-markdown";
import { buttonClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { lessonProgress } from "@/lib/academy/service";
import { videoEmbedUrl } from "@/lib/academy/video";
import { currentUser } from "@/lib/auth/session";
import { getLesson, getLessons } from "@/lib/queries/catalog";
import { pageMetadata } from "@/lib/seo";
import { startPracticeAction, toggleLessonAction } from "../actions";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const lesson = await getLesson(slug, locale);
  if (!lesson) return {};
  return pageMetadata({
    locale: locale as AppLocale,
    path: `/akademiya/${slug}`,
    title: lesson.title,
    description: lesson.summary ?? lesson.body.replace(/\*\*|##/g, "").slice(0, 160),
  });
}

/** Lesson (TZ 15): text, optional video, example, exercise with Xorazmiy AI, progress. */
export default async function LessonPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const lesson = await getLesson(slug, locale);
  if (!lesson) notFound();
  const [t, lessons, user] = await Promise.all([getTranslations(), getLessons(locale), currentUser()]);
  const index = lessons.findIndex((l) => l.slug === slug);
  const prev = lessons[index - 1];
  const next = lessons[index + 1];
  const progress = user ? await lessonProgress(user.id) : null;
  const done = progress?.ids.has(lesson.id) ?? false;
  const embed = videoEmbedUrl(lesson.videoUrl);

  return (
    <PageShell>
      <article className="container-site py-8 md:py-12 lg:max-w-[820px]">
        <Link
          href="/akademiya"
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-800 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden /> {t("academy.back")}
        </Link>
        <p className="eyebrow mt-6">
          {t("home.lessonMeta", { n: index + 1, min: lesson.durationMin })}
        </p>
        <h1 className="mt-2 text-[30px] leading-tight md:text-[40px]">{lesson.title}</h1>

        {embed ? (
          <div className="mt-6 aspect-video overflow-hidden rounded-card border border-border bg-blue-50">
            <iframe
              src={embed}
              title={t("academy.video")}
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              className="size-full"
            />
          </div>
        ) : lesson.videoUrl ? (
          <a
            href={lesson.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block font-semibold text-blue-800 hover:underline"
          >
            {t("academy.video")} →
          </a>
        ) : null}

        <SimpleMarkdown text={lesson.body} className="article-body mt-6" />

        {lesson.example ? (
          <section className="mt-8 rounded-card border-l-4 border-gold bg-white p-6 shadow-sm">
            <h2 className="font-sans text-base font-semibold text-ink">{t("academy.example")}</h2>
            <SimpleMarkdown
              text={lesson.example}
              className="mt-2 space-y-2 font-serif text-[16px] leading-relaxed text-ink"
            />
          </section>
        ) : null}

        {lesson.exercise ? (
          <section className="mt-6 rounded-card border border-border bg-blue-50 p-6">
            <h2 className="font-sans text-base font-semibold text-ink">{t("academy.exercise")}</h2>
            <p className="mt-2 text-text-2">{lesson.exercise}</p>
            <form action={startPracticeAction}>
              <input type="hidden" name="slug" value={lesson.slug} />
              <button type="submit" className={buttonClass("primary", "md", "mt-4")}>
                {t("academy.practiceWithAi")}
              </button>
            </form>
          </section>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <form action={toggleLessonAction} className="flex items-center gap-3">
            <input type="hidden" name="slug" value={lesson.slug} />
            <input type="hidden" name="done" value={done ? "0" : "1"} />
            {done ? (
              <>
                <span className="inline-flex items-center gap-1.5 font-semibold text-success">
                  <Check className="size-5" aria-hidden /> {t("academy.done")}
                </span>
                <button type="submit" className="text-sm text-text-2 hover:underline">
                  {t("academy.undo")}
                </button>
              </>
            ) : (
              <button type="submit" className={buttonClass("outline", "md")}>
                {user ? t("academy.markDone") : t("academy.loginToTrack")}
              </button>
            )}
          </form>
          {progress ? (
            <p className="text-sm text-text-2">
              {t("academy.progress", { finished: progress.finished, total: progress.total })}
            </p>
          ) : null}
        </div>

        <nav aria-label={t("academy.title")} className="mt-6 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/akademiya/${prev.slug}`}
              className="rounded-card border border-border bg-white p-4 hover:border-blue-800"
            >
              <span className="flex items-center gap-1 text-xs text-text-2">
                <ArrowLeft className="size-3.5" aria-hidden /> {t("academy.prev")}
              </span>
              <span className="mt-1 block font-semibold text-ink">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/akademiya/${next.slug}`}
              className="rounded-card border border-border bg-white p-4 text-right hover:border-blue-800"
            >
              <span className="flex items-center justify-end gap-1 text-xs text-text-2">
                {t("academy.next")} <ArrowRight className="size-3.5" aria-hidden />
              </span>
              <span className="mt-1 block font-semibold text-ink">{next.title}</span>
            </Link>
          ) : null}
        </nav>
      </article>
    </PageShell>
  );
}
