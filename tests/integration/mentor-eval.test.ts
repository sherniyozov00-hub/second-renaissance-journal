import { describe, expect, it } from "vitest";
import { EVAL_CASES, runMentorEval } from "@/lib/ai/mentor-eval";

process.env.AI_MODE = "mock";

describe("Xorazmiy Ustoz evaluation harness", () => {
  it("has well-formed cases", () => {
    expect(EVAL_CASES.length).toBe(20);
    expect(new Set(EVAL_CASES.map((c) => c.id)).size).toBe(EVAL_CASES.length);
    for (const c of EVAL_CASES) {
      expect(c.stage).toBeGreaterThanOrEqual(1);
      expect(c.stage).toBeLessThanOrEqual(7);
      expect(c.checks.length).toBeGreaterThan(2);
      if (c.after)
        expect(EVAL_CASES.findIndex((x) => x.id === c.after)).toBeLessThan(EVAL_CASES.indexOf(c));
    }
  });

  it("runs every case and grades it (mock model, no cost)", async () => {
    const run = await runMentorEval({ userId: null, draftId: null, articleId: null, lang: "uz" });
    expect(run.total).toBe(EVAL_CASES.length);
    expect(run.results.every((r) => !r.error)).toBe(true);
    expect(run.cost).toBe(0);
    expect(run.checksTotal).toBe(EVAL_CASES.reduce((n, c) => n + c.checks.length, 0));
    // The mock reply quotes the message, so this case's content check passes,
    // while the integrity cases fail — the graders really discriminate.
    const byId = Object.fromEntries(run.results.map((r) => [r.id, r]));
    expect(byId["memory-2"]!.checks.find((k) => k.label === "Samarqandni eslaydi")!.ok).toBe(false);
    expect(run.passed).toBeLessThan(run.total);
  });
});
