import "server-only";
import { premiumUntil, premiumWorksUsed } from "@/lib/ai/quota";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings/get";

type Owner = { id: string; profile: { id: string } | null };

/** Articles the user submitted or co-authors (Ekran 7, "Mening maqolalarim"). */
export function getMyArticles(user: Owner) {
  return db.article.findMany({
    where: {
      OR: [
        { submitterId: user.id },
        ...(user.profile ? [{ authors: { some: { authorProfileId: user.profile.id } } }] : []),
      ],
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      category: { select: { slug: true, name: true } },
      issue: { select: { year: true, number: true } },
      editorComments: {
        where: { visibleToAuthor: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      reviews: { select: { dueAt: true }, orderBy: { dueAt: "asc" }, take: 1 },
      payments: { select: { status: true }, orderBy: { createdAt: "desc" }, take: 1 },
      certificates: { select: { id: true, articleAuthor: { select: { authorProfileId: true } } } },
    },
  });
}

export type MyArticle = Awaited<ReturnType<typeof getMyArticles>>[number];

/** Certificates issued to the user's author profile. */
export function getMyCertificates(user: Owner) {
  if (!user.profile) return Promise.resolve([]);
  return db.certificate.findMany({
    where: { articleAuthor: { authorProfileId: user.profile.id } },
    orderBy: { issuedAt: "desc" },
    include: {
      article: {
        select: { slug: true, titleUz: true, issue: { select: { year: true, number: true } } },
      },
    },
  });
}

export function getMyPayments(userId: string) {
  return db.payment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { article: { select: { slug: true, titleUz: true, number: true } } },
  });
}

/** Monthly Xorazmiy AI quota (TZ 10.4): per-user override or the Settings default. */
export type AiQuota = {
  limit: number;
  used: number;
  left: number;
  credits: number;
  /** Premium is active until this date (ISO), else null. */
  premiumUntil: string | null;
  premiumWorks: number;
  premiumArticles: number;
};

export async function getAiQuota(user: {
  id: string;
  aiQuota: number | null;
  aiCredits?: number;
}): Promise<AiQuota> {
  const settings = await getSettings();
  const limit = user.aiQuota ?? (Number(settings["ai.freeMonthlyChecks"]) || 0);
  const period = new Date().toISOString().slice(0, 7);
  const [usage, until, works] = await Promise.all([
    db.aiUsage.findUnique({ where: { userId_period: { userId: user.id, period } } }),
    premiumUntil(user.id),
    premiumWorksUsed(user.id),
  ]);
  const used = usage?.checksUsed ?? 0;
  // Checks bought earlier as packages are spent after the free ones.
  const credits = user.aiCredits ?? 0;
  return {
    limit: limit + credits,
    used,
    left: Math.max(0, limit - used) + credits,
    credits,
    premiumUntil: until?.toISOString() ?? null,
    premiumWorks: works,
    premiumArticles: Number(settings["ai.premiumArticles"]) || 4,
  };
}
