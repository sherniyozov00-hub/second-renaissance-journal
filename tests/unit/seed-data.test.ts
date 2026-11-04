import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/text/uz";
import { isPlaceholder, SETTINGS } from "@/lib/settings/registry";
import { articles, authors } from "@/prisma/seed-data/articles";
import { categories } from "@/prisma/seed-data/categories";
import { lessons } from "@/prisma/seed-data/content";

describe("seed data (TZ section 1, item 8)", () => {
  it("has at least 10 categories with unique slugs and all three languages", () => {
    expect(categories.length).toBeGreaterThanOrEqual(10);
    expect(new Set(categories.map((c) => c.slug)).size).toBe(categories.length);
    for (const c of categories) {
      expect(c.name.uz && c.name.ru && c.name.en).toBeTruthy();
    }
  });

  it("has at least 12 published sample articles", () => {
    expect(articles.filter((a) => a.status === "PUBLISHED").length).toBeGreaterThanOrEqual(12);
  });

  it("generates unique article slugs", () => {
    const slugs = articles.map((a) => slugify(a.titleUz));
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("references only known categories and authors", () => {
    const categorySlugs = new Set(categories.map((c) => c.slug));
    const authorSlugs = new Set(authors.map((a) => a.slug));
    for (const a of articles) {
      expect(categorySlugs.has(a.category), a.titleUz).toBe(true);
      for (const s of a.authors) expect(authorSlugs.has(s), s).toBe(true);
    }
  });

  it("uses 5–7 keywords per article and dates every published one", () => {
    for (const a of articles) {
      expect(a.keywords.length).toBeGreaterThanOrEqual(5);
      expect(a.keywords.length).toBeLessThanOrEqual(7);
      if (a.status === "PUBLISHED") expect(a.publishedAt, a.titleUz).toBeDefined();
    }
  });

  it("seeds the six Akademiya lessons", () => {
    expect(lessons).toHaveLength(6);
  });
});

describe("settings registry", () => {
  it("has unique keys", () => {
    expect(new Set(SETTINGS.map((s) => s.key)).size).toBe(SETTINGS.length);
  });

  it("keeps customer-provided values as placeholders (TZ section 19)", () => {
    for (const key of ["journal.issn", "contacts.email", "telegram.botName"]) {
      const s = SETTINGS.find((x) => x.key === key);
      expect(isPlaceholder(s?.defaultValue), key).toBe(true);
    }
  });

  it("has the prices the customer set: publication 44 444, Premium 39 990 so‘m", () => {
    const price = (key: string) => SETTINGS.find((x) => x.key === key)?.defaultValue;
    expect(price("pricing.publication")).toBe(44444);
    expect(price("pricing.premium")).toBe(39990);
  });

  it("starts payments in sandbox mode", () => {
    expect(SETTINGS.find((s) => s.key === "payments.mode")?.defaultValue).toBe("sandbox");
  });

  it("detects placeholders", () => {
    expect(isPlaceholder("[NARX]")).toBe(true);
    expect(isPlaceholder("120000")).toBe(false);
    expect(isPlaceholder(5)).toBe(false);
  });
});
