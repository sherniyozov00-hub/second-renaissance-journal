import { Check } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireCabinetUser } from "@/lib/auth/session";
import { cardClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import { lessonProgress } from "@/lib/academy/service";
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

/** Akademiya progress (Ekran 7): finished lessons are marked on the lesson page. */
export default async function MyLessonsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireCabinetUser(locale, "/kabinet/darslar");
  const t = await getTranslations();
  const [lessons, progress] = await Promise.all([getLessons(locale), lessonProgress(user.id)]);
  return (
    <>
      <h1 className="text-[28px] leading-tight md:text-section">{t("cabinet.lessons")}</h1>
      <p className="mt-2 text-text-2">{t("cabinet.lessonsLead")}</p>
      <div className="mt-4 max-w-[520px]">
        <p className="text-sm font-semibold text-ink">
          {t("academy.progress", { finished: progress.finished, total: progress.total })}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white" aria-hidden>
          <div className="h-full rounded-full bg-gold" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2">
        {lessons.map((l, i) => (
          <li key={l.slug}>
            <Link
              href={`/akademiya/${l.slug}`}
              className={cn(cardClass, "block h-full p-5 transition-colors hover:border-blue-800")}
            >
              <span className="flex items-center justify-between gap-2 text-[13px] text-muted">
                {t("home.lessonMeta", { n: i + 1, min: l.durationMin })}
                {progress.ids.has(l.id) ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-success">
                    <Check className="size-4" aria-hidden /> {t("academy.done")}
                  </span>
                ) : null}
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
