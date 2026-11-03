import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { buildEditorBrief, editorBriefJob, latestBrief } from "@/lib/editorial/assistant";
import { uploadManuscript } from "@/lib/submission/service";
import { makeDocx, sampleManuscript } from "../fixtures/docx";

process.env.AI_MODE = "mock";

let articleId = "";

beforeAll(async () => {
  const u = await db.user.upsert({
    where: { phone: "+998990000078" },
    update: {},
    create: { phone: "+998990000078", name: "Brief muallif", email: "brief@example.com" },
  });
  const profile = await db.authorProfile.upsert({
    where: { slug: "brief-muallif" },
    update: { userId: u.id },
    create: { slug: "brief-muallif", fullName: "Brief Muallif", userId: u.id },
  });
  const category = await db.category.findFirstOrThrow();
  const article = await db.article.create({
    data: {
      slug: `qoralama-brief-${Date.now()}`,
      titleUz: `Muharrir yordamchisi testi ${Date.now()}`,
      abstractUz: "Qisqa annotatsiya",
      keywords: ["bir", "ikki"],
      categoryId: category.id,
      status: "UNDER_REVIEW",
      submitterId: u.id,
      authors: { create: [{ order: 0, authorProfileId: profile.id, isCorresponding: true }] },
    },
  });
  articleId = article.id;
  await db.article.update({ where: { id: articleId }, data: { status: "AWAITING_PAYMENT" } });
  const res = await uploadManuscript({ ...u, profile }, articleId, {
    name: "v1.docx",
    size: 1,
    buffer: await makeDocx(sampleManuscript(600, 3)),
  });
  expect(res.ok).toBe(true);
});

afterAll(async () => {
  await db.aiCheck.deleteMany({ where: { articleId } });
  await db.article.deleteMany({ where: { id: articleId } });
  await db.$disconnect();
});

describe("Muharrir yordamchisi", () => {
  it("checks the manuscript, ranks reviewers and stores the brief", async () => {
    const brief = await buildEditorBrief(articleId);
    expect(brief).not.toBeNull();
    if (!brief) return;
    const byKey = Object.fromEntries(brief.checks.map((c) => [c.key, c.ok]));
    // 600 words, 3 references, a short abstract, 2 keywords, no English title.
    expect(byKey).toMatchObject({
      words: false,
      references: false,
      abstract: false,
      keywords: false,
      titleEn: false,
    });
    expect(brief.warnings).toBeGreaterThanOrEqual(5);
    // Without an API key there is no AI part, and the panel says why.
    expect(brief.ai).toBeNull();
    expect(brief.aiNote).toBe("mock");
    // Seeded reviewers are suggested; the author never is.
    expect(brief.reviewers.length).toBeGreaterThan(0);
    expect(brief.reviewers.some((r) => r.name === "Brief Muallif")).toBe(false);

    const stored = await latestBrief(articleId);
    expect(stored?.version).toBe(brief.version);
    expect(stored?.checks).toHaveLength(brief.checks.length);
  });

  it("notifies the editors without failing when email is not connected", async () => {
    await expect(editorBriefJob(articleId)).resolves.toBeUndefined();
  });
});
