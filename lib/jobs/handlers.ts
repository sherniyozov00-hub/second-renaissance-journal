import "server-only";
import { PDFDocument } from "pdf-lib";
import { db } from "@/lib/db";
import { getEmailProvider } from "@/lib/notify/email";
import { sendTelegram } from "@/lib/notify/telegram";
import { renderNotification } from "@/lib/notify/templates";
import { siteConfig } from "@/lib/site";
import { getStorage } from "@/lib/storage";
import type { JobData, QueueName } from "./index";

/** Where the worker reaches the web app to print pages (docker: http://app:3000). */
function appUrl() {
  return (process.env.APP_INTERNAL_URL || siteConfig.url).replace(/\/$/, "");
}

/** HTML → PDF with Chromium, so the PDF looks like the site (TZ 4). */
async function printToPdf(path: string): Promise<Buffer> {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const res = await page.goto(`${appUrl()}${path}`, { waitUntil: "networkidle" });
    if (!res?.ok()) throw new Error(`Print page ${path} returned ${res?.status()}`);
    await page.emulateMedia({ media: "print" });
    return Buffer.from(
      await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
      }),
    );
  } finally {
    await browser.close();
  }
}

/** Real text PDF with title/authors/keywords in the metadata (TZ 9.5). */
async function withMetadata(
  pdf: Buffer,
  meta: { title: string; authors: string[]; subject?: string; keywords?: string[] },
) {
  const doc = await PDFDocument.load(pdf);
  doc.setTitle(meta.title);
  doc.setAuthor(meta.authors.join(", "));
  if (meta.subject) doc.setSubject(meta.subject.slice(0, 500));
  if (meta.keywords?.length) doc.setKeywords(meta.keywords);
  doc.setCreator(siteConfig.name);
  doc.setProducer(siteConfig.name);
  return Buffer.from(await doc.save());
}

async function articlePdf({ articleId }: JobData["pdf.article"]) {
  const article = await db.article.findUnique({
    where: { id: articleId },
    include: {
      authors: { orderBy: { order: "asc" }, include: { authorProfile: true } },
      versions: { orderBy: { version: "desc" }, take: 1 },
    },
  });
  const version = article?.versions[0];
  if (!article || article.status !== "PUBLISHED" || !version) return;
  const raw = await printToPdf(`/maqola/${article.slug}/chop`);
  const pdf = await withMetadata(raw, {
    title: article.titleUz,
    authors: article.authors.map((a) => a.authorProfile?.fullName ?? a.name ?? ""),
    subject: article.abstractUz,
    keywords: article.keywords,
  });
  const key = `public/pdf/${article.slug}.pdf`;
  await getStorage().put(key, pdf, "application/pdf");
  await db.articleVersion.update({ where: { id: version.id }, data: { pdfUrl: key } });
}

async function certificatePdf({ certificateId }: JobData["pdf.certificate"]) {
  const cert = await db.certificate.findUnique({
    where: { id: certificateId },
    include: { article: true },
  });
  if (!cert) return;
  const raw = await printToPdf(`/sertifikat/${cert.id}?chop=1`);
  const pdf = await withMetadata(raw, {
    title: `Nashr sertifikati ${cert.id}`,
    authors: [cert.authorName],
  });
  const key = `certificates/${cert.id}.pdf`;
  await getStorage().put(key, pdf, "application/pdf");
  await db.certificate.update({ where: { id: cert.id }, data: { pdfUrl: key } });
}

async function notify({ userId, event }: JobData["notify"]) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.isBlocked) return;
  const { subject, text } = renderNotification(event, user.locale);
  const tasks: Promise<unknown>[] = [];
  if (user.email)
    tasks.push(getEmailProvider().then((e) => e.send({ to: user.email!, subject, text })));
  if (user.telegramChatId) tasks.push(sendTelegram(user.telegramChatId, `${subject}\n\n${text}`));
  const results = await Promise.allSettled(tasks);
  for (const r of results) if (r.status === "rejected") console.error("[notify]", r.reason);
}

/** "Yangi son" (TZ 14): every user who linked Telegram gets the new issue. */
async function issueAnnounce({ issueId }: JobData["issue.announce"]) {
  const issue = await db.issue.findUnique({
    where: { id: issueId },
    include: { _count: { select: { articles: { where: { status: "PUBLISHED" } } } } },
  });
  if (!issue || issue.status !== "PUBLISHED") return;
  const event = {
    kind: "issue" as const,
    year: issue.year,
    number: issue.number,
    count: issue._count.articles,
    url: `${siteConfig.url.replace(/\/$/, "")}/son/${issue.year}-${issue.number}`,
  };
  const users = await db.user.findMany({
    where: { telegramChatId: { not: null }, isBlocked: false },
    select: { telegramChatId: true, locale: true },
  });
  for (const u of users) {
    const { subject, text } = renderNotification(event, u.locale);
    // Sequential: Telegram allows about 30 messages a second per bot.
    await sendTelegram(u.telegramChatId!, `${subject}\n\n${text}`).catch((err) =>
      console.error("[issue.announce]", err),
    );
  }
}

export async function runJob<Q extends QueueName>(queue: Q, data: JobData[Q]) {
  switch (queue) {
    case "pdf.article":
      return articlePdf(data as JobData["pdf.article"]);
    case "pdf.certificate":
      return certificatePdf(data as JobData["pdf.certificate"]);
    case "notify":
      return notify(data as JobData["notify"]);
    case "editor.brief": {
      const { editorBriefJob } = await import("@/lib/editorial/assistant");
      return editorBriefJob((data as JobData["editor.brief"]).articleId);
    }
    case "issue.announce":
      return issueAnnounce(data as JobData["issue.announce"]);
  }
}
