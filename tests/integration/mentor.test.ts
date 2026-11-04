import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDraft } from "@/lib/ai/drafts";
import { mentorHistory, mentorMessagesToday, mentorTurn } from "@/lib/ai/mentor";
import { db } from "@/lib/db";

process.env.AI_MODE = "mock";

const PHONE = "+998990000078";
let userId = "";
let draftId = "";

beforeAll(async () => {
  const u = await db.user.upsert({
    where: { phone: PHONE },
    update: {},
    create: { phone: PHONE, name: "Mentor test" },
  });
  userId = u.id;
  const categoryId = (await db.category.findFirstOrThrow()).id;
  draftId = await createDraft(userId, {
    title: "Ustoz sinovi",
    articleType: "RESEARCH",
    categoryId,
  });
});

afterAll(async () => {
  await db.draft.deleteMany({ where: { userId } });
});

describe("Xorazmiy Ustoz", () => {
  const ctx = () => ({
    userId,
    draftId,
    articleId: null,
    articleType: "RESEARCH" as const,
    categoryId: null,
    lang: "uz" as const,
  });

  it("stores the chat in order and keeps the stage", async () => {
    const draft = await db.draft.findUniqueOrThrow({ where: { id: draftId } });
    const first = await mentorTurn(
      ctx(),
      { ...draft, text: "" },
      "Mavzuim: talabalar va ijodkorlik",
    );
    expect(first.stage).toBe(1);
    const again = await db.draft.findUniqueOrThrow({ where: { id: draftId } });
    await mentorTurn(ctx(), { ...again, text: "" }, "Keyingi bosqichga o‘tamiz", 2);

    const history = await mentorHistory(draftId);
    expect(history.map((m) => m.role)).toEqual(["AUTHOR", "MENTOR", "AUTHOR", "MENTOR"]);
    expect(history[0]!.text).toBe("Mavzuim: talabalar va ijodkorlik");
    expect(history[3]!.stage).toBe(2);
    expect((await db.draft.findUniqueOrThrow({ where: { id: draftId } })).mentorStage).toBe(2);
    expect(await mentorMessagesToday(userId)).toBe(2);
  });

  it("deletes the chat with the draft", async () => {
    const other = await createDraft(userId, {
      title: "O‘chiriladi",
      articleType: "RESEARCH",
      categoryId: null,
    });
    const d = await db.draft.findUniqueOrThrow({ where: { id: other } });
    await mentorTurn({ ...ctx(), draftId: other }, { ...d, text: "" }, "Salom");
    await db.draft.delete({ where: { id: other } });
    expect(await db.mentorMessage.count({ where: { draftId: other } })).toBe(0);
  });
});
