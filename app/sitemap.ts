import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";

// Rebuilt on every request so new publications appear immediately (TZ 9.6).
export const dynamic = "force-dynamic";

type Entry = MetadataRoute.Sitemap[number];

function entry(path: string, lastModified?: Date | null, priority = 0.5): Entry {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(path, l)]));
  return {
    url: absoluteUrl(path, routing.defaultLocale),
    lastModified: lastModified ?? undefined,
    priority,
    alternates: { languages },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, categories, authors, issues, pages, lessons] = await Promise.all([
    db.article.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    }),
    db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    db.authorProfile.findMany({
      where: { isPublic: true, articles: { some: { article: { status: "PUBLISHED" } } } },
      select: { slug: true, updatedAt: true },
    }),
    db.issue.findMany({
      where: { status: "PUBLISHED" },
      select: { year: true, number: true, updatedAt: true },
    }),
    db.page.findMany({ select: { slug: true, updatedAt: true } }),
    db.lesson.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
  ]);

  return [
    entry("/", articles[0]?.updatedAt, 1),
    entry("/maqolalar", articles[0]?.updatedAt, 0.8),
    entry("/yonalishlar", null, 0.6),
    entry("/sonlar", null, 0.6),
    entry("/akademiya", null, 0.6),
    entry("/xorazmiy-ai", null, 0.6),
    entry("/otm-reytingi", null, 0.5),
    ...articles.map((a) => entry(`/maqola/${a.slug}`, a.updatedAt, 0.9)),
    ...categories.map((c) => entry(`/yonalish/${c.slug}`, c.updatedAt, 0.6)),
    ...authors.map((a) => entry(`/muallif/${a.slug}`, a.updatedAt, 0.6)),
    ...issues.map((i) => entry(`/son/${i.year}-${i.number}`, i.updatedAt, 0.7)),
    ...pages.map((p) => entry(`/${p.slug}`, p.updatedAt, 0.3)),
    ...lessons.map((l) => entry(`/akademiya/${l.slug}`, l.updatedAt, 0.4)),
  ];
}
