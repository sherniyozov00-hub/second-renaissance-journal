import mammoth from "mammoth";
import { describe, expect, it } from "vitest";
import { templateDocx } from "@/lib/academy/template";
import { videoEmbedUrl } from "@/lib/academy/video";
import { renderNotification } from "@/lib/notify/templates";
import { institutionName, rankInstitutions } from "@/lib/queries/ranking";
import { analyzeManuscript } from "@/lib/submission/docx";

describe("lesson video", () => {
  it("embeds YouTube and Vimeo without tracking cookies", () => {
    expect(videoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(videoEmbedUrl("https://vimeo.com/76979871")).toBe(
      "https://player.vimeo.com/video/76979871?dnt=1",
    );
  });

  it("refuses other hosts and plain http", () => {
    expect(videoEmbedUrl("https://evil.example/embed/x")).toBeNull();
    expect(videoEmbedUrl("http://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(videoEmbedUrl("javascript:alert(1)")).toBeNull();
    expect(videoEmbedUrl(null)).toBeNull();
  });
});

describe("article template", () => {
  it("is a valid .docx that passes the journal's own structure check", async () => {
    const buf = await templateDocx({ minWords: 3000, maxWords: 8000, minReferences: 10 });
    const { value } = await mammoth.extractRawText({ buffer: buf });
    const report = analyzeManuscript(value);
    expect(Object.values(report.sections).every(Boolean)).toBe(true);
    expect(value).toContain("Kalit so‘zlar:");
    expect(value).toContain("3000–8000 so‘z");
    expect(value).toContain("Kamida 10 ta manba");
  });

  for (const lang of ["ru", "en"] as const) {
    it(`exists in ${lang} and passes the same check`, async () => {
      const buf = await templateDocx({ minWords: 3000, maxWords: 8000, minReferences: 10 }, lang);
      const { value } = await mammoth.extractRawText({ buffer: buf });
      expect(Object.values(analyzeManuscript(value).sections).every(Boolean)).toBe(true);
      expect(value).toContain(lang === "ru" ? "Список литературы" : "References");
    });
  }
});

describe("university ranking", () => {
  it("reads the institution and skips placeholders", () => {
    expect(institutionName("Toshkent davlat agrar universiteti, Toshkent, O‘zbekiston")).toBe(
      "Toshkent davlat agrar universiteti",
    );
    expect(institutionName("[Muassasa nomi]")).toBeNull();
    expect(institutionName("  ")).toBeNull();
  });

  it("counts each article once per institution and ranks by articles, then citations", () => {
    const rows = rankInstitutions([
      {
        articleId: "a1",
        year: 2026,
        views: 100,
        citations: 2,
        authors: [
          { key: "u1", affiliation: "TDAU, Toshkent" },
          { key: "u2", affiliation: "tdau" },
          { key: "u3", affiliation: "SamDU" },
        ],
      },
      {
        articleId: "a2",
        year: 2026,
        views: 10,
        citations: 5,
        authors: [{ key: "u3", affiliation: "SamDU" }],
      },
      {
        articleId: "a3",
        year: 2026,
        views: 1,
        citations: 0,
        authors: [{ key: "u4", affiliation: "[Muassasa nomi]" }],
      },
    ]);
    expect(rows).toEqual([
      { name: "SamDU", articles: 2, authors: 1, views: 110, citations: 7 },
      { name: "TDAU", articles: 1, authors: 2, views: 100, citations: 2 },
    ]);
  });
});

describe("new issue notification", () => {
  it("is written in the user's language", () => {
    const e = {
      kind: "issue" as const,
      year: 2026,
      number: 2,
      count: 14,
      url: "https://x.uz/son/2026-2",
    };
    expect(renderNotification(e, "uz").subject).toBe("Yangi son: 2026-yil, 2-son");
    expect(renderNotification(e, "ru").text).toContain("https://x.uz/son/2026-2");
    expect(renderNotification(e, "en").text).toContain("14 articles");
  });
});
