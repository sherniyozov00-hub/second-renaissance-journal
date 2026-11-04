import { describe, expect, it } from "vitest";
import { auditNote, checkPercent, findPercents, findSampleSizes } from "@/lib/ai/number-audit";

describe("number audit (review agent)", () => {
  it("accepts percentages that k of n people can give", () => {
    expect(checkPercent("37,1", 35)).toMatchObject({ ok: true, count: 13 });
    expect(checkPercent("31.4", 35)).toMatchObject({ ok: true, count: 11 });
    expect(checkPercent("40", 35)).toMatchObject({ ok: true, count: 14 });
    expect(checkPercent("2,9", 35)).toMatchObject({ ok: true, count: 1 });
    expect(checkPercent("66.7", 30)).toMatchObject({ ok: true, count: 20 });
  });

  it("rejects impossible ones and names the nearest possible values", () => {
    const c = checkPercent("37,3", 35);
    expect(c.ok).toBe(false);
    expect(c.nearest[0]).toBe("37,1 % (13 kishi)");
    expect(checkPercent("42.5", 30).ok).toBe(false);
  });

  it("finds sample sizes and percentages in a draft", () => {
    const text =
      "Tadqiqotda 35 talaba qatnashdi (n = 35). Ularning 37,3 % i muhim, 31,4 % i juda muhim dedi. 60 respondents";
    expect(findSampleSizes(text)[0]).toBe(35);
    expect(findPercents(text)).toEqual(["37,3", "31,4"]);
    const note = auditNote(text);
    expect(note.n).toBe(35);
    expect(note.misfits.map((m) => m.text)).toEqual(["37,3"]);
  });

  it("stays quiet without a sample size", () => {
    expect(auditNote("Hosildorlik 12 % oshdi.")).toEqual({ n: null, misfits: [] });
  });
});
