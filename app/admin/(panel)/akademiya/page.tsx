import { saveLessonAction } from "@/app/admin/actions";
import { Field, PageTitle, input, panel } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/styles";
import type { Lesson } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata = { title: "Akademiya darslari" };

const area =
  "w-full rounded-control border border-border-strong p-3 text-[14px] leading-relaxed focus:border-blue-800 focus:outline-none";

function translation(lesson: Lesson | undefined, lang: "ru" | "en") {
  const all = (lesson?.translations ?? {}) as Record<string, Record<string, string> | undefined>;
  const t = all[lang] ?? {};
  return {
    title: t.title ?? "",
    summary: t.summary ?? "",
    body: t.body ?? "",
    example: t.example ?? "",
    exercise: t.exercise ?? "",
  };
}

function LessonForm({ lesson, nextOrder }: { lesson?: Lesson; nextOrder: number }) {
  return (
    <form action={saveLessonAction} className="space-y-4 p-5">
      {lesson ? <input type="hidden" name="id" value={lesson.id} /> : null}
      <div className="grid gap-3 md:grid-cols-[2fr_1fr_100px_100px]">
        <Field label="Sarlavha">
          <input
            name="title"
            required
            defaultValue={lesson?.title}
            className={cn(input, "w-full")}
          />
        </Field>
        <Field label="Slug (URL)" hint="Bo‘sh qolsa sarlavhadan">
          <input name="slug" defaultValue={lesson?.slug} className={cn(input, "w-full")} />
        </Field>
        <Field label="Daqiqa">
          <input
            name="durationMin"
            type="number"
            min={1}
            defaultValue={lesson?.durationMin ?? 10}
            className={cn(input, "w-full")}
          />
        </Field>
        <Field label="Tartib">
          <input
            name="order"
            type="number"
            defaultValue={lesson?.order ?? nextOrder}
            className={cn(input, "w-full")}
          />
        </Field>
      </div>
      <Field label="Qisqa tavsif (kartada)">
        <input
          name="summary"
          defaultValue={lesson?.summary ?? ""}
          className={cn(input, "w-full")}
        />
      </Field>
      <Field
        label="Matn"
        hint="Xatboshilar bo‘sh qator bilan; “## ” — sarlavha, “- ” — ro‘yxat, **qalin**."
      >
        <textarea name="body" required rows={12} defaultValue={lesson?.body} className={area} />
      </Field>
      <Field label="Namuna">
        <textarea name="example" rows={5} defaultValue={lesson?.example ?? ""} className={area} />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Mashq (Xorazmiy AI bilan)">
          <textarea
            name="exercise"
            rows={3}
            defaultValue={lesson?.exercise ?? ""}
            className={area}
          />
        </Field>
        <Field label="Video havolasi (ixtiyoriy)" hint="YouTube yoki Vimeo, https://…">
          <input
            name="videoUrl"
            defaultValue={lesson?.videoUrl ?? ""}
            className={cn(input, "w-full")}
          />
        </Field>
      </div>
      {(["ru", "en"] as const).map((lang) => {
        const tr = translation(lesson, lang);
        return (
          <details key={lang} className="rounded-control border border-border">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
              {lang === "ru" ? "Ruscha tarjima" : "Inglizcha tarjima"}
              {tr.title ? "" : " — kiritilmagan (o‘zbekcha ko‘rsatiladi)"}
            </summary>
            <div className="space-y-3 border-t border-border p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Sarlavha">
                  <input name={`${lang}_title`} defaultValue={tr.title} className={cn(input, "w-full")} />
                </Field>
                <Field label="Qisqa tavsif">
                  <input name={`${lang}_summary`} defaultValue={tr.summary} className={cn(input, "w-full")} />
                </Field>
              </div>
              <Field label="Matn">
                <textarea name={`${lang}_body`} rows={8} defaultValue={tr.body} className={area} />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Namuna">
                  <textarea name={`${lang}_example`} rows={4} defaultValue={tr.example} className={area} />
                </Field>
                <Field label="Mashq">
                  <textarea name={`${lang}_exercise`} rows={4} defaultValue={tr.exercise} className={area} />
                </Field>
              </div>
            </div>
          </details>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isPublished"
            value="1"
            defaultChecked={lesson?.isPublished ?? true}
          />{" "}
          Saytda ko‘rinadi
        </label>
        <button type="submit" className={buttonClass("primary", "md")}>
          {lesson ? "Saqlash" : "Qo‘shish"}
        </button>
      </div>
    </form>
  );
}

/** Akademiya lessons (TZ 13, 15): text, example, exercise, video, order, visibility. */
export default async function LessonsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ natija?: string }>;
}) {
  await requireAdmin("/admin/akademiya");
  const { natija } = await searchParams;
  const lessons = await db.lesson.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { progress: true } } },
  });
  const nextOrder = (lessons.at(-1)?.order ?? -1) + 1;
  return (
    <>
      <PageTitle title="Akademiya darslari" />
      {natija ? (
        <p
          className={cn(
            "mt-4 rounded-control px-4 py-3 text-sm font-semibold",
            natija === "saqlandi" ? "bg-success-bg text-success" : "bg-danger-bg text-danger",
          )}
        >
          {natija === "saqlandi"
            ? "Saqlandi."
            : natija === "slug"
              ? "Bu slug band — boshqasini kiriting."
              : "Sarlavha va matn majburiy."}
        </p>
      ) : null}
      <div className="mt-5 space-y-3">
        {lessons.map((l, i) => (
          <details key={l.id} className={cn(panel, !l.isPublished && "opacity-60")}>
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-5 py-4">
              <span className="font-semibold">
                {i + 1}. {l.title}
              </span>
              <span className="text-xs text-text-2">
                /akademiya/{l.slug} · {l.durationMin} daq · tugatganlar: {l._count.progress}
                {l.videoUrl ? " · video" : ""}
                {l.isPublished ? "" : " · yashirin"}
              </span>
            </summary>
            <div className="border-t border-border">
              <LessonForm lesson={l} nextOrder={nextOrder} />
            </div>
          </details>
        ))}
        <details className={panel}>
          <summary className="cursor-pointer px-5 py-4 font-semibold text-blue-800">
            + Yangi dars
          </summary>
          <div className="border-t border-border">
            <LessonForm nextOrder={nextOrder} />
          </div>
        </details>
      </div>
    </>
  );
}
