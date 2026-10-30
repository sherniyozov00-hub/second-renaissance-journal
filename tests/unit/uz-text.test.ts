import { describe, expect, it } from "vitest";
import { cyrillicToLatin, hasCyrillic, normalizeUz, slugify, uzTypography } from "@/lib/text/uz";

describe("normalizeUz", () => {
  it("folds every o‘/g‘ spelling into one form", () => {
    const variants = ["o‘", "o’", "o'", "o`", "oʻ", "ö"];
    const normalized = new Set(variants.map(normalizeUz));
    expect(normalized).toEqual(new Set(["o'"]));
    expect(normalizeUz("G‘ALLA")).toBe(normalizeUz("g'alla"));
  });

  it("unifies the tutuq belgisi and is case-insensitive", () => {
    expect(normalizeUz("Ta’lim")).toBe(normalizeUz("ta'lim"));
    expect(normalizeUz("  Sun’iy   intellekt ")).toBe("sun'iy intellekt");
  });
});

describe("cyrillicToLatin", () => {
  it("transliterates a Cyrillic query to the Latin spelling", () => {
    expect(cyrillicToLatin("агротехнология")).toBe("agrotexnologiya");
    expect(cyrillicToLatin("Ўзбекистон")).toBe("o'zbekiston");
    expect(cyrillicToLatin("ғалла")).toBe("g'alla");
  });

  it("writes е as ye at word start and after vowels", () => {
    expect(cyrillicToLatin("ер")).toBe("yer");
    expect(cyrillicToLatin("поезд")).toBe("poyezd");
    expect(cyrillicToLatin("тема")).toBe("tema");
  });

  it("detects Cyrillic input", () => {
    expect(hasCyrillic("агро")).toBe(true);
    expect(hasCyrillic("agro")).toBe(false);
  });
});

describe("slugify", () => {
  it("produces the readable Latin slug from the TZ example", () => {
    expect(slugify("Farg‘ona vodiysida tomchilatib sug‘orish")).toBe(
      "fargona-vodiysida-tomchilatib-sugorish",
    );
  });

  it("handles Cyrillic, punctuation and length", () => {
    expect(slugify("Сунъий интеллект: NLP!")).toBe("suniy-intellekt-nlp");
    const long = slugify("so‘z ".repeat(40), 30);
    expect(long.length).toBeLessThanOrEqual(30);
    expect(long.endsWith("-")).toBe(false);
  });
});

describe("uzTypography", () => {
  it("uses U+2018 after o/g and U+2019 for the tutuq belgisi", () => {
    expect(uzTypography("O'zbekiston ta'lim sug'orish")).toBe("O‘zbekiston ta’lim sug‘orish");
    expect(uzTypography("o`qish va ma`lumot")).toBe("o‘qish va ma’lumot");
  });

  it("leaves correct text unchanged", () => {
    const text = "Farg‘ona vodiysida sun’iy intellekt";
    expect(uzTypography(text)).toBe(text);
  });
});
