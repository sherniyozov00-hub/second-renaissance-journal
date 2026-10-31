import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireCabinetUser } from "@/lib/auth/session";
import { cardClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import { getLessons } from "@/lib/queries/catalog";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cabinet" });
  return { title: t("lessons"), robots: { index: false, follow: false } };
}

// Lesson progress tracking is part of stage 7 (Akademiya).
export default async function MyLessonsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireCabinetUser(locale, "/kabinet/darslar");
  const t = await getTranslations();
  const lessons = await getLessons();
  return (
    <>
      <h1 className="text-[28px] leading-tight md:text-section">{t("cabinet.lessons")}</h1>
      <p className="mt-2 text-text-2">{t("cabinet.lessonsLead")}</p>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2">
        {lessons.map((l, i) => (
          <li key={l.slug}>
            <Link
              href={`/akademiya/${l.slug}`}
              className={cn(cardClass, "block h-full p-5 transition-colors hover:border-blue-800")}
            >
              <span className="block text-[13px] text-muted">
                {t("home.lessonMeta", { n: i + 1, min: l.durationMin })}
              </span>
              <span className="mt-1 block font-semibold text-ink">{l.title}</span>
              {l.summary ? (
                <span className="mt-1 block text-sm text-text-2">{l.summary}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
