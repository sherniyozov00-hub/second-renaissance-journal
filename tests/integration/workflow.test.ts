import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getBlindReview, submitReview } from "@/lib/editorial/review";
import {
  acceptArticle,
  assignReviewer,
  publishArticle,
  rejectArticle,
  requestRevision,
  setPublicationDetails,
  WorkflowError,
} from "@/lib/editorial/workflow";
import { markPaid } from "@/lib/payments/service";
import { uploadManuscript } from "@/lib/submission/service";
import { makeDocx, sampleManuscript } from "../fixtures/docx";

// Jobs run inline; PDF printing has no app to reach here and is skipped quietly.
process.env.JOBS_MODE = "inline";
process.env.APP_INTERNAL_URL = "http://127.0.0.1:9";

const created: string[] = [];
let editor: { id: string; roles: ("AUTHOR" | "REVIEWER" | "EDITOR" | "ADMIN")[] };
let reviewer: typeof editor;
let author: {
  id: string;
  roles: typeof editor.roles;
  profile: {
    id: string;
    fullName: string;
    affiliation: string | null;
    orcid: string | null;
  } | null;
};

beforeAll(async () => {
  editor = await db.user.findUniqueOrThrow({ where: { email: "editor@example.com" } });
  reviewer = await db.user.findUniqueOrThrow({ where: { email: "reviewer@example.com" } });
  const u = await db.user.upsert({
    where: { phone: "+998990000077" },
    update: {},
    create: { phone: "+998990000077", name: "Workflow muallif", email: "workflow@example.com" },
  });
  const profile = await db.authorProfile.upsert({
    where: { slug: "workflow-muallif" },
    update: { userId: u.id },
    create: {
      slug: "workflow-muallif",
      fullName: "Workflow Muallif",
      userId: u.id,
      affiliation: "Test OTM",
    },
  });
  author = { ...u, profile };
});

afterAll(async () => {
  for (const id of created) {
    await db.payment.deleteMany({ where: { articleId: id } });
    await db.auditLog.deleteMany({ where: { entityId: id } });
  }
  await db.article.deleteMany({ where: { id: { in: created } } });
  await db.$disconnect();
});

async function submittedArticle() {
  const category = await db.category.findFirstOrThrow();
  const article = await db.article.create({
    data: {
      slug: `qoralama-wf-${Date.now()}`,
      titleUz: `Ish oqimi testi ${Date.now()}: bug‘doy hosildorligi`,
      titleEn: "Workflow test",
      abstractUz: "Annotatsiya",
      categoryId: category.id,
      status: "AWAITING_PAYMENT",
      submitterId: author.id,
      authors: {
        create: [
          { order: 0, authorProfileId: author.profile!.id, isCorresponding: true },
          { order: 1, name: "Hammuallif Ikkinchi", affiliation: "Boshqa OTM" },
        ],
      },
    },
  });
  created.push(article.id);
  await uploadManuscript(author, article.id, {
    name: "v1.docx",
    size: 1,
    buffer: await makeDocx(sampleManuscript(600, 3)),
  }).catch(() => undefined);
  const payment = await db.payment.create({
    data: { articleId: article.id, userId: author.id, provider: "CLICK", amount: 1000 },
  });
  await markPaid(payment.id, `sandbox-${payment.id}`);
  return article;
}

describe("editorial workflow — submission to publication (TZ 7, stage 5 acceptance)", () => {
  it("runs the whole life cycle", async () => {
    const article = await submittedArticle();
    expect((await db.article.findUniqueOrThrow({ where: { id: article.id } })).status).toBe(
      "UNDER_REVIEW",
    );

    // Editor assigns a reviewer; the reviewer sees no author data.
    await assignReviewer(editor, article.id, reviewer.id, new Date(Date.now() + 7 * 864e5));
    const review = await db.review.findFirstOrThrow({ where: { articleId: article.id } });
    const blind = await getBlindReview(reviewer, review.id);
    expect(JSON.stringify(blind)).not.toMatch(/Workflow Muallif|Hammuallif|Test OTM|990000077/);
    await submitReview(reviewer, review.id, {
      scores: { scoreRelevance: 5, scoreMethodology: 4, scoreResults: 4, scoreLanguage: 3 },
      comment: "Usullar bo‘limi aniq, lekin natijalarni jadvalda ko‘rsatish kerak.",
      recommendation: "MINOR_REVISION",
    });

    // Revision round: new version sends it back to review.
    await requestRevision(editor, article.id, "Jadvalni qo‘shing va manbalarni ko‘paytiring.");
    expect((await db.article.findUniqueOrThrow({ where: { id: article.id } })).status).toBe(
      "REVISION_REQUESTED",
    );
    const upload = await uploadManuscript(author, article.id, {
      name: "v2.docx",
      size: 1,
      buffer: await makeDocx(sampleManuscript(800, 4)),
    });
    expect(upload.ok).toBe(true);
    expect((await db.article.findUniqueOrThrow({ where: { id: article.id } })).status).toBe(
      "UNDER_REVIEW",
    );

    await acceptArticle(editor, article.id);
    await expect(publishArticle(editor, article.id)).rejects.toMatchObject({ code: "invalid" });

    const issue = await db.issue.findFirstOrThrow({ where: { year: 2026, number: 1 } });
    await setPublicationDetails(editor, article.id, {
      issueId: issue.id,
      pageStart: 120,
      pageEnd: 128,
      doi: "10.12345/srj.2026.1.120",
    });
    const { slug } = await publishArticle(editor, article.id);

    const published = await db.article.findUniqueOrThrow({
      where: { id: article.id },
      include: { certificates: true, versions: true },
    });
    expect(published.status).toBe("PUBLISHED");
    expect(slug).toMatch(/^ish-oqimi-testi-\d+-bugdoy-hosildorligi$/);
    expect(published.publishedAt).not.toBeNull();
    expect(published.certificates).toHaveLength(2);
    expect(published.versions.length).toBeGreaterThanOrEqual(2);

    const actions = (await db.auditLog.findMany({ where: { entityId: article.id } })).map(
      (l) => l.action,
    );
    expect(actions).toEqual(
      expect.arrayContaining([
        "status_change",
        "reviewer_assigned",
        "review_submitted",
        "publication_details",
      ]),
    );
  });

  it("refuses invalid transitions and non-editors", async () => {
    const article = await submittedArticle();
    await expect(publishArticle(editor, article.id)).rejects.toMatchObject({ code: "bad_status" });
    await expect(acceptArticle(author, article.id)).rejects.toBeInstanceOf(WorkflowError);
    await expect(rejectArticle(editor, article.id, "")).rejects.toMatchObject({ code: "invalid" });
    await rejectArticle(editor, article.id, "Mavzu jurnal yo‘nalishiga mos emas.");
    await expect(acceptArticle(editor, article.id)).rejects.toMatchObject({ code: "bad_status" });
  });

  it("does not let an author review their own article", async () => {
    const article = await submittedArticle();
    await db.user.update({ where: { id: author.id }, data: { roles: ["AUTHOR", "REVIEWER"] } });
    await expect(assignReviewer(editor, article.id, author.id, new Date())).rejects.toMatchObject({
      code: "invalid",
    });
    await db.user.update({ where: { id: author.id }, data: { roles: ["AUTHOR"] } });
  });
});
