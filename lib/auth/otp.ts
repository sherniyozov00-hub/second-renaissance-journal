import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { OtpChannel } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getEmailProvider } from "@/lib/notify/email";
import { getSmsProvider } from "@/lib/notify/sms";
import { siteConfig } from "@/lib/site";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
const RESEND_AFTER_MS = 60 * 1000;
const MAX_PER_TARGET_PER_HOUR = 5;
const MAX_PER_IP_PER_HOUR = 20;

function secret() {
  return process.env.AUTH_SECRET || "dev-only-secret";
}

export function hashCode(target: string, code: string): string {
  return createHmac("sha256", secret()).update(`${target}:${code}`).digest("hex");
}

/**
 * In mock mode a fixed code can be configured for demos and e2e tests;
 * it is ignored as soon as a real SMS provider is configured.
 */
function generateCode(channel: OtpChannel): string {
  const fixed = process.env.OTP_MOCK_CODE;
  const mock =
    channel === "PHONE" ? getSmsProvider().name === "mock" : getEmailProvider().name === "mock";
  if (fixed && mock && /^\d{6}$/.test(fixed)) return fixed;
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export type RequestResult =
  | { ok: true }
  | { ok: false; error: "too_soon" | "rate_limited" | "send_failed"; retryAfterSec?: number };

export async function requestOtp(
  channel: OtpChannel,
  target: string,
  ip: string | null,
): Promise<RequestResult> {
  const now = Date.now();
  const hourAgo = new Date(now - 3600 * 1000);
  const [last, perTarget, perIp] = await Promise.all([
    db.otpCode.findFirst({ where: { target }, orderBy: { createdAt: "desc" } }),
    db.otpCode.count({ where: { target, createdAt: { gte: hourAgo } } }),
    ip ? db.otpCode.count({ where: { ip, createdAt: { gte: hourAgo } } }) : Promise.resolve(0),
  ]);
  if (last && now - last.createdAt.getTime() < RESEND_AFTER_MS) {
    return {
      ok: false,
      error: "too_soon",
      retryAfterSec: Math.ceil((RESEND_AFTER_MS - (now - last.createdAt.getTime())) / 1000),
    };
  }
  if (perTarget >= MAX_PER_TARGET_PER_HOUR || perIp >= MAX_PER_IP_PER_HOUR) {
    return { ok: false, error: "rate_limited" };
  }

  const code = generateCode(channel);
  await db.otpCode.create({
    data: {
      channel,
      target,
      ip,
      codeHash: hashCode(target, code),
      expiresAt: new Date(now + OTP_TTL_MS),
    },
  });

  const text = `${siteConfig.name}: kirish kodi ${code}. Kod 5 daqiqa amal qiladi. Uni hech kimga bermang.`;
  try {
    if (channel === "PHONE") await getSmsProvider().send(target, text);
    else await getEmailProvider().send({ to: target, subject: `Kirish kodi: ${code}`, text });
  } catch (err) {
    console.error("[otp] delivery failed", err);
    return { ok: false, error: "send_failed" };
  }
  return { ok: true };
}

/** Checks a code; each wrong guess counts towards the attempt limit. */
export async function verifyOtp(
  channel: OtpChannel,
  target: string,
  code: string,
): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const otp = await db.otpCode.findFirst({
    where: { channel, target, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) return false;

  const expected = Buffer.from(otp.codeHash, "hex");
  const actual = Buffer.from(hashCode(target, code), "hex");
  const ok = expected.length === actual.length && timingSafeEqual(expected, actual);

  // Consume atomically so the same code cannot be used twice.
  const updated = await db.otpCode.updateMany({
    where: { id: otp.id, consumedAt: null, attempts: { lt: OTP_MAX_ATTEMPTS } },
    data: ok ? { consumedAt: new Date() } : { attempts: { increment: 1 } },
  });
  return ok && updated.count === 1;
}
