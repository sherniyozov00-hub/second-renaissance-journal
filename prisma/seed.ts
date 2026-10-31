/**
 * Idempotent seed: safe to run repeatedly (docker compose runs it on start).
 * Settings are created once and never overwritten, so admin edits survive.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "../generated/prisma/client";
import { slugify } from "../lib/text/uz";
import { KNOWLEDGE_DEFAULTS } from "../lib/ai/knowledge-defaults";
import { SETTINGS } from "../lib/settings/registry";
import { categories } from "./seed-data/categories";
import { articles, authors, type SeedArticle } from "./seed-data/articles";
import { lessons, pages } from "./seed-data/content";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const AFFILIATION = "[Muassasa nomi]";

/** Stable short public code for a certificate, e.g. "K7Q2M9XD". */
function certificateCode(articleSlug: string, authorSlug: string) {
  const hex = createHash("sha256").update(`${articleSlug}:${authorSlug}`).digest("hex");
  return BigInt(`0x${hex.slice(0, 12)}`)
    .toString(36)
    .toUpperCase()
    .padStart(8, "0")
    .slice(0, 8);
}

function articleHtml(a: SeedArticle) {
  return [
    `<h2 id="kirish">1. Kirish</h2>`,
    `<p>${a.intro}</p>`,
    `<h2 id="materiallar-va-usullar">2. Materiallar va usullar</h2>`,
    `<p>${a.methods}</p>`,
    `<h2 id="natijalar">3. Natijalar</h2>`,
    `<p>[Natijalar matni va jadvallar.]</p>`,
    `<h2 id="xulosa">4. Xulosa</h2>`,
    `<p>[Xulosa: asosiy topilmalar, amaliy tavsiyalar va keyingi tadqiqot yo‘nalishlari.]</p>`,
  ].join("\n");
}

const REFERENCES = [
  "[Muallif, I. (Yil). Maqola nomi. Jurnal nomi, jild(son), betlar. DOI]",
  "[Muallif, I. (Yil). Kitob nomi. Nashriyot.]",
  "[Tashkilot. (Yil). Hisobot nomi. URL]",
];

async function upsertUser(data: { email: string; phone: string; name: string; roles: Role[] }) {
  return db.user.upsert({
    where: { email: data.email },
    update: { name: data.name, roles: data.roles },
    create: data,
  });
}

async function main() {
  // ── Users ────────────────────────────────────────────────────────────────
  const admin = await upsertUser({
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
    phone: process.env.SEED_ADMIN_PHONE ?? "+998900000001",
    name: "Administrator",
    roles: ["ADMIN", "EDITOR"],
  });
  const editor = await upsertUser({
    email: "editor@example.com",
    phone: "+998900000002",
    name: "Bosh muharrir",
    roles: ["EDITOR"],
  });
  const reviewer = await upsertUser({
    email: "reviewer@example.com",
    phone: "+998900000003",
    name: "Taqrizchi",
    roles: ["REVIEWER"],
  });
  const demoAuthor = await upsertUser({
    email: "author@example.com",
    phone: "+998900000004",
    name: "Aziza Karimova",
    roles: ["AUTHOR"],
  });

  // ── Categories ───────────────────────────────────────────────────────────
  const categoryIds = new Map<string, string>();
  for (const [order, c] of categories.entries()) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, order },
      create: { slug: c.slug, name: c.name, description: c.description, order },
    });
    categoryIds.set(c.slug, row.id);
  }

  // ── Issue ────────────────────────────────────────────────────────────────
  const issue = await db.issue.upsert({
    where: { year_number: { year: 2026, number: 1 } },
    update: {},
    create: {
      year: 2026,
      number: 1,
      title: "2026 · 1-son",
      status: "PUBLISHED",
      publishedAt: new Date("2026-10-20"),
    },
  });

  // ── Author profiles ──────────────────────────────────────────────────────
  const profileIds = new Map<string, string>();
  for (const a of authors) {
    const userId = a.slug === "aziza-karimova" ? demoAuthor.id : undefined;
    const row = await db.authorProfile.upsert({
      where: { slug: a.slug },
      update: { fullName: a.fullName, position: a.position, userId },
      create: {
        slug: a.slug,
        fullName: a.fullName,
        position: a.position,
        affiliation: AFFILIATION,
        orcid: "[RAQAM]",
        userId,
      },
    });
    profileIds.set(a.slug, row.id);
  }

  // ── Articles ─────────────────────────────────────────────────────────────
  for (const [index, a] of articles.entries()) {
    const slug = slugify(a.titleUz);
    const published = a.status === "PUBLISHED";
    const publishedAt = a.publishedAt ? new Date(a.publishedAt) : null;
    const categoryId = categoryIds.get(a.category);
    if (!categoryId) throw new Error(`Unknown category "${a.category}" for "${slug}"`);

    const data = {
      titleUz: a.titleUz,
      titleEn: a.titleEn,
      titleRu: a.titleRu ?? null,
      abstractUz: a.abstractUz,
      abstractEn: a.abstractEn,
      abstractRu: a.abstractRu ?? null,
      keywords: a.keywords,
      type: a.type,
      status: a.status,
      categoryId,
      issueId: published ? issue.id : null,
      submitterId: a.authors[0] === "aziza-karimova" ? demoAuthor.id : null,
      pageStart: a.pages?.[0] ?? null,
      pageEnd: a.pages?.[1] ?? null,
      submittedAt: publishedAt ? new Date(publishedAt.getTime() - 30 * 864e5) : new Date(),
      acceptedAt: publishedAt ? new Date(publishedAt.getTime() - 7 * 864e5) : null,
      publishedAt,
    };

    // Sample counters only on first insert so re-seeding never resets real stats.
    const stats = published
      ? {
          views: 120 + ((index * 53) % 400),
          downloads: 30 + ((index * 17) % 90),
          citations: (index * 7) % 11,
        }
      : {};
    const article = await db.article.upsert({
      where: { slug },
      update: data,
      create: { slug, ...data, ...stats },
    });

    // Children are fully owned by the seed; rebuild them on every run.
    await db.$transaction([
      db.certificate.deleteMany({ where: { articleId: article.id } }),
      db.articleAuthor.deleteMany({ where: { articleId: article.id } }),
      db.articleVersion.deleteMany({ where: { articleId: article.id } }),
      db.reference.deleteMany({ where: { articleId: article.id } }),
      db.editorComment.deleteMany({ where: { articleId: article.id } }),
      db.payment.deleteMany({ where: { articleId: article.id } }),
    ]);

    for (const [order, authorSlug] of a.authors.entries()) {
      const author = await db.articleAuthor.create({
        data: {
          articleId: article.id,
          authorProfileId: profileIds.get(authorSlug),
          order,
          isCorresponding: order === 0,
        },
      });
      if (published) {
        await db.certificate.create({
          data: {
            id: certificateCode(slug, authorSlug),
            articleId: article.id,
            articleAuthorId: author.id,
            authorName: authors.find((x) => x.slug === authorSlug)!.fullName,
            issuedAt: publishedAt ?? new Date(),
          },
        });
      }
    }

    await db.articleVersion.create({
      data: { articleId: article.id, version: 1, htmlBody: articleHtml(a), note: "Seed" },
    });
    await db.reference.createMany({
      data: REFERENCES.map((raw, order) => ({ articleId: article.id, order, raw })),
    });

    if (a.status === "REVISION_REQUESTED") {
      await db.editorComment.create({
        data: {
          articleId: article.id,
          authorId: editor.id,
          body: "Usullar bo‘limida so‘rovnoma qatnashchilari soni va tanlov mezonlari ko‘rsatilmagan. 3-jadvalga manba qo‘shing.",
        },
      });
    }
    if (a.status !== "PUBLISHED" && demoAuthor.id === data.submitterId) {
      await db.payment.create({
        data: {
          articleId: article.id,
          userId: demoAuthor.id,
          provider: "CLICK",
          amount: 0,
          status: a.status === "AWAITING_PAYMENT" ? "PENDING" : "PAID",
          paidAt: a.status === "AWAITING_PAYMENT" ? null : new Date(),
        },
      });
    }
    if (a.status === "UNDER_REVIEW") {
      const existing = await db.review.findFirst({
        where: { articleId: article.id, reviewerId: reviewer.id },
      });
      if (!existing) {
        await db.review.create({
          data: {
            articleId: article.id,
            reviewerId: reviewer.id,
            dueAt: new Date(Date.now() + 14 * 864e5),
          },
        });
      }
    }
  }

  // ── Akademiya, pages, settings ───────────────────────────────────────────
  for (const [order, l] of lessons.entries()) {
    await db.lesson.upsert({
      where: { slug: l.slug },
      // Lessons are edited in Admin → Akademiya; the seed never overwrites them.
      update: {},
      create: { ...l, order },
    });
  }

  for (const p of pages) {
    // Page bodies are edited by the admin; never overwrite them.
    await db.page.upsert({
      where: { slug: p.slug },
      update: {},
      create: { slug: p.slug, title: p.title, body: p.body },
    });
  }

  for (const s of SETTINGS) {
    await db.setting.upsert({
      where: { key: s.key },
      update: {},
      create: { key: s.key, value: s.defaultValue },
    });
  }

  // Xorazmiy AI knowledge base: created once, then edited by the editorial team.
  for (const k of KNOWLEDGE_DEFAULTS) {
    await db.aiKnowledge.upsert({
      where: { key: k.key },
      update: {},
      create: {
        key: k.key,
        kind: k.kind,
        articleType: k.articleType,
        title: k.title,
        body: k.body,
      },
    });
  }

  await db.auditLog.create({
    data: { actorId: admin.id, action: "seed", entity: "system", entityId: "seed" },
  });

  const counts = {
    users: await db.user.count(),
    categories: await db.category.count(),
    issues: await db.issue.count(),
    publishedArticles: await db.article.count({ where: { status: "PUBLISHED" } }),
    articles: await db.article.count(),
    lessons: await db.lesson.count(),
    pages: await db.page.count(),
    settings: await db.setting.count(),
    aiKnowledge: await db.aiKnowledge.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
