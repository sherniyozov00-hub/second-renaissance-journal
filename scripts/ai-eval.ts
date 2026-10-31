/**
 * Quality check for Xorazmiy AI (stage 6 "training"): runs the golden cases
 * in tests/ai-eval against the current prompts and knowledge base.
 *
 *   npm run ai:eval            # offline mock (CI) — platform rules only
 *   ANTHROPIC_API_KEY=… npm run ai:eval   # real Claude + web search, all cases
 *
 * Every live run costs money (web searches and tokens); it prints the total.
 */
import "dotenv/config";
import { aiMode } from "@/lib/ai/client";
import { runFactCheck } from "@/lib/ai/factcheck";
import { makePlan, suggestEdits } from "@/lib/ai/features";
import { addSpend, NO_SPEND } from "@/lib/ai/pricing";
import type { FactResult } from "@/lib/ai/schemas";
import { db } from "@/lib/db";
import { EDIT_CASES, FACT_CASES, PLAN_CASES } from "../tests/ai-eval/cases";

const live = aiMode() === "live";
const rows: { suite: string; name: string; score: number; total: number; notes: string[] }[] = [];
let spend = NO_SPEND;

const digits = (s: string) => (s.match(/\d+/g) ?? []).join(",");

async function main() {
  console.log(`Xorazmiy AI eval — ${live ? "live (Claude API)" : "mock"}\n`);

  for (const c of FACT_CASES.filter((x) => live || !x.liveOnly)) {
    const results: FactResult[] = [];
    const ctx = {
      userId: null,
      draftId: null,
      articleId: null,
      articleType: c.articleType,
      categoryId: null,
      maxClaims: 20,
    };
    const r = await runFactCheck(c.text, ctx, (e) => e.type === "result" && results.push(e.result));
    spend = addSpend(spend, r.spend);
    const notes: string[] = [];
    let score = 0;
    for (const exp of c.expect) {
      const hit = results.find((x) => x.text.includes(exp.claim) || exp.claim.includes(x.text));
      if (hit?.verdict === exp.verdict) score++;
      else notes.push(`${exp.claim}: ${hit?.verdict ?? "topilmadi"} ≠ ${exp.verdict}`);
    }
    // Hard rules (TZ 10.2): never violated, whatever the model says.
    for (const x of results) {
      if (x.verdict === "incorrect" && !x.sources.length)
        notes.push(`QOIDA BUZILDI: manbasiz “noto‘g‘ri” — ${x.text}`);
    }
    rows.push({ suite: "fakt", name: c.name, score, total: c.expect.length, notes });
  }

  for (const c of PLAN_CASES.filter((x) => live || !x.liveOnly)) {
    const ctx = {
      userId: null,
      draftId: null,
      articleId: null,
      articleType: c.articleType,
      categoryId: null,
    };
    const { plan } = await makePlan(ctx, c.title, "");
    const titles = plan.sections.map((s) => s.title.toLowerCase()).join(" | ");
    const notes: string[] = [];
    let score = 0;
    for (const s of c.sections) {
      if (titles.includes(s)) score++;
      else notes.push(`bo‘lim yo‘q: ${s}`);
    }
    // Integrity: a sample sentence, not a written section.
    for (const s of plan.sections) {
      if (s.sample_sentence && s.sample_sentence.split(/[.!?]\s/).length > 2)
        notes.push(`QOIDA: “${s.title}” namunasi bir jumladan uzun`);
    }
    rows.push({ suite: "reja", name: c.name, score, total: c.sections.length, notes });
  }

  for (const c of EDIT_CASES.filter((x) => live || !x.liveOnly)) {
    const ctx = {
      userId: null,
      draftId: null,
      articleId: null,
      articleType: "RESEARCH" as const,
      categoryId: null,
    };
    const { edits } = await suggestEdits(ctx, c.text);
    const notes: string[] = [];
    let score = 0;
    for (const m of c.mustTouch) {
      if (edits.some((e) => e.original.includes(m) || m.includes(e.original))) score++;
      else notes.push(`tuzatilmadi: ${m}`);
    }
    for (const e of edits) {
      if (digits(e.original) !== digits(e.replacement))
        notes.push(`QOIDA: raqam o‘zgartirildi — ${e.original}`);
    }
    rows.push({ suite: "tahrir", name: c.name, score, total: c.mustTouch.length, notes });
  }

  let ok = true;
  for (const r of rows) {
    const pct = Math.round((r.score / r.total) * 100);
    console.log(`${r.suite.padEnd(7)} ${r.name.padEnd(36)} ${r.score}/${r.total} (${pct}%)`);
    for (const n of r.notes) console.log(`        · ${n}`);
    if (r.notes.some((n) => n.startsWith("QOIDA"))) ok = false;
    // Offline the mock must be exact; live answers may differ on a case or two.
    if (!live && r.score < r.total) ok = false;
  }
  const score = rows.reduce((n, r) => n + r.score, 0);
  const total = rows.reduce((n, r) => n + r.total, 0);
  console.log(
    `\nJami: ${score}/${total} (${Math.round((score / total) * 100)}%) · narx $${spend.cost.toFixed(4)}`,
  );
  if (live && score / total < 0.8) ok = false;
  process.exitCode = ok ? 0 : 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
