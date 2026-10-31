import "server-only";
import type { ArticleStatus } from "@/generated/prisma/client";
import { localizeLesson } from "@/lib/academy/l10n";
import { db } from "@/lib/db";
import { articleTitle } from "@/lib/l10n";
import { getLatestArticles } from "@/lib/queries/articles";
import { parseFilters, searchArticles } from "@/lib/search/query";
import { siteConfig } from "@/lib/site";

/**
 * Telegram bot (TZ 14, stage 7) in Uzbek, Russian and English: a linked user
 * gets their own language, others the language of their Telegram app.
 * Notifications are sent by the worker (lib/jobs). No HTTP here — testable.
 */

export type BotLang = "uz" | "ru" | "en";

const STATUS: Record<BotLang, Record<ArticleStatus, string>> = {
  uz: {
    DRAFT: "qoralama",
    AWAITING_PAYMENT: "to‘lov kutilmoqda",
    UNDER_REVIEW: "taqrizda",
    REVISION_REQUESTED: "tuzatish kerak",
    ACCEPTED: "qabul qilindi",
    PUBLISHED: "nashr qilindi",
    REJECTED: "rad etildi",
  },
  ru: {
    DRAFT: "черновик",
    AWAITING_PAYMENT: "ожидает оплаты",
    UNDER_REVIEW: "на рецензии",
    REVISION_REQUESTED: "нужна доработка",
    ACCEPTED: "принята",
    PUBLISHED: "опубликована",
    REJECTED: "отклонена",
  },
  en: {
    DRAFT: "draft",
    AWAITING_PAYMENT: "awaiting payment",
    UNDER_REVIEW: "under review",
    REVISION_REQUESTED: "revision requested",
    ACCEPTED: "accepted",
    PUBLISHED: "published",
    REJECTED: "rejected",
  },
};

const T = {
  uz: {
    help: [
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
    ].join("\n"),
    expired: "Havola eskirgan. Kabinetdan “Telegram-botni ulang” tugmasini qayta bosing.",
    linked: "Hisobingiz ulandi. Maqola holati o‘zgarsa, shu yerga xabar keladi.",
    noArticles: "Hozircha nashr qilingan maqola yo‘q.",
    latest: "So‘nggi maqolalar:",
    askQuery: "Qidiruv uchun so‘z yozing: /qidiruv paxta",
    notFound: (q: string) => `“${q}” bo‘yicha maqola topilmadi.`,
    found: (q: string, n: number) => `“${q}” bo‘yicha ${n} ta natija:`,
    all: "Barchasi",
    noIssue: "Hozircha nashr qilingan son yo‘q.",
    issue: (y: number, n: number, c: number) => `${y}-yil, ${n}-son — ${c} ta maqola.`,
    lessons: "Akademiya darslari (bepul):",
    notLinked: "Hisob ulanmagan. Saytdagi kabinet → “Telegram-botni ulang”.",
    noneSubmitted: "Hali yuborilgan maqola yo‘q. Yuborish:",
    mine: "Maqolalaringiz:",
  },
  ru: {
    help: [
      "The Second Renaissance of Uzbekistan — бот научного журнала.",
      "",
      "/maqolalar — последние статьи",
      "/qidiruv <слово> — поиск статей",
      "/son — последний выпуск журнала",
      "/darslar — уроки Академии",
      "/holat — статус ваших статей (если аккаунт привязан)",
      "/yordam — команды",
      "",
      "Привязать аккаунт: кабинет на сайте → «Подключить Telegram-бот».",
    ].join("\n"),
    expired: "Ссылка устарела. Нажмите «Подключить Telegram-бот» в кабинете ещё раз.",
    linked: "Аккаунт привязан. Когда статус статьи изменится, сообщение придёт сюда.",
    noArticles: "Опубликованных статей пока нет.",
    latest: "Последние статьи:",
    askQuery: "Напишите слово для поиска: /qidiruv хлопок",
    notFound: (q: string) => `По запросу «${q}» статьи не найдены.`,
    found: (q: string, n: number) => `По запросу «${q}» найдено: ${n}`,
    all: "Все результаты",
    noIssue: "Опубликованных выпусков пока нет.",
    issue: (y: number, n: number, c: number) => `${y} год, выпуск № ${n} — статей: ${c}.`,
    lessons: "Уроки Академии (бесплатно):",
    notLinked: "Аккаунт не привязан. Кабинет на сайте → «Подключить Telegram-бот».",
    noneSubmitted: "Вы ещё не отправляли статьи. Отправить:",
    mine: "Ваши статьи:",
  },
  en: {
    help: [
      "The Second Renaissance of Uzbekistan — the journal’s bot.",
      "",
      "/maqolalar — latest articles",
      "/qidiruv <word> — search articles",
      "/son — latest issue",
      "/darslar — Academy lessons",
      "/holat — status of your articles (when your account is linked)",
      "/yordam — commands",
      "",
      "Link your account: the cabinet on the website → “Connect the Telegram bot”.",
    ].join("\n"),
    expired: "The link has expired. Press “Connect the Telegram bot” in the cabinet again.",
    linked: "Your account is linked. You will get a message here when an article’s status changes.",
    noArticles: "No published articles yet.",
    latest: "Latest articles:",
    askQuery: "Type a word to search: /qidiruv cotton",
    notFound: (q: string) => `No articles found for “${q}”.`,
    found: (q: string, n: number) => `${n} results for “${q}”:`,
    all: "All results",
    noIssue: "No published issues yet.",
    issue: (y: number, n: number, c: number) => `${y}, issue ${n} — ${c} articles.`,
    lessons: "Academy lessons (free):",
    notLinked:
      "Your account is not linked. The cabinet on the website → “Connect the Telegram bot”.",
    noneSubmitted: "You have not submitted an article yet. Submit:",
    mine: "Your articles:",
  },
} as const;

export const HELP = T.uz.help;

const prefix = (lang: BotLang) => (lang === "uz" ? "" : `/${lang}`);
const url = (lang: BotLang, path: string) =>
  `${siteConfig.url.replace(/\/$/, "")}${prefix(lang)}${path === "/" && lang !== "uz" ? "" : path}`;
const num = (n: number) => `#${String(n).padStart(4, "0")}`;

/** Telegram app language → bot language. */
export function botLang(code: string | null | undefined): BotLang {
  const c = (code ?? "").toLowerCase();
  if (c.startsWith("ru")) return "ru";
  if (c.startsWith("uz")) return "uz";
  if (c.startsWith("en")) return "en";
  // Kazakh, Kyrgyz, Tajik… users usually read Russian; everyone else gets Uzbek.
  return /^(kk|ky|tg|be|uk)/.test(c) ? "ru" : "uz";
}

async function linkAccount(chatId: string, token: string, lang: BotLang) {
  const user = await db.user.findUnique({ where: { telegramLinkToken: token } });
  if (!user) return T[lang].expired;
  await db.user.update({
    where: { id: user.id },
    data: { telegramChatId: chatId, telegramLinkToken: null },
  });
  const l = user.locale as BotLang;
  return `${T[l].linked}\n\n${T[l].help}`;
}

async function latest(lang: BotLang) {
  const items = await getLatestArticles("newest", 5);
  if (!items.length) return T[lang].noArticles;
  return [
    T[lang].latest,
    ...items.map((a, i) => `${i + 1}. ${articleTitle(a, lang)}\n${url(lang, `/maqola/${a.slug}`)}`),
  ].join("\n\n");
}

async function search(q: string, lang: BotLang) {
  if (q.length < 2) return T[lang].askQuery;
  const { items, total } = await searchArticles(parseFilters({ q }));
  if (!items.length) return T[lang].notFound(q);
  return [
    T[lang].found(q, total),
    ...items
      .slice(0, 5)
      .map((a, i) => `${i + 1}. ${articleTitle(a, lang)}\n${url(lang, `/maqola/${a.slug}`)}`),
    total > 5 ? `${T[lang].all}: ${url(lang, `/maqolalar?q=${encodeURIComponent(q)}`)}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function issue(lang: BotLang) {
  const i = await db.issue.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: [{ year: "desc" }, { number: "desc" }],
    include: { _count: { select: { articles: { where: { status: "PUBLISHED" } } } } },
  });
  if (!i) return T[lang].noIssue;
  return `${T[lang].issue(i.year, i.number, i._count.articles)}\n${url(lang, `/son/${i.year}-${i.number}`)}`;
}

async function lessons(lang: BotLang) {
  const list = await db.lesson.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
  });
  return [
    T[lang].lessons,
    ...list.map(
      (l, i) => `${i + 1}. ${localizeLesson(l, lang).title} — ${url(lang, `/akademiya/${l.slug}`)}`,
    ),
  ].join("\n");
}

async function status(lang: BotLang, userId: string | null) {
  if (!userId) return T[lang].notLinked;
  const articles = await db.article.findMany({
    where: { submitterId: userId, status: { not: "DRAFT" } },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: { number: true, titleUz: true, titleRu: true, titleEn: true, status: true },
  });
  if (!articles.length) return `${T[lang].noneSubmitted} ${url(lang, "/kabinet/yuborish")}`;
  return [
    T[lang].mine,
    ...articles.map(
      (a) => `${num(a.number)} «${articleTitle(a, lang)}» — ${STATUS[lang][a.status]}`,
    ),
  ].join("\n");
}

/**
 * The reply to one incoming message. `telegramLang` is the sender's Telegram
 * app language (message.from.language_code); a linked user's own choice wins.
 */
export async function botReply(
  chatId: string,
  text: string,
  telegramLang?: string | null,
): Promise<string> {
  const user = await db.user.findFirst({
    where: { telegramChatId: chatId },
    select: { id: true, locale: true },
  });
  const lang: BotLang = user ? (user.locale as BotLang) : botLang(telegramLang);
  const t = text.trim();
  const [cmd = "", ...rest] = t.split(/\s+/);
  const arg = rest.join(" ").slice(0, 200);
  switch (cmd.toLowerCase().replace(/@\w+$/, "")) {
    case "/start":
      return /^[a-f0-9]{32}$/.test(arg) ? linkAccount(chatId, arg, lang) : T[lang].help;
    case "/yordam":
    case "/help":
      return T[lang].help;
    case "/maqolalar":
    case "/articles":
      return latest(lang);
    case "/qidiruv":
    case "/search":
      return search(arg, lang);
    case "/son":
    case "/issue":
      return issue(lang);
    case "/darslar":
    case "/lessons":
      return lessons(lang);
    case "/holat":
    case "/status":
      return status(lang, user?.id ?? null);
    default:
      // Plain text is treated as a search query.
      return t.startsWith("/") ? T[lang].help : search(t.slice(0, 200), lang);
  }
}
