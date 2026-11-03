import { describe, expect, it } from "vitest";
import { prepareArticleHtml } from "@/lib/article-html";
import { formatApa, formatBibtex, formatGost, type CitationInput } from "@/lib/citation";
import { cn } from "@/lib/utils";

const input: CitationInput = {
  title: "Farg‘ona vodiysida tomchilatib sug‘orishning paxta hosildorligiga ta’siri",
  authors: ["Aziza Karimova", "Bekzod Rahimov"],
  year: 2026,
  journal: "The Third Renaissance of Uzbekistan",
  volume: 1,
  issue: 1,
  pages: "3–12",
  doi: null,
  url: "https://example.uz/maqola/x",
};

describe("citations", () => {
  it("formats APA 7 like the Ekran 4 sample", () => {
    expect(formatApa(input)).toBe(
      "Karimova, A., & Rahimov, B. (2026). Farg‘ona vodiysida tomchilatib sug‘orishning paxta hosildorligiga ta’siri. The Third Renaissance of Uzbekistan, 1(1), 3–12. https://example.uz/maqola/x",
    );
  });

  it("uses the DOI link when there is one", () => {
    expect(formatApa({ ...input, doi: "10.1234/abc" })).toContain("https://doi.org/10.1234/abc");
  });

  it("formats GOST with the responsibility statement", () => {
    const gost = formatGost(input);
    expect(gost.startsWith("Karimova A. Farg‘ona")).toBe(true);
    expect(gost).toContain(
      "/ Karimova A., Rahimov B. // The Third Renaissance of Uzbekistan. 2026. № 1. С. 3–12.",
    );
  });

  it("formats BibTeX", () => {
    const bib = formatBibtex(input, "karimova2026");
    expect(bib.startsWith("@article{karimova2026,")).toBe(true);
    expect(bib).toContain("author = {Karimova, A. and Rahimov, B.}");
    expect(bib).toContain("pages = {3--12}");
    expect(bib).not.toContain("doi =");
  });
});

describe("prepareArticleHtml", () => {
  it("strips scripts and event handlers (XSS)", () => {
    const { html } = prepareArticleHtml(
      '<p onclick="x()">Matn<script>alert(1)</script></p><img src="javascript:alert(1)">',
    );
    expect(html).not.toMatch(/script|onclick|javascript:/);
    expect(html).toContain("<p>Matn</p>");
  });

  it("builds the table of contents from H2s and adds missing ids", () => {
    const { html, toc } = prepareArticleHtml(
      '<h2 id="kirish">1. Kirish</h2><p>a</p><h2>2. Materiallar va usullar</h2>',
    );
    expect(toc).toEqual([
      { id: "kirish", text: "1. Kirish" },
      { id: "2-materiallar-va-usullar", text: "2. Materiallar va usullar" },
    ]);
    expect(html).toContain('<h2 id="2-materiallar-va-usullar">');
  });

  it("marks outbound links nofollow", () => {
    const { html } = prepareArticleHtml('<p><a href="https://x.uz">x</a></p>');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });
});

describe("cn", () => {
  it("keeps custom font-size tokens next to colour tokens", () => {
    expect(cn("text-eyebrow text-gold-text")).toBe("text-eyebrow text-gold-text");
    expect(cn("rounded-card", "rounded-ai")).toBe("rounded-ai");
  });
});
