import { describe, expect, it } from "vitest";
import { lintNote, lintUzbek } from "@/lib/ai/uz-lint";

const ids = (text: string) => lintUzbek(text).map((i) => i.id);
const fix = (text: string, id: string) => lintUzbek(text).find((i) => i.id === id)?.suggestion;

describe("Uzbek text checks (code, exact rules)", () => {
  it("finds Cyrillic look-alikes inside Latin words", () => {
    // Real case from the corpus: "Оkhunоv" with Cyrillic О/о.
    const text = "Оkhunоv Dilshod Mamatjonovich";
    expect(ids(text)).toContain("mixed-script");
    expect(fix(text, "mixed-script")).toBe("Okhunov");
    // Cyrillic text alone is not an error.
    expect(ids("Тошкент шаҳри")).not.toContain("mixed-script");
  });

  it("checks the oʻ/gʻ mark shape and consistency", () => {
    expect(ids("Farg’ona va O`zbekiston")).toEqual(["okina-shape", "okina-shape"]);
    expect(fix("qo”llanilishi", "okina-shape")).toBe("oʻ");
    expect(ids("Oʻzbekiston va o‘zbek")).toContain("okina-mixed");
    expect(ids("Oʻzbekiston, oʻzbek tili, gʻalaba")).toEqual([]);
    // The tutuq belgisi after a vowel is correct: maʼlumot, sheʼr.
    expect(ids("maʼlumot va sheʼr")).toEqual([]);
  });

  it("checks spaces around punctuation", () => {
    expect(fix("qisqartiriladi : “qarash”", "space-before-punct")).toBe(":");
    expect(fix("chunki , bu uning", "space-before-punct")).toBe(",");
    expect(fix("Kafedra mudiri,texnika fanlari", "space-after-punct")).toBe(", ");
    // Decimals, times, code, formulas and links are left alone.
    expect(ids("0,45 va 10:30 da")).toEqual([]);
    expect(ids("std::expected va f(x1,x2)")).not.toContain("space-after-punct");
    expect(ids("Python,https://arxiv.org/abs/1201,04")).toEqual(["space-after-punct"]);
    expect(ids("Ko‘p nuqta ... qo‘yiladi")).toEqual([]);
  });

  it("follows rule 56: ordinal numbers with a hyphen, none after Roman numerals", () => {
    expect(fix("2018 yilda yalpi ichki mahsulot", "ordinal-year")).toBe("2018-yilda");
    expect(fix("2022-yil 21 dekabrda", "ordinal-date")).toBe("21-dekabrda");
    expect(fix("XX-asrning o‘rtalarida", "roman-hyphen")).toBe("XX asrning");
    expect(ids("1991-yil 1-sentabr, XX asr, 5 yil davomida")).toEqual([]);
    // One fix for the whole span: date hyphen and month spelling together.
    expect(ids("5 sentyabrda yig‘ildi")).toEqual(["ordinal-date"]);
    expect(fix("5 sentyabrda", "ordinal-date")).toBe("5-sentabrda");
    expect(ids("5-sentyabrda")).toEqual(["month-spelling"]);
  });

  it("knows the sentabr/oktabr spelling and the tutuq belgisi", () => {
    expect(fix("2019-yil 4-oktyabrdagi", "month-spelling")).toBe("oktabrdagi");
    expect(fix("Kirish malumotlarini olish", "missing-tutuq")).toBe("maʼlumotlarini");
    expect(fix("ish bilan taminlash", "missing-tutuq")).toBe("taʼminlash");
    // Names keep their registered spelling; sanatoriy is a different word.
    expect(ids("Said Sanatovich sanatoriyda")).toEqual([]);
  });

  it("follows rules 55 and 60: -mi together, hech/har/bir/u/bu/shu apart", () => {
    expect(fix("Natija to‘g‘ri chiqdi mi?", "mi-particle")).toBe("mi");
    expect(ids("Natija to‘g‘ri chiqdimi?")).toEqual([]);
    expect(ids("keldi-mi")).toContain("mi-particle");
    expect(fix("Harbir yosh uchun", "separate-words")).toBe("Har bir");
    expect(fix("turistlar uyerga keladi", "separate-words")).toBe("u yerga");
    expect(fix("hechqanday farq yo‘q", "separate-words")).toBe("hech qanday");
    expect(fix("birxil natija", "separate-words")).toBe("bir xil");
    // Written together by the rules: biroz, birmuncha, qayerda; harakat is another word.
    expect(ids("biroz, birmuncha, qayerda, harakat, harbiy, bunday, shunday")).toEqual([]);
  });

  it("flags repeated words, dashes and unbalanced pairs", () => {
    expect(fix("Shu o‘rinda o‘rinda muhim", "repeated-word")).toBe("o‘rinda");
    expect(ids("tez-tez va asta-sekin")).toEqual([]);
    expect(ids("Mashinali o‘rganish - bu usul")).toContain("hyphen-dash");
    expect(ids("5 - 10 kun")).toContain("range-dash");
    expect(ids("(izoh bor")).toContain("unbalanced");
    expect(ids("«Navbahor» bentoniti (namuna)")).toEqual([]);
  });

  it("fixes AI-written text outside quotations", async () => {
    const { autofixUzbek } = await import("@/lib/ai/uz-lint");
    expect(autofixUzbek("Tadqiqot 2018 yilda boshlangan , malumotlar 5 sentyabrda yig‘ildi.")).toBe(
      "Tadqiqot 2018-yilda boshlangan, maʼlumotlar 5-sentabrda yig‘ildi.",
    );
    // A quoted error stays as the author wrote it.
    expect(autofixUzbek("Siz “2018 yilda” deb yozgansiz; to‘g‘risi 2018-yilda.")).toBe(
      "Siz “2018 yilda” deb yozgansiz; to‘g‘risi 2018-yilda.",
    );
    expect(autofixUzbek("Har bir talaba o’z fikrini aytdi mi?")).toBe(
      "Har bir talaba oʻz fikrini aytdimi?",
    );
  });

  it("summarises issues for the AI prompt", () => {
    expect(lintNote("Toza matn.")).toContain("mexanik xato topilmadi");
    const note = lintNote("2018 yilda va 2019 yilda malumot");
    expect(note).toContain("2 ta");
    expect(note).toContain("“2018 yilda” → “2018-yilda”");
  });
});
