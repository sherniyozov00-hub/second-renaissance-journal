import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDraft, saveDraftBody, submitDraft } from "@/lib/ai/drafts";
import { runFactCheck } from "@/lib/ai/factcheck";
import { suggestEdits } from "@/lib/ai/features";
import { consumeCheck } from "@/lib/ai/quota";
import type { FactEvent } from "@/lib/ai/schemas";
import { db } from "@/lib/db";
import { markPaid } from "@/lib/payments/service";

// No API key in tests: the offline mock stands in for Claude.
process.env.AI_MODE = "mock";

const PHONE = "+998990000077";
let user: { id: string; aiQuota: number | null; profile: null } = {
  id: "",
  aiQuota: 2,
  profile: null,
};
let categoryId = "";
const articles: string[] = [];

const PARAGRAPHS = [
  "1. Kirish",
  "Paxta O‘zbekistonning asosiy qishloq xo‘jaligi ekinlaridan biri hisoblanadi. Tomchilatib sug‘orish 2010-yilda ixtiro qilingan va bugun ko‘plab mamlakatlarda qo‘llaniladi.",
  "Tadqiqotlarga ko‘ra, bu usul suvni 70% gacha tejaydi.",
];

function doc(paragraphs: string[]) {
  return {
    type: "doc",
    content: paragraphs.map((text, i) =>
      i === 0
        ? { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] }
        : { type: "paragraph", content: [{ type: "text", text }] },
    ),
  };
}

beforeAll(async () => {
  const u = await db.user.upsert({
    where: { phone: PHONE },
    update: { aiQuota: 2, aiCredits: 0 },
    create: { phone: PHONE, name: "AI test", aiQuota: 2 },
  });
  user = { id: u.id, aiQuota: 2, profile: null };
  categoryId = (await db.category.findFirstOrThrow()).id;
  await db.aiUsage.deleteMany({ where: { userId: u.id } });
  await db.aiUsage.deleteMany({ where: { guestKey: "g_test_guest" } });
});

afterAll(async () => {
  await db.aiUsage.deleteMany({
    where: { OR: [{ userId: user.id }, { guestKey: "g_test_guest" }] },
  });
  await db.payment.deleteMany({ where: { userId: user.id } });
  await db.draft.deleteMany({ where: { userId: user.id } });
  await db.article.deleteMany({ where: { id: { in: articles } } });
  await db.$disconnect();
});

describe("quotas (TZ 10.4)", () => {
  it("gives a guest a limited number of short checks a day", async () => {
    const guest = { kind: "guest" as const, key: "g_test_guest" };
    expect(await consumeCheck(guest, { chars: 5000 })).toEqual({ ok: false, code: "too_long" });
    const first = await consumeCheck(guest, { chars: 100 });
    expect(first.ok).toBe(true);
    expect(await consumeCheck(guest, { chars: 100 })).toEqual({ ok: false, code: "quota" });
    if (first.ok) await first.refund();
    expect((await consumeCheck(guest, { chars: 100 })).ok).toBe(true);
  });

  it("uses the monthly checks, then purchased credits, then refuses", async () => {
    const actor = { kind: "user" as const, id: user.id, aiQuota: 2 };
    expect((await consumeCheck(actor, { chars: 10 })).ok).toBe(true);
    expect((await consumeCheck(actor, { chars: 10 })).ok).toBe(true);
    expect(await consumeCheck(actor, { chars: 10 })).toEqual({ ok: false, code: "quota" });

    // "Limitni oshirish": a paid AI package adds credits.
    const payment = await db.payment.create({
      data: { userId: user.id, provider: "CLICK", amount: 20_000, purpose: "AI_PACKAGE" },
    });
    expect(await markPaid(payment.id, `test-${payment.id}`)).toBe("paid");
    expect(await markPaid(payment.id, `test-${payment.id}`)).toBe("already_paid");
    const credits = (await db.user.findUniqueOrThrow({ where: { id: user.id } })).aiCredits;
    expect(credits).toBeGreaterThan(0);
    expect((await consumeCheck(actor, { chars: 10 })).ok).toBe(true);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).aiCredits).toBe(
      credits - 1,
    );
    await db.user.update({ where: { id: user.id }, data: { aiCredits: 0 } });
  });

  it("does not count checks on an article with paid publication", async () => {
    const article = await db.article.create({
      data: {
        slug: `ai-paid-${Date.now()}`,
        titleUz: "To‘langan maqola",
        abstractUz: "—",
        categoryId,
        submitterId: user.id,
        status: "UNDER_REVIEW",
      },
    });
    articles.push(article.id);
    await db.payment.create({
      data: {
        userId: user.id,
        articleId: article.id,
        provider: "PAYME",
        amount: 1,
        status: "PAID",
      },
    });
    const actor = { kind: "user" as const, id: user.id, aiQuota: 2 };
    expect((await consumeCheck(actor, { chars: 10, paidArticleId: article.id })).ok).toBe(true);
    expect(await consumeCheck(actor, { chars: 10 })).toEqual({ ok: false, code: "quota" });
  });
});

describe("fact check pipeline (TZ 10.3)", () => {
  it("streams verdicts, enforces sources and caches unchanged paragraphs", async () => {
    const draftId = await createDraft(user.id, {
      title: "Tomchilatib sug‘orish",
      articleType: "RESEARCH",
      categoryId,
    });
    const ctx = {
      userId: user.id,
      draftId,
      articleId: null,
      articleType: "RESEARCH" as const,
      categoryId,
      maxClaims: 20,
    };
    const text = PARAGRAPHS.join("\n");

    const first: FactEvent[] = [];
    const run1 = await runFactCheck(text, ctx, (e) => first.push(e));
    expect(first[0]).toMatchObject({ type: "start", paragraphs: 3, mock: true });
    expect(run1.results.map((r) => r.verdict).sort()).toEqual([
      "correct",
      "incorrect",
      "needs_source",
    ]);
    for (const r of run1.results) {
      if (r.verdict !== "needs_source") expect(r.sources.length).toBeGreaterThan(0);
    }
    expect(
      first.filter((e) => e.type === "progress").every((e) => e.type === "progress" && !e.cached),
    ).toBe(true);
    expect(first.at(-1)).toMatchObject({
      type: "done",
      summary: { correct: 1, incorrect: 1, needs_source: 1 },
    });

    // Same text again: every paragraph comes from the cache.
    const second: FactEvent[] = [];
    await runFactCheck(text, ctx, (e) => second.push(e));
    const progress = second.filter((e) => e.type === "progress");
    expect(progress.length).toBe(2);
    expect(progress.every((e) => e.type === "progress" && e.cached)).toBe(true);

    // Only the changed paragraph is checked again.
    const third: FactEvent[] = [];
    await runFactCheck(
      `${text}\nO‘zbekistonda 2024-yilda 3 million tonna paxta yetishtirildi.`,
      ctx,
      (e) => third.push(e),
    );
    const fresh = third.filter((e) => e.type === "progress" && !e.cached);
    expect(fresh).toHaveLength(1);

    const stored = await db.aiCheck.count({
      where: { draftId, type: "FACTCHECK", model: "summary" },
    });
    expect(stored).toBe(3);
  });

  it("respects the claim limit per check", async () => {
    const events: FactEvent[] = [];
    const many = Array.from(
      { length: 6 },
      (_, i) => `Bu yerda ${i + 1}0 ta tajriba maydoni ${2000 + i}-yilda tashkil etilgan.`,
    );
    await runFactCheck(
      ["Sinov", ...many].join("\n"),
      {
        userId: user.id,
        draftId: null,
        articleId: null,
        articleType: "RESEARCH",
        categoryId,
        maxClaims: 3,
      },
      (e) => events.push(e),
    );
    expect(events.filter((e) => e.type === "result")).toHaveLength(3);
    expect(events.at(-1)).toMatchObject({ type: "done", truncated: true });
  });
});

describe("workspace drafts", () => {
  it("records AI use and becomes a submission with a .docx manuscript", async () => {
    const draftId = await createDraft(user.id, {
      title: "Yuborish testi",
      articleType: "REVIEW",
      categoryId,
    });
    const words = Array.from({ length: 80 }, (_, i) => `so‘z${i}`).join(" ");
    await saveDraftBody(user.id, draftId, {
      body: doc([
        "1. Kirish",
        `${words}. Ushbu maqolada biz shuni ko‘rib chiqamizki usul baholanadi.`,
      ]),
    });
    const draft = await db.draft.findUniqueOrThrow({ where: { id: draftId } });
    expect(draft.wordCount).toBeGreaterThan(80);

    const { edits } = await suggestEdits(
      { userId: user.id, draftId, articleId: null, articleType: "REVIEW", categoryId },
      draft.text,
    );
    expect(edits.length).toBeGreaterThan(0);

    const res = await submitDraft({ id: user.id, profile: null }, draftId);
    expect("articleId" in res).toBe(true);
    if (!("articleId" in res)) return;
    articles.push(res.articleId);
    const article = await db.article.findUniqueOrThrow({
      where: { id: res.articleId },
      include: { versions: true },
    });
    expect(article).toMatchObject({ titleUz: "Yuborish testi", type: "REVIEW", status: "DRAFT" });
    expect(article.aiFeaturesUsed).toContain("edit");
    expect(article.versions[0]?.docxUrl).toMatch(/\.docx$/);

    // Someone else's draft is not reachable.
    await expect(saveDraftBody("other-user", draftId, { title: "x" })).rejects.toThrow();
  });
});
