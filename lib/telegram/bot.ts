import "server-only";
import type { ArticleStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getLatestArticles } from "@/lib/queries/articles";
import { parseFilters, searchArticles } from "@/lib/search/query";
import { siteConfig } from "@/lib/site";

/**
 * Telegram bot (TZ 14, stage 7). Replies to commands; notifications are sent
 * by the worker (lib/jobs). Kept free of HTTP so it can be tested directly.
 */

const STATUS: Record<ArticleStatus, string> = {
  DRAFT: "qoralama",
  AWAITING_PAYMENT: "to‘lov kutilmoqda",
  UNDER_REVIEW: "taqrizda",
  REVISION_REQUESTED: "tuzatish kerak",
  ACCEPTED: "qabul qilindi",
  PUBLISHED: "nashr qilindi",
  REJECTED: "rad etildi",
};

const url = (path: string) => `${siteConfig.url.replace(/\/$/, "")}${path}`;
const num = (n: number) => `#${String(n).padStart(4, "0")}`;

export const HELP = [
  "The Second Renaissance of Uzbekistan — ilmiy jurnal boti.",
  "",
  "/maqolalar — so‘nggi maqolalar",
  "/qidiruv <so‘z> — maqola qidirish",
  "/son — so‘nggi jurnal soni",
  "/darslar — Akademiya darslari",
  "/holat — maqolalaringiz holati (hisob ulangan bo‘lsa)",
  "/yordam — buyruqlar",
  "",
  "Hisobni ulash: saytdagi kabinet → “Telegram-botni ulang”.",
].join("\n");

async function linkAccount(chatId: string, token: string) {
  const user = await db.user.findUnique({ where: { telegramLinkToken: token } });
  if (!user) return "Havola eskirgan. Kabinetdan “Telegram-botni ulang” tugmasini qayta bosing.";
  await db.user.update({
    where: { id: user.id },
    data: { telegramChatId: chatId, telegramLinkToken: null },
  });
  return "Hisobingiz ulandi. Maqola holati o‘zgarsa, shu yerga xabar keladi.\n\n" + HELP;
}

async function latest() {
  const items = await getLatestArticles("newest", 5);
  if (!items.length) return "Hozircha nashr qilingan maqola yo‘q.";
  return [
    "So‘nggi maqolalar:",
    ...items.map((a, i) => `${i + 1}. ${a.titleUz}\n${url(`/maqola/${a.slug}`)}`),
  ].join("\n\n");
}

async function search(q: string) {
  if (q.length < 2) return "Qidiruv uchun so‘z yozing: /qidiruv paxta";
  const { items, total } = await searchArticles(parseFilters({ q }));
  if (!items.length) return `“${q}” bo‘yicha maqola topilmadi.`;
  return [
    `“${q}” bo‘yicha ${total} ta natija:`,
    ...items.slice(0, 5).map((a, i) => `${i + 1}. ${a.titleUz}\n${url(`/maqola/${a.slug}`)}`),
    total > 5 ? `Barchasi: ${url(`/maqolalar?q=${encodeURIComponent(q)}`)}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function issue() {
  const i = await db.issue.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: [{ year: "desc" }, { number: "desc" }],
    include: { _count: { select: { articles: { where: { status: "PUBLISHED" } } } } },
  });
  if (!i) return "Hozircha nashr qilingan son yo‘q.";
  return `${i.year}-yil, ${i.number}-son — ${i._count.articles} ta maqola.\n${url(`/son/${i.year}-${i.number}`)}`;
}

async function lessons() {
  const list = await db.lesson.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
  });
  return [
    "Akademiya darslari (bepul):",
    ...list.map((l, i) => `${i + 1}. ${l.title} — ${url(`/akademiya/${l.slug}`)}`),
  ].join("\n");
}

async function status(chatId: string) {
  const user = await db.user.findFirst({ where: { telegramChatId: chatId } });
  if (!user) return "Hisob ulanmagan. Saytdagi kabinet → “Telegram-botni ulang”.";
  const articles = await db.article.findMany({
    where: { submitterId: user.id, status: { not: "DRAFT" } },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: { number: true, titleUz: true, status: true },
  });
  if (!articles.length) return `Hali yuborilgan maqola yo‘q. Yuborish: ${url("/kabinet/yuborish")}`;
  return [
    "Maqolalaringiz:",
    ...articles.map((a) => `${num(a.number)} «${a.titleUz}» — ${STATUS[a.status]}`),
  ].join("\n");
}

/** The reply to one incoming message. */
export async function botReply(chatId: string, text: string): Promise<string> {
  const t = text.trim();
  const [cmd = "", ...rest] = t.split(/\s+/);
  const arg = rest.join(" ").slice(0, 200);
  switch (cmd.toLowerCase().replace(/@\w+$/, "")) {
    case "/start":
      return /^[a-f0-9]{32}$/.test(arg) ? linkAccount(chatId, arg) : HELP;
    case "/yordam":
    case "/help":
      return HELP;
    case "/maqolalar":
      return latest();
    case "/qidiruv":
    case "/search":
      return search(arg);
    case "/son":
      return issue();
    case "/darslar":
      return lessons();
    case "/holat":
      return status(chatId);
    default:
      // Plain text is treated as a search query.
      return t.startsWith("/") ? HELP : search(t.slice(0, 200));
  }
}
