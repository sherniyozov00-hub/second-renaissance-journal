import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createPracticeDraft,
  lessonProgress,
  sampleArticles,
  setLessonDone,
} from "@/lib/academy/service";
import { db } from "@/lib/db";
import { botLang, botReply, HELP } from "@/lib/telegram/bot";

const PHONE = "+998990000066";
const CHAT = "777000666";
let userId = "";

beforeAll(async () => {
  const u = await db.user.upsert({
    where: { phone: PHONE },
    update: { telegramChatId: null, telegramLinkToken: "a".repeat(32) },
    create: { phone: PHONE, name: "Academy test", telegramLinkToken: "a".repeat(32) },
  });
  userId = u.id;
  await db.lessonProgress.deleteMany({ where: { userId } });
});

afterAll(async () => {
  await db.draft.deleteMany({ where: { userId } });
  await db.lessonProgress.deleteMany({ where: { userId } });
  await db.user.update({ where: { id: userId }, data: { telegramChatId: null } });
  await db.$disconnect();
});

describe("Akademiya (TZ 15)", () => {
  it("opens the seed lessons and tracks progress", async () => {
    const lessons = await db.lesson.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
    });
    expect(lessons.length).toBeGreaterThanOrEqual(6);
    expect(lessons.every((l) => l.example && l.exercise)).toBe(true);

    expect((await lessonProgress(userId)).finished).toBe(0);
    expect(await setLessonDone(userId, lessons[0]!.slug, true)).toBe(true);
    await setLessonDone(userId, lessons[0]!.slug, true); // idempotent
    await setLessonDone(userId, lessons[1]!.slug, true);
    let p = await lessonProgress(userId);
    expect(p.finished).toBe(2);
    expect(p.percent).toBe(Math.round((2 / p.total) * 100));
    await setLessonDone(userId, lessons[1]!.slug, false);
    p = await lessonProgress(userId);
    expect(p.finished).toBe(1);
    expect(await setLessonDone(userId, "no-such-lesson", true)).toBe(false);
  });

  it("starts a practice draft with the lesson's exercise", async () => {
    const lesson = await db.lesson.findFirstOrThrow({ where: { isPublished: true } });
    const id = await createPracticeDraft(userId, lesson.slug);
    const draft = await db.draft.findUniqueOrThrow({ where: { id: id! } });
    expect(draft.title).toBe(`Mashq: ${lesson.title}`);
    const ru = await createPracticeDraft(userId, lesson.slug, "ru");
    expect((await db.draft.findUniqueOrThrow({ where: { id: ru! } })).title).toMatch(
      /^Упражнение: /,
    );
    expect(JSON.stringify(draft.body)).toContain(lesson.exercise!);
  });

  it("lists sample articles by field", async () => {
    const samples = await sampleArticles();
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.every((c) => c.articles.length > 0 && c.articles.length <= 2)).toBe(true);
  });
});

describe("Telegram bot", () => {
  it("links the account with the deep-link token and shows the user's articles", async () => {
    expect(await botReply(CHAT, "/holat")).toContain("Hisob ulanmagan");
    expect(await botReply(CHAT, `/start ${"a".repeat(32)}`)).toContain("Hisobingiz ulandi");
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.telegramChatId).toBe(CHAT);
    expect(user.telegramLinkToken).toBeNull();
    expect(await botReply(CHAT, "/holat")).toContain("Hali yuborilgan maqola yo‘q");
  });

  it("speaks the Telegram app language to strangers", async () => {
    expect(botLang("ru-RU")).toBe("ru");
    expect(botLang("en")).toBe("en");
    expect(botLang("kk")).toBe("ru");
    expect(botLang(undefined)).toBe("uz");
    expect(await botReply("123000999", "/maqolalar", "ru")).toMatch(/^Последние статьи:/);
    expect(await botReply("123000999", "/darslar", "en")).toContain("Article structure: IMRAD");
    expect(await botReply("123000999", "/darslar", "en")).toContain("/en/akademiya/");
    expect(await botReply("123000999", "/holat", "ru")).toContain("Аккаунт не привязан");
  });

  it("answers the public commands", async () => {
    expect(await botReply(CHAT, "/start")).toBe(HELP);
    expect(await botReply(CHAT, "/nomalum")).toBe(HELP);
    const latest = await botReply(CHAT, "/maqolalar");
    expect(latest).toMatch(/^So‘nggi maqolalar:/);
    expect(latest).toContain("/maqola/");
    expect(await botReply(CHAT, "/qidiruv paxta")).toMatch(/“paxta” bo‘yicha \d+ ta natija/);
    expect(await botReply(CHAT, "/qidiruv")).toContain("Qidiruv uchun so‘z yozing");
    expect(await botReply(CHAT, "/son")).toMatch(/\d{4}-yil, \d+-son/);
    expect(await botReply(CHAT, "/darslar")).toContain("/akademiya/");
    // Plain text is a search.
    expect(await botReply(CHAT, "bug‘doy")).toMatch(/“bug‘doy” bo‘yicha|topilmadi/);
  });
});
