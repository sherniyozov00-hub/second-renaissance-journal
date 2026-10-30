import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { parseFilters, searchArticles, searchAuthors, suggest } from "@/lib/search/query";

const DRIP = "Farg‘ona vodiysida tomchilatib sug‘orishning paxta hosildorligiga ta’siri";

async function titles(raw: Record<string, string | string[]>) {
  const r = await searchArticles(parseFilters(raw));
  return { titles: r.items.map((a) => a.titleUz), total: r.total, r };
}

afterAll(() => db.$disconnect());

// Acceptance criteria of stage 2 (TZ section 18).
describe("full-text search", () => {
  it("finds articles by a word in the title, keywords or abstract", async () => {
    const { titles: found } = await titles({ q: "agrotexnologiya" });
    expect(found).toContain(DRIP);
    expect(found).toContain("O‘zbekistonda raqamli agrotexnologiyalar: mavjud tadqiqotlar sharhi");
    expect(found.length).toBeGreaterThanOrEqual(4);
  });

  it("finds Latin articles for a Cyrillic query", async () => {
    const { titles: found } = await titles({ q: "агротехнология" });
    expect(found).toContain(DRIP);
  });

  it("tolerates typos", async () => {
    const { titles: found } = await titles({ q: "agrotexnologya" });
    expect(found).toContain(DRIP);
  });

  it("matches every apostrophe spelling", async () => {
    for (const q of ["sug‘orish", "sug'orish", "sug`orish", "sugorish"]) {
      const { titles: found } = await titles({ q });
      expect(found, q).toContain(DRIP);
    }
  });

  it("finds an author's articles and profile by name", async () => {
    const { titles: found } = await titles({ q: "Aziza Karimova" });
    expect(found).toContain(DRIP);
    const authors = await searchAuthors(parseFilters({ q: "Karimova" }));
    expect(authors.items.map((a) => a.slug)).toContain("aziza-karimova");
  });

  it("does not return unpublished articles", async () => {
    const { titles: found } = await titles({ q: "moliyaviy savodxonligi" });
    expect(found).toHaveLength(0);
  });

  it("applies filters and reports category counts", async () => {
    const all = await titles({ q: "agrotexnologiya" });
    const eco = await titles({ q: "agrotexnologiya", yonalish: "ekologiya" });
    expect(eco.titles).toEqual(["Orol bo‘yida tuz bardoshli ekinlar tajribasi"]);
    expect(all.r.categoryCounts.ekologiya).toBe(1);
    // Category counts ignore the category filter itself.
    expect(eco.r.categoryCounts.agrotexnologiyalar).toBe(all.r.categoryCounts.agrotexnologiyalar);
    const reviews = await titles({ q: "agrotexnologiya", tur: "REVIEW" });
    expect(reviews.titles).toEqual([
      "O‘zbekistonda raqamli agrotexnologiyalar: mavjud tadqiqotlar sharhi",
    ]);
  });

  it("restricts the search to one field", async () => {
    const byTitle = await titles({ q: "agrotexnologiya", joy: "title" });
    expect(byTitle.titles).toEqual([
      "O‘zbekistonda raqamli agrotexnologiyalar: mavjud tadqiqotlar sharhi",
    ]);
  });

  it("suggests keywords, titles and authors while typing", async () => {
    const s = await suggest("agrotex");
    expect(s.some((x) => x.kind === "keyword" && x.label === "agrotexnologiya")).toBe(true);
    expect(s.some((x) => x.kind === "article")).toBe(true);
  });
});
