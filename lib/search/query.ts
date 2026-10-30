import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { articleCardSelect, PAGE_SIZE, type ArticleCard } from "@/lib/queries/articles";
import { buildTsQuery, searchNormalize, tokenize, trigramQuery } from "./normalize";

export const SCOPES = ["all", "title", "abstract", "keywords", "author", "fulltext"] as const;
export type Scope = (typeof SCOPES)[number];
export const SORTS = ["relevance", "newest", "popular"] as const;
export type Sort = (typeof SORTS)[number];
export const TYPES = ["RESEARCH", "REVIEW", "CASE_STUDY", "POPULAR"] as const;
export const LANGUAGES = ["uz", "ru", "en"] as const;

/** Filters live in the URL so results can be shared (TZ 8). */
export type SearchFilters = {
  q: string;
  scope: Scope;
  categories: string[];
  types: string[];
  yearFrom: number | null;
  yearTo: number | null;
  issue: string | null;
  languages: string[];
  institution: string;
  sort: Sort;
  tab: "articles" | "authors";
  page: number;
};

type Raw = Record<string, string | string[] | undefined>;

function list(v: string | string[] | undefined): string[] {
  return (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean);
}

function year(v: string | string[] | undefined): number | null {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n >= 1900 && n <= 2100 ? n : null;
}

/** Parses Uzbek URL params: ?q=&joy=&yonalish=&tur=&yildan=&yilgacha=&son=&til=&muassasa=&saralash=&tab=&page= */
export function parseFilters(raw: Raw): SearchFilters {
  const one = (k: string) => {
    const v = raw[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const page = Number(one("page"));
  return {
    q: one("q").trim().slice(0, 200),
    scope: (SCOPES as readonly string[]).includes(one("joy")) ? (one("joy") as Scope) : "all",
    categories: list(raw.yonalish),
    types: list(raw.tur).filter((t) => (TYPES as readonly string[]).includes(t)),
    yearFrom: year(raw.yildan),
    yearTo: year(raw.yilgacha),
    issue: /^\d{4}-\d{1,3}$/.test(one("son")) ? one("son") : null,
    languages: list(raw.til).filter((l) => (LANGUAGES as readonly string[]).includes(l)),
    institution: one("muassasa").trim().slice(0, 120),
    sort: (SORTS as readonly string[]).includes(one("saralash"))
      ? (one("saralash") as Sort)
      : "relevance",
    tab: one("tab") === "mualliflar" ? "authors" : "articles",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Back to URL params (used for links that change one filter). */
export function filtersToQuery(f: SearchFilters): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  if (f.q) out.q = f.q;
  if (f.scope !== "all") out.joy = f.scope;
  if (f.categories.length) out.yonalish = f.categories;
  if (f.types.length) out.tur = f.types;
  if (f.yearFrom) out.yildan = String(f.yearFrom);
  if (f.yearTo) out.yilgacha = String(f.yearTo);
  if (f.issue) out.son = f.issue;
  if (f.languages.length) out.til = f.languages;
  if (f.institution) out.muassasa = f.institution;
  if (f.sort !== "relevance") out.saralash = f.sort;
  if (f.tab === "authors") out.tab = "mualliflar";
  if (f.page > 1) out.page = String(f.page);
  return out;
}

const TRIGRAM_THRESHOLD = 0.6;

function matchSql(f: SearchFilters, tsq: string, tri: string): Prisma.Sql {
  const q = Prisma.sql`to_tsquery('simple', ${tsq})`;
  const vec = (expr: Prisma.Sql) =>
    Prisma.sql`to_tsvector('simple', uz_search_norm(${expr})) @@ ${q}`;
  switch (f.scope) {
    case "title":
      return vec(Prisma.sql`concat_ws(' ', a."titleUz", a."titleEn", a."titleRu")`);
    case "abstract":
      return vec(Prisma.sql`concat_ws(' ', a."abstractUz", a."abstractEn", a."abstractRu")`);
    case "keywords":
      return vec(Prisma.sql`array_to_string(a.keywords, ' ')`);
    case "author":
      return Prisma.sql`EXISTS (
        SELECT 1 FROM "ArticleAuthor" aa LEFT JOIN "AuthorProfile" p ON p.id = aa."authorProfileId"
         WHERE aa."articleId" = a.id
           AND (to_tsvector('simple', uz_search_norm(coalesce(p."fullName", aa.name))) @@ ${q}
                OR word_similarity(${tri}, uz_search_norm(coalesce(p."fullName", aa.name))) >= ${TRIGRAM_THRESHOLD}))`;
    case "fulltext":
      return Prisma.sql`ts_filter(a.search_vector, '{c}') @@ ${q}`;
    default:
      // Exact/prefix match, or a close spelling (typo tolerance via pg_trgm).
      return Prisma.sql`(a.search_vector @@ ${q} OR word_similarity(${tri}, a.search_text) >= ${TRIGRAM_THRESHOLD})`;
  }
}

function whereSql(f: SearchFilters, opts: { skipCategory?: boolean } = {}): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`a.status = 'PUBLISHED'`];
  const tsq = buildTsQuery(f.q);
  if (tsq) parts.push(matchSql(f, tsq, trigramQuery(f.q)));
  if (f.categories.length && !opts.skipCategory) {
    parts.push(
      Prisma.sql`a."categoryId" IN (SELECT id FROM "Category" WHERE slug = ANY(${f.categories}))`,
    );
  }
  if (f.types.length) parts.push(Prisma.sql`a.type::text = ANY(${f.types})`);
  if (f.languages.length) parts.push(Prisma.sql`a.language::text = ANY(${f.languages})`);
  if (f.yearFrom) parts.push(Prisma.sql`a."publishedAt" >= make_date(${f.yearFrom}::int, 1, 1)`);
  if (f.yearTo) parts.push(Prisma.sql`a."publishedAt" < make_date(${f.yearTo + 1}::int, 1, 1)`);
  if (f.issue) {
    const [y, n] = f.issue.split("-").map(Number);
    parts.push(
      Prisma.sql`a."issueId" IN (SELECT id FROM "Issue" WHERE year = ${y} AND number = ${n})`,
    );
  }
  if (f.institution) {
    parts.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "ArticleAuthor" aa LEFT JOIN "AuthorProfile" p ON p.id = aa."authorProfileId"
       WHERE aa."articleId" = a.id
         AND uz_search_norm(coalesce(p.affiliation, aa.affiliation)) LIKE '%' || ${searchNormalize(f.institution)} || '%')`);
  }
  return Prisma.join(parts, " AND ");
}

function orderSql(f: SearchFilters): Prisma.Sql {
  const tsq = buildTsQuery(f.q);
  if (f.sort === "newest" || !tsq) return Prisma.sql`a."publishedAt" DESC NULLS LAST`;
  if (f.sort === "popular") return Prisma.sql`a.views DESC, a."publishedAt" DESC NULLS LAST`;
  return Prisma.sql`(ts_rank_cd(a.search_vector, to_tsquery('simple', ${tsq}))
                     + word_similarity(${trigramQuery(f.q)}, a.search_text)) DESC,
                    a."publishedAt" DESC NULLS LAST`;
}

export type ArticleResults = {
  items: ArticleCard[];
  total: number;
  pages: number;
  categoryCounts: Record<string, number>;
  related: string[];
};

export async function searchArticles(f: SearchFilters): Promise<ArticleResults> {
  const where = whereSql(f);
  const [rows, counts] = await Promise.all([
    db.$queryRaw<{ id: string; total: bigint }[]>`
      SELECT a.id, count(*) OVER () AS total
        FROM "Article" a
       WHERE ${where}
       ORDER BY ${orderSql(f)}
       LIMIT ${PAGE_SIZE} OFFSET ${(f.page - 1) * PAGE_SIZE}`,
    db.$queryRaw<{ slug: string; n: bigint }[]>`
      SELECT c.slug, count(*) AS n
        FROM "Article" a JOIN "Category" c ON c.id = a."categoryId"
       WHERE ${whereSql(f, { skipCategory: true })}
       GROUP BY c.slug`,
  ]);

  const ids = rows.map((r) => r.id);
  const cards = ids.length
    ? await db.article.findMany({ where: { id: { in: ids } }, select: articleCardSelect })
    : [];
  const byId = new Map(cards.map((c) => [c.id, c]));
  const items = ids.map((id) => byId.get(id)).filter((c): c is ArticleCard => !!c);
  const total = Number(rows[0]?.total ?? 0);

  return {
    items,
    total,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    categoryCounts: Object.fromEntries(counts.map((c) => [c.slug, Number(c.n)])),
    related: relatedKeywords(items, f.q),
  };
}

/** "Shuningdek qidiring": frequent keywords of the results that differ from the query. */
export function relatedKeywords(
  items: Pick<ArticleCard, "keywords">[],
  q: string,
  limit = 3,
): string[] {
  if (!q) return [];
  const qTokens = tokenize(q);
  const freq = new Map<string, number>();
  for (const a of items) {
    for (const k of a.keywords) {
      const kt = tokenize(k);
      if (kt.some((t) => qTokens.some((qt) => t.startsWith(qt) || qt.startsWith(t)))) continue;
      freq.set(k, (freq.get(k) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([k]) => k);
}

export type AuthorResult = {
  slug: string;
  fullName: string;
  affiliation: string | null;
  position: string | null;
  articles: number;
};

export async function searchAuthors(
  f: SearchFilters,
  take = 20,
): Promise<{ items: AuthorResult[]; total: number }> {
  const tsq = buildTsQuery(f.q);
  if (!tsq) return { items: [], total: 0 };
  const tri = trigramQuery(f.q);
  const rows = await db.$queryRaw<(AuthorResult & { total: bigint; articles: bigint })[]>`
    SELECT p.slug, p."fullName", p.affiliation, p.position,
           (SELECT count(*) FROM "ArticleAuthor" aa JOIN "Article" a ON a.id = aa."articleId"
             WHERE aa."authorProfileId" = p.id AND a.status = 'PUBLISHED') AS articles,
           count(*) OVER () AS total
      FROM "AuthorProfile" p
     WHERE p."isPublic"
       AND (to_tsvector('simple', uz_search_norm(p."fullName")) @@ to_tsquery('simple', ${tsq})
            OR word_similarity(${tri}, uz_search_norm(p."fullName")) >= ${TRIGRAM_THRESHOLD})
     ORDER BY word_similarity(${tri}, uz_search_norm(p."fullName")) DESC, p."fullName"
     LIMIT ${take}`;
  return {
    items: rows.map((r) => ({ ...r, articles: Number(r.articles) })),
    total: Number(rows[0]?.total ?? 0),
  };
}

export type Suggestion = { kind: "article" | "author" | "keyword"; label: string; href: string };

/** Autocomplete: article titles, authors and keywords for the typed prefix. */
export async function suggest(q: string): Promise<Suggestion[]> {
  const tsq = buildTsQuery(q);
  if (!tsq || q.trim().length < 2) return [];
  const tri = trigramQuery(q);
  const [articles, authors, keywords] = await Promise.all([
    db.$queryRaw<{ slug: string; title: string }[]>`
      SELECT a.slug, a."titleUz" AS title FROM "Article" a
       WHERE a.status = 'PUBLISHED'
         AND (to_tsvector('simple', uz_search_norm(concat_ws(' ', a."titleUz", a."titleEn", a."titleRu"))) @@ to_tsquery('simple', ${tsq})
              OR word_similarity(${tri}, a.search_text) >= ${TRIGRAM_THRESHOLD})
       ORDER BY a.views DESC LIMIT 5`,
    db.$queryRaw<{ slug: string; name: string }[]>`
      SELECT p.slug, p."fullName" AS name FROM "AuthorProfile" p
       WHERE p."isPublic" AND (to_tsvector('simple', uz_search_norm(p."fullName")) @@ to_tsquery('simple', ${tsq})
             OR word_similarity(${tri}, uz_search_norm(p."fullName")) >= ${TRIGRAM_THRESHOLD})
       LIMIT 3`,
    db.$queryRaw<{ keyword: string }[]>`
      SELECT k.keyword FROM (
        SELECT DISTINCT unnest(keywords) AS keyword FROM "Article" WHERE status = 'PUBLISHED') k
       WHERE to_tsvector('simple', uz_search_norm(k.keyword)) @@ to_tsquery('simple', ${tsq})
       LIMIT 5`,
  ]);
  return [
    ...keywords.map((k) => ({
      kind: "keyword" as const,
      label: k.keyword,
      href: `?q=${encodeURIComponent(k.keyword)}`,
    })),
    ...articles.map((a) => ({
      kind: "article" as const,
      label: a.title,
      href: `/maqola/${a.slug}`,
    })),
    ...authors.map((p) => ({ kind: "author" as const, label: p.name, href: `/muallif/${p.slug}` })),
  ];
}
