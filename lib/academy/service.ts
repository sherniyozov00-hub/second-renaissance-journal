import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { EMPTY_DOC } from "@/lib/ai/doc";
import { db } from "@/lib/db";

/** Akademiya (TZ 15): progress, practice drafts and sample articles by field. */

export async function lessonProgress(userId: string) {
  const [done, total] = await Promise.all([
    db.lessonProgress.findMany({
      where: { userId },
      select: { lessonId: true, completedAt: true },
    }),
    db.lesson.count({ where: { isPublished: true } }),
  ]);
  const ids = new Set(done.map((d) => d.lessonId));
  const finished = await db.lesson.count({ where: { isPublished: true, id: { in: [...ids] } } });
  return { ids, finished, total, percent: total ? Math.round((finished / total) * 100) : 0 };
}

export async function setLessonDone(userId: string, slug: string, done: boolean) {
  const lesson = await db.lesson.findFirst({
    where: { slug, isPublished: true },
    select: { id: true },
  });
  if (!lesson) return false;
  if (done) {
    await db.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      update: {},
      create: { userId, lessonId: lesson.id },
    });
  } else {
    await db.lessonProgress.deleteMany({ where: { userId, lessonId: lesson.id } });
  }
  return true;
}

/**
 * "Xorazmiy AI bilan mashq": a workspace draft with the lesson's exercise as
 * the first paragraph, so the author writes the answer and asks the AI.
 */
export async function createPracticeDraft(userId: string, slug: string) {
  const lesson = await db.lesson.findFirst({ where: { slug, isPublished: true } });
  if (!lesson) return null;
  const body = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: `Mashq: ${lesson.title}` }],
      },
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: lesson.exercise ?? lesson.summary ?? lesson.title }],
          },
        ],
      },
      ...(EMPTY_DOC.content ?? []).slice(1),
    ],
  };
  const draft = await db.draft.create({
    data: {
      userId,
      title: `Mashq: ${lesson.title}`,
      body: body as Prisma.InputJsonValue,
      text: lesson.exercise ?? "",
    },
    select: { id: true },
  });
  return draft.id;
}

/** "Yo‘nalishlar bo‘yicha namuna maqolalar" (TZ 15): most read published article per field. */
export async function sampleArticles(limitPerCategory = 2) {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      articles: {
        where: { status: "PUBLISHED" },
        orderBy: [{ views: "desc" }],
        take: limitPerCategory,
        select: { slug: true, titleUz: true, titleEn: true, titleRu: true, type: true },
      },
    },
  });
  return categories.filter((c) => c.articles.length);
}
