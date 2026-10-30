import "server-only";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { slugify } from "@/lib/text/uz";

export const PAGE_SIZE = 10;

/** Fields every article card/list needs. */
export const articleCardSelect = {
  id: true,
  slug: true,
  titleUz: true,
  titleRu: true,
  titleEn: true,
  abstractUz: true,
  abstractRu: true,
  abstractEn: true,
  type: true,
  keywords: true,
  publishedAt: true,
  views: true,
  downloads: true,
  citations: true,
  category: { select: { slug: true, name: true } },
  issue: { select: { year: true, number: true } },
  authors: {
    orderBy: { order: "asc" },
    select: {
      name: true,
      affiliation: true,
      authorProfile: { select: { slug: true, fullName: true, affiliation: true } },
    },
  },
} satisfies Prisma.ArticleSelect;

export type ArticleCard = Prisma.ArticleGetPayload<{ select: typeof articleCardSelect }>;

export const PUBLISHED = { status: "PUBLISHED" } satisfies Prisma.ArticleWhereInput;

export type LatestSort = "newest" | "mostRead" | "mostCited";

const ORDER: Record<LatestSort, Prisma.ArticleOrderByWithRelationInput[]> = {
  newest: [{ publishedAt: "desc" }],
  mostRead: [{ views: "desc" }, { publishedAt: "desc" }],
  mostCited: [{ citations: "desc" }, { publishedAt: "desc" }],
};

export function getLatestArticles(sort: LatestSort = "newest", take = 5) {
  return db.article.findMany({
    where: PUBLISHED,
    orderBy: ORDER[sort],
    take,
    select: articleCardSelect,
  });
}

/** Paginated list of published articles with an optional filter. */
export async function listArticles(where: Prisma.ArticleWhereInput, page: number) {
  const filter = { AND: [PUBLISHED, where] };
  const [items, total] = await Promise.all([
    db.article.findMany({
      where: filter,
      orderBy: [{ publishedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: articleCardSelect,
    }),
    db.article.count({ where: filter }),
  ]);
  return { items, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Basic substring search; replaced by full-text search in stage 2. */
export function simpleSearchWhere(q: string): Prisma.ArticleWhereInput {
  const term = q.trim();
  if (!term) return {};
  return {
    OR: [
      { titleUz: { contains: term, mode: "insensitive" } },
      { titleEn: { contains: term, mode: "insensitive" } },
      { titleRu: { contains: term, mode: "insensitive" } },
      { abstractUz: { contains: term, mode: "insensitive" } },
      { keywords: { has: term.toLowerCase() } },
      {
        authors: {
          some: { authorProfile: { fullName: { contains: term, mode: "insensitive" } } },
        },
      },
    ],
  };
}

export const getArticleBySlug = cache((slug: string) =>
  db.article.findFirst({
    where: { slug, ...PUBLISHED },
    include: {
      category: true,
      issue: true,
      authors: { orderBy: { order: "asc" }, include: { authorProfile: true } },
      versions: { orderBy: { version: "desc" }, take: 1 },
      references: { orderBy: { order: "asc" } },
    },
  }),
);

export function getRelatedArticles(articleId: string, categoryId: string, keywords: string[]) {
  return db.article.findMany({
    where: {
      ...PUBLISHED,
      id: { not: articleId },
      OR: [{ categoryId }, { keywords: { hasSome: keywords } }],
    },
    orderBy: [{ publishedAt: "desc" }],
    take: 3,
    select: { slug: true, titleUz: true, titleRu: true, titleEn: true },
  });
}

/** Resolves a keyword slug (/kalit-soz/[slug]) back to the keyword text. */
export const findKeywordBySlug = cache(async (slug: string) => {
  const rows = await db.$queryRaw<{ keyword: string }[]>`
    SELECT DISTINCT unnest(keywords) AS keyword FROM "Article" WHERE status = 'PUBLISHED'`;
  return rows.map((r) => r.keyword).find((k) => slugify(k) === slug) ?? null;
});
