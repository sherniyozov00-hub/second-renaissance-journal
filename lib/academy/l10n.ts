/**
 * A lesson in the visitor's language (uz / ru / en). Russian and English
 * texts live in Lesson.translations; a missing field falls back to Uzbek.
 */
type LessonFields = {
  title: string;
  summary: string | null;
  body: string;
  example: string | null;
  exercise: string | null;
  translations: unknown;
};

const FIELDS = ["title", "summary", "body", "example", "exercise"] as const;

export function localizeLesson<T extends LessonFields>(lesson: T, locale: string): T {
  if (locale !== "ru" && locale !== "en") return lesson;
  const all = lesson.translations;
  const tr =
    all && typeof all === "object"
      ? ((all as Record<string, unknown>)[locale] as Record<string, unknown>)
      : null;
  if (!tr || typeof tr !== "object") return lesson;
  const out = { ...lesson };
  for (const f of FIELDS) {
    const v = tr[f];
    if (typeof v === "string" && v.trim()) (out as Record<string, unknown>)[f] = v;
  }
  return out;
}
