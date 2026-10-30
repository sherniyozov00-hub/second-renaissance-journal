import { describe, expect, it } from "vitest";
import {
  buildTsQuery,
  hasMatch,
  highlightText,
  highlightSnippet,
  queryVariants,
  searchNormalize,
  trigramQuery,
} from "@/lib/search/normalize";

describe("searchNormalize", () => {
  it("removes apostrophes the same way as uz_search_norm()", () => {
    for (const v of ["O‘zbek", "O’zbek", "O'zbek", "O`zbek", "Oʻzbek", "Özbek"]) {
      expect(searchNormalize(v)).toBe("ozbek");
    }
  });
});

describe("buildTsQuery", () => {
  it("uses prefix matching for every word", () => {
    expect(buildTsQuery("agrotexnologiya")).toBe("(agrotexnologiya:*)");
    expect(buildTsQuery("Sun’iy  intellekt")).toBe("(suniy:* & intellekt:*)");
  });

  it("adds a Latin variant for Cyrillic queries", () => {
    expect(buildTsQuery("агротехнология")).toBe("(агротехнология:*) | (agrotexnologiya:*)");
  });

  it("drops characters that would break to_tsquery", () => {
    expect(buildTsQuery("paxta & (suv) | !")).toBe("(paxta:* & suv:*)");
    expect(buildTsQuery("  ")).toBeNull();
    expect(buildTsQuery("!!!")).toBeNull();
  });
});

describe("queryVariants / trigramQuery", () => {
  it("transliterates for trigram matching", () => {
    expect(trigramQuery("Агротехнология")).toBe("agrotexnologiya");
    expect(queryVariants("o‘g‘it")).toEqual([["ogit"]]);
  });
});

describe("highlightSnippet", () => {
  it("highlights words that start with the query, ignoring apostrophe style", () => {
    const segs = highlightSnippet(
      "Tadqiqot agrotexnologiyalarni o‘rganadi va O'zbekiston uchun.",
      "agrotexnologiya ozbekiston",
    );
    const hits = segs.filter((s) => s.hit).map((s) => s.text.trim());
    expect(hits).toEqual(["agrotexnologiya", "O'zbekiston"]);
  });

  it("starts the snippet near the first hit for long texts", () => {
    const text = `${"so‘z ".repeat(60)}paxta hosildorligi ${"yana ".repeat(60)}`;
    const segs = highlightSnippet(text, "paxta", 120);
    expect(segs[0]!.text.startsWith("…")).toBe(true);
    expect(segs.some((s) => s.hit && s.text === "paxta")).toBe(true);
    expect(segs.at(-1)!.text.endsWith("…")).toBe(true);
  });
});

describe("highlightText", () => {
  it("marks only the matched prefix, like Ekran 5", () => {
    expect(highlightText("O‘zbekistonda raqamli agrotexnologiyalar", "agrotexnologiya")).toEqual([
      { text: "O‘zbekistonda raqamli ", hit: false },
      { text: "agrotexnologiya", hit: true },
      { text: "lar", hit: false },
    ]);
  });

  it("maps Cyrillic queries onto Latin text", () => {
    expect(highlightText("Paxta hosildorligi", "пахта")[0]).toEqual({ text: "Paxta", hit: true });
    expect(hasMatch("suv tejash", "сув")).toBe(true);
    expect(hasMatch("suv tejash", "paxta")).toBe(false);
  });
});
