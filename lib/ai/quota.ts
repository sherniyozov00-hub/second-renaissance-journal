import "server-only";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings/get";
import type { AiErrorCode } from "./schemas";

/**
 * Who may use Xorazmiy AI, and how much (cost control). All numbers come from
 * Admin → Sozlamalar.
 * - Guest: a small daily trial, keyed by IP + device cookie.
 * - Author without Premium: a small monthly trial (ai.freeMonthlyChecks), then
 *   older purchased credits if any; then "quota" → the cabinet offers Premium.
 * - Premium (39 990 so‘m a month): AI on up to ai.premiumArticles drafts or
 *   articles in 30 days, not counted per check; a fifth one → "premium_limit".
 * - An article whose publication is paid: its AI work is always included.
 */

export type AiActor =
  { kind: "user"; id: string; aiQuota: number | null } | { kind: "guest"; key: string };

const num = (v: unknown, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : d;
};

export async function aiLimits() {
  const s = await getSettings();
  return {
    guestDaily: num(s["ai.guestDailyChecks"], 1),
    guestMaxChars: num(s["ai.guestMaxChars"], 1500),
    authorMonthly: num(s["ai.freeMonthlyChecks"], 2),
    premiumArticles: num(s["ai.premiumArticles"], 4) || 4,
    authorMaxChars: num(s["ai.authorMaxChars"], 60000),
    maxClaims: num(s["ai.maxClaimsPerCheck"], 20) || 20,
    perMinute: num(s["ai.requestsPerMinute"], 8) || 8,
  };
}

/** Requests per minute, per user or guest. In memory: one app instance (TZ 18 deploy). */
const hits = new Map<string, number[]>();
export function rateLimited(key: string, perMinute: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= perMinute) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < 60_000)) hits.delete(k);
  }
  return false;
}

export function actorKey(a: AiActor) {
  return a.kind === "user" ? `u:${a.id}` : a.key;
}

/** Article the author has paid publication for: its AI work is included (TZ 10.4). */
export async function articleIsPaid(articleId: string | null | undefined) {
  if (!articleId) return false;
  const paid = await db.payment.findFirst({
    where: { articleId, purpose: "PUBLICATION", status: "PAID" },
    select: { id: true },
  });
  return Boolean(paid);
}

type Consumed = { ok: true; refund: () => Promise<void> } | { ok: false; code: AiErrorCode };

/**
 * Takes one check. Atomic (conditional UPDATE), so parallel requests cannot
 * go over the limit. `refund` gives it back when the AI call fails.
 */
/** Premium is active now: its end, else null. */
export async function premiumUntil(userId: string): Promise<Date | null> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { premiumUntil: true } });
  return u?.premiumUntil && u.premiumUntil > new Date() ? u.premiumUntil : null;
}

/** Drafts/articles a Premium user has started with AI in the last 30 days. */
export async function premiumWorksUsed(userId: string): Promise<number> {
  return db.premiumWork.count({
    where: { userId, firstUsedAt: { gt: new Date(Date.now() - 30 * 864e5) } },
  });
}

/**
 * Lets a Premium user work on `workKey`: always if it is already one of the
 * last 30 days' works, otherwise only while fewer than `limit` are in use.
 */
async function claimPremiumWork(userId: string, workKey: string, limit: number) {
  const since = new Date(Date.now() - 30 * 864e5);
  const existing = await db.premiumWork.findUnique({
    where: { userId_key: { userId, key: workKey } },
  });
  if (existing && existing.firstUsedAt > since) return true;
  return db.$transaction(async (tx) => {
    // Serialise per user so two new drafts at once cannot both take the last slot.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    const used = await tx.premiumWork.count({ where: { userId, firstUsedAt: { gt: since } } });
    if (used >= limit) return false;
    await tx.premiumWork.upsert({
      where: { userId_key: { userId, key: workKey } },
      update: { firstUsedAt: new Date() },
      create: { userId, key: workKey },
    });
    return true;
  });
}

export async function consumeCheck(
  actor: AiActor,
  opts: { chars: number; paidArticleId?: string | null; workKey?: string | null },
): Promise<Consumed> {
  const limits = await aiLimits();
  if (rateLimited(actorKey(actor), limits.perMinute)) return { ok: false, code: "rate_limit" };

  if (actor.kind === "guest") {
    if (opts.chars > limits.guestMaxChars) return { ok: false, code: "too_long" };
    const period = new Date().toISOString().slice(0, 10);
    const row = await db.aiUsage.upsert({
      where: { guestKey_period: { guestKey: actor.key, period } },
      create: { guestKey: actor.key, period },
      update: {},
    });
    const taken = await db.aiUsage.updateMany({
      where: { id: row.id, checksUsed: { lt: limits.guestDaily } },
      data: { checksUsed: { increment: 1 } },
    });
    if (!taken.count) return { ok: false, code: "quota" };
    return {
      ok: true,
      refund: async () => {
        await db.aiUsage.update({ where: { id: row.id }, data: { checksUsed: { decrement: 1 } } });
      },
    };
  }

  if (opts.chars > limits.authorMaxChars) return { ok: false, code: "too_long" };
  if (await articleIsPaid(opts.paidArticleId)) return { ok: true, refund: async () => {} };

  // Premium covers work on drafts/articles; a loose text (the public trial
  // box) still uses the small free allowance below.
  if (opts.workKey && (await premiumUntil(actor.id))) {
    return (await claimPremiumWork(actor.id, opts.workKey, limits.premiumArticles))
      ? { ok: true, refund: async () => {} }
      : { ok: false, code: "premium_limit" };
  }

  const limit = actor.aiQuota ?? limits.authorMonthly;
  const period = new Date().toISOString().slice(0, 7);
  const row = await db.aiUsage.upsert({
    where: { userId_period: { userId: actor.id, period } },
    create: { userId: actor.id, period },
    update: {},
  });
  const monthly = await db.aiUsage.updateMany({
    where: { id: row.id, checksUsed: { lt: limit } },
    data: { checksUsed: { increment: 1 } },
  });
  if (monthly.count) {
    return {
      ok: true,
      refund: async () => {
        await db.aiUsage.update({ where: { id: row.id }, data: { checksUsed: { decrement: 1 } } });
      },
    };
  }
  const credit = await db.user.updateMany({
    where: { id: actor.id, aiCredits: { gt: 0 } },
    data: { aiCredits: { decrement: 1 } },
  });
  if (credit.count) {
    return {
      ok: true,
      refund: async () => {
        await db.user.update({ where: { id: actor.id }, data: { aiCredits: { increment: 1 } } });
      },
    };
  }
  return { ok: false, code: "quota" };
}

/** Chat and source search are not counted as checks, only rate limited. */
export async function allowLight(actor: AiActor): Promise<AiErrorCode | null> {
  const limits = await aiLimits();
  return rateLimited(actorKey(actor), limits.perMinute) ? "rate_limit" : null;
}
