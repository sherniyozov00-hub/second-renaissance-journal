import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { SimpleMarkdown } from "@/components/ui/simple-markdown";
import { buttonClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import { getLesson, getLessons } from "@/lib/queries/catalog";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await getLesson(slug);
  return lesson ? { title: lesson.title, description: lesson.summary ?? undefined } : {};
}

export default async function LessonPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const lesson = await getLesson(slug);
  if (!lesson) notFound();
  const t = await getTranslations();
  const index = (await getLessons()).findIndex((l) => l.slug === slug);

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
        <SimpleMarkdown text={lesson.body} className="article-body mt-6" />
        {lesson.exercise ? (
          <section className="mt-8 rounded-card border border-border bg-blue-50 p-6">
            <h2 className="font-sans text-base font-semibold text-ink">{t("academy.exercise")}</h2>
            <p className="mt-2 text-text-2">{lesson.exercise}</p>
            <Link href="/xorazmiy-ai" className={buttonClass("primary", "md", "mt-4")}>
              {t("academy.practiceWithAi")}
            </Link>
          </section>
        ) : null}
      </article>
    </PageShell>
  );
}
