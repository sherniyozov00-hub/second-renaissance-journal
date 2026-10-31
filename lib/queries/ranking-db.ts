import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { rankInstitutions, type RankingInput } from "./ranking";

export const getInstitutionRanking = cache(async (year: number | null) => {
  const articles = await db.article.findMany({
    where: {
      status: "PUBLISHED",
      ...(year
        ? {
            publishedAt: {
              gte: new Date(Date.UTC(year, 0, 1)),
              lt: new Date(Date.UTC(year + 1, 0, 1)),
            },
          }
        : {}),
    },
    select: {
      id: true,
      views: true,
      citations: true,
      publishedAt: true,
      authors: {
        select: {
          id: true,
          name: true,
          affiliation: true,
          authorProfileId: true,
          authorProfile: { select: { affiliation: true } },
        },
      },
    },
  });
  const items: RankingInput[] = articles.map((a) => ({
    articleId: a.id,
    year: a.publishedAt?.getUTCFullYear() ?? 0,
    views: a.views,
    citations: a.citations,
    authors: a.authors.map((au) => ({
      key: au.authorProfileId ?? `${au.name ?? au.id}`,
      affiliation: au.affiliation ?? au.authorProfile?.affiliation ?? null,
    })),
  }));
  const years = await db.article.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null } },
    select: { publishedAt: true },
    distinct: ["publishedAt"],
  });
  return {
    rows: rankInstitutions(items),
    years: [...new Set(years.map((y) => y.publishedAt!.getUTCFullYear()))].sort((a, b) => b - a),
  };
});
