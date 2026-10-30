import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export const getCategories = cache(() =>
  db.category.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: { _count: { select: { articles: { where: { status: "PUBLISHED" } } } } },
  }),
);

export const getCategoryBySlug = cache((slug: string) =>
  db.category.findFirst({ where: { slug, isActive: true } }),
);

export const getPublishedIssues = cache(() =>
  db.issue.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ year: "desc" }, { number: "desc" }],
    include: { _count: { select: { articles: { where: { status: "PUBLISHED" } } } } },
  }),
);

/** Issue slug is "2026-1". */
export function parseIssueSlug(slug: string) {
  const m = /^(\d{4})-(\d{1,3})$/.exec(slug);
  return m ? { year: Number(m[1]), number: Number(m[2]) } : null;
}

export const getAuthorBySlug = cache((slug: string) =>
  db.authorProfile.findFirst({ where: { slug, isPublic: true } }),
);

export const getPage = cache((slug: string) => db.page.findUnique({ where: { slug } }));

export const getLessons = cache(() =>
  db.lesson.findMany({ where: { isPublished: true }, orderBy: { order: "asc" } }),
);

export const getLesson = cache((slug: string) =>
  db.lesson.findFirst({ where: { slug, isPublished: true } }),
);
