import "server-only";
import type { ArticleType } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { pick } from "@/lib/l10n";
import { ARTICLE_TYPE_LABEL, KNOWLEDGE_DEFAULTS } from "./knowledge-defaults";

/**
 * How Xorazmiy AI "learns" (stage 6): the instructions of every call are
 * built from (1) the knowledge base for the article type and field, edited
 * by the editorial team, and (2) examples taken from articles the journal
 * has accepted. Both grow with the platform, without retraining the model.
 */

type Entry = { kind: string; title: string; body: string; articleType: ArticleType | null };

const KIND_ORDER = ["STYLE", "GUIDE", "CHECKLIST", "EXAMPLE"];

async function entries(type: ArticleType, categoryId: string | null): Promise<Entry[]> {
  const rows = await db.aiKnowledge.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ articleType: null }, { articleType: type }] },
        { OR: [{ categoryId: null }, ...(categoryId ? [{ categoryId }] : [])] },
      ],
    },
    orderBy: [{ key: "asc" }],
    select: { kind: true, title: true, body: true, articleType: true },
  });
  if (rows.length) return rows;
  return KNOWLEDGE_DEFAULTS.filter((k) => k.articleType === null || k.articleType === type);
}

/** Published articles of the same type (and field, when there are enough) as reference examples. */
async function examples(type: ArticleType, categoryId: string | null): Promise<string[]> {
  const base = { status: "PUBLISHED" as const, type };
  let rows = await db.article.findMany({
    where: { ...base, ...(categoryId ? { categoryId } : {}) },
    orderBy: [{ citations: "desc" }, { views: "desc" }],
    take: 2,
    select: {
      titleUz: true,
      abstractUz: true,
      keywords: true,
      category: { select: { name: true } },
      versions: { orderBy: { version: "desc" }, take: 1, select: { htmlBody: true } },
    },
  });
  if (rows.length < 2 && categoryId) {
    rows = await db.article.findMany({
      where: base,
      orderBy: [{ citations: "desc" }, { views: "desc" }],
      take: 2,
      select: {
        titleUz: true,
        abstractUz: true,
        keywords: true,
        category: { select: { name: true } },
        versions: { orderBy: { version: "desc" }, take: 1, select: { htmlBody: true } },
      },
    });
  }
  return rows.map((a) => {
    const headings = [...(a.versions[0]?.htmlBody ?? "").matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/g)]
      .map((m) => m[1]!.replace(/<[^>]+>/g, "").trim())
      .filter(Boolean)
      .slice(0, 12);
    return [
      `Sarlavha: ${a.titleUz}`,
      `Yo‘nalish: ${pick(a.category.name, "uz")}`,
      `Annotatsiya: ${a.abstractUz.slice(0, 1200)}`,
      `Kalit so‘zlar: ${a.keywords.join(", ")}`,
      headings.length ? `Bo‘limlar: ${headings.join(" → ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  });
}

const cache = new Map<string, { at: number; text: string }>();
const TTL = 60_000;

/**
 * The stable part of the system prompt for an article type and field.
 * Cached briefly in memory; identical text keeps Claude's prompt cache warm.
 */
export async function knowledgePrompt(type: ArticleType, categoryId: string | null) {
  const key = `${type}:${categoryId ?? ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.text;

  const [list, samples] = await Promise.all([
    entries(type, categoryId),
    examples(type, categoryId),
  ]);
  const sorted = [...list].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  const text = [
    `<maqola_turi>${ARTICLE_TYPE_LABEL[type]}</maqola_turi>`,
    ...sorted.map((e) => `<bilim turi="${e.kind}" nomi="${e.title}">\n${e.body}\n</bilim>`),
    ...samples.map(
      (s, i) =>
        `<jurnal_namunasi raqam="${i + 1}" izoh="Tahririyat qabul qilgan maqola; tuzilma va uslub namunasi, matnini ko‘chirma">\n${s}\n</jurnal_namunasi>`,
    ),
  ].join("\n\n");
  cache.set(key, { at: Date.now(), text });
  return text;
}

export function clearKnowledgeCache() {
  cache.clear();
}
