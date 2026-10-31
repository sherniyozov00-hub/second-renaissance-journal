import { describe, expect, it } from "vitest";
import { analyzeManuscript, extractDocx, validateDocx } from "@/lib/submission/docx";
import { originality } from "@/lib/submission/originality";
import { computePrice, parsePrice } from "@/lib/submission/pricing";
import { parseKeywords, submissionIssues } from "@/lib/submission/service";
import { makeDocx, sampleManuscript } from "../fixtures/docx";

const file = (name: string, buffer: Buffer) => ({ name, size: buffer.length, buffer });

describe("validateDocx (TZ 7.3, 17)", () => {
  it("accepts a real .docx", async () => {
    expect(await validateDocx(file("maqola.docx", await makeDocx(["Salom"])))).toBeNull();
  });
  it("rejects macros, wrong types and large files", async () => {
    expect(await validateDocx(file("m.docx", await makeDocx(["x"], { macro: true })))).toBe(
      "macros",
    );
    expect(await validateDocx(file("m.pdf", await makeDocx(["x"])))).toBe("not_docx");
    expect(await validateDocx(file("m.docx", Buffer.from("not a zip")))).toBe("not_docx");
    expect(
      await validateDocx({ name: "m.docx", size: 11 * 1024 * 1024, buffer: Buffer.alloc(4) }),
    ).toBe("too_large");
  });
});

describe("analyzeManuscript (TZ 16)", () => {
  it("finds sections, counts words without references and checks APA years", async () => {
    const { text } = await extractDocx(await makeDocx(sampleManuscript(3200, 10)));
    const r = analyzeManuscript(text);
    expect(Object.values(r.sections).every(Boolean)).toBe(true);
    expect(r.words).toBeGreaterThan(3000);
    expect(r.references).toBe(10);
    expect(r.referencesWithYear).toBe(10);
    expect(r.referencesWithDoi).toBe(10);
  });
  it("reports missing sections", () => {
    const r = analyzeManuscript("Kirish\nMatn matn matn\nXulosa\nYakun");
    expect(r.sections.introduction).toBe(true);
    expect(r.sections.methods).toBe(false);
    expect(r.references).toBe(0);
  });
});

describe("originality", () => {
  const corpus = [
    {
      id: "a",
      title: "A",
      text: "paxta hosildorligi suv sarfi tomchilatib sug‘orish usuli bilan oshdi va fermerlar daromadi ko‘paydi",
    },
  ];
  it("is 100% for new text", () => {
    expect(
      originality(
        "butunlay yangi matn haqida gap boradi bu yerda hech narsa takrorlanmaydi",
        corpus,
      ).originality,
    ).toBe(100);
  });
  it("detects copied passages across apostrophe spellings", () => {
    const r = originality(
      "paxta hosildorligi suv sarfi tomchilatib sug'orish usuli bilan oshdi",
      corpus,
    );
    expect(r.originality).toBe(0);
    expect(r.matches[0]).toMatchObject({ id: "a" });
  });
});

describe("pricing", () => {
  it("adds fast-track and applies promo codes", () => {
    expect(
      computePrice({ base: 100_000, fastTrackPrice: 50_000, fastTrack: true, promo: null }).total,
    ).toBe(150_000);
    expect(
      computePrice({ base: 100_000, fastTrackPrice: null, fastTrack: true, promo: null }).total,
    ).toBe(100_000);
    expect(
      computePrice({
        base: 100_000,
        fastTrackPrice: null,
        fastTrack: false,
        promo: { discountPercent: 20, discountAmount: null },
      }),
    ).toMatchObject({ discount: 20_000, total: 80_000 });
    expect(
      computePrice({
        base: 100_000,
        fastTrackPrice: null,
        fastTrack: false,
        promo: { discountPercent: null, discountAmount: 500_000 },
      }).total,
    ).toBe(0);
  });
  it("treats placeholders as unset", () => {
    expect(parsePrice("[NARX]")).toBeNull();
    expect(parsePrice("150 000")).toBe(150_000);
    expect(parsePrice(90_000)).toBe(90_000);
  });
});

describe("submission checks", () => {
  it("lists what is missing before payment", () => {
    const issues = submissionIssues({
      titleUz: "Qisqa",
      titleEn: null,
      abstractUz: "bir ikki uch",
      keywords: ["a", "b"],
      authorsCount: 0,
      hasFile: false,
    });
    expect(issues).toEqual(["titleUz", "titleEn", "abstract", "keywords", "authors", "file"]);
  });
  it("parses keywords", () => {
    expect(parseKeywords("paxta, suv;  tejash ,paxta\nFarg‘ona")).toEqual([
      "paxta",
      "suv",
      "tejash",
      "Farg‘ona",
    ]);
  });
});
