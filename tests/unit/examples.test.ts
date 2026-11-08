import { describe, expect, it } from "vitest";
import { EXAMPLES, examplesBlock, pickExamples } from "@/lib/ai/examples";
import { lintUzbek } from "@/lib/ai/uz-lint";

describe("Ustoz corpus examples", () => {
  it("every passage is attributed and openly licensed", () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(100);
    for (const e of EXAMPLES) {
      expect(e.license).toBe("cc-by-4.0");
      expect(e.url).toMatch(/^https:\/\/zenodo\.org\/records\/\d+$/);
      expect(e.title.length).toBeGreaterThan(5);
      expect(e.journal.length).toBeGreaterThan(3);
      if (e.quality === "weak") expect(e.note).toBeTruthy();
    }
    expect(new Set(EXAMPLES.map((e) => e.url)).size).toBeGreaterThanOrEqual(50);
  });

  it("passages pass the exact spelling and punctuation checks", () => {
    for (const e of EXAMPLES) {
      const bad = lintUzbek(e.text).filter((i) => i.severity !== "info" && i.id !== "okina-mixed");
      expect(
        bad.map((b) => `${b.id}: ${b.match}`),
        e.url,
      ).toEqual([]);
    }
  });

  it("gives a good passage for every stage, with a weak one of the same kind when there is one", () => {
    for (let stage = 1; stage <= 7; stage++) {
      const picked = pickExamples(stage, "Tijorat banklarida kredit risklarini boshqarish");
      expect(picked.length).toBeGreaterThanOrEqual(1);
      expect(picked[0]!.quality).toBe("good");
      if (picked[1]) {
        expect(picked[1].quality).toBe("weak");
        expect(picked[1].kind).toBe(picked[0]!.kind);
      }
    }
  });

  it("prefers passages on the author's topic", () => {
    const [first] = pickExamples(1, "Preeklampsiya biokimyoviy markerlar homiladorlik");
    expect(first!.field).toBe("Tibbiyot");
  });

  it("formats passages with their source for the prompt", () => {
    const block = examplesBlock(pickExamples(4, "turizm"));
    expect(block).toContain("<jurnal_namunalari");
    expect(block).toContain("(CC BY 4.0)");
    expect(block).toMatch(/Manba: .+zenodo\.org\/records\/\d+/);
  });
});
