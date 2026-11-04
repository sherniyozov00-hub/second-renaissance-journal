"use server";

import { getLocale } from "next-intl/server";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { signIn, signOut } from "@/auth";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { normalizeEmail, normalizePhone, safeNext } from "@/lib/auth/identifiers";
import { requestOtp } from "@/lib/auth/otp";
import { db } from "@/lib/db";
import { phoneLoginEnabled } from "@/lib/notify/sms";

/**
 * Site sign-in (email):
 *   identify → an account with a password → "password" step (or "forgot" →
 *   code); otherwise a code is emailed → "verify" step; after the first code
 *   sign-in (or a reset) the author sets a password at /kabinet/parol.
 * Phone sign-in (only when SMS works) keeps the code flow.
 */
export type LoginState =
  | { step: "identify"; error?: string; retryAfterSec?: number; email?: string }
  | { step: "password"; target: string; error?: string }
  | {
      step: "verify";
      channel: "PHONE" | "EMAIL";
      target: string;
      /** No account yet: consent is asked here. */
      isNew?: boolean;
      /** Code sign-in that must end on the "set password" page. */
      setPassword?: boolean;
      error?: string;
    };

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

/** One action for the whole flow; the submit button's "intent" picks the step. */
export async function loginAction(prev: LoginState, form: FormData): Promise<LoginState> {
  const intent = form.get("intent");
  if (intent === "restart") return { step: "identify" };
  if (intent === "verify") return verifyCode(prev, form);
  if (intent === "password") return passwordSignIn(prev, form);
  if (intent === "forgot" && prev.step === "password") return sendCode("EMAIL", prev.target, true);
  return identify(form);
}

/** Step 1: phone → code; email → password if the account has one, else a code. */
async function identify(form: FormData): Promise<LoginState> {
  const channel = form.get("channel") === "PHONE" && phoneLoginEnabled() ? "PHONE" : "EMAIL";
  const raw = String(form.get("target") ?? "");
  const target = channel === "PHONE" ? normalizePhone(raw) : normalizeEmail(raw);
  if (!target)
    return { step: "identify", error: channel === "PHONE" ? "invalid_phone" : "invalid_email" };

  if (channel === "PHONE") {
    if (form.get("consent") !== "1") return { step: "identify", error: "consent" };
    return sendCode("PHONE", target, false);
  }
  const user = await db.user.findUnique({
    where: { email: target },
    select: { passwordHash: true, isBlocked: true },
  });
  if (user?.isBlocked) return { step: "identify", error: "blocked", email: target };
  if (user?.passwordHash) return { step: "password", target };
  const sent = await sendCode("EMAIL", target, true);
  return sent.step === "verify" ? { ...sent, isNew: !user } : sent;
}

async function sendCode(
  channel: "PHONE" | "EMAIL",
  target: string,
  setPassword: boolean,
): Promise<LoginState> {
  const result = await requestOtp(channel, target, await clientIp(), await getLocale());
  // A code that is still valid can be entered even if a resend was refused.
  if (!result.ok && result.error !== "too_soon")
    return {
      step: "identify",
      error: result.error,
      email: channel === "EMAIL" ? target : undefined,
    };
  return { step: "verify", channel, target, setPassword };
}

/** Email + password. Five wrong attempts lock password sign-in for 15 minutes. */
async function passwordSignIn(prev: LoginState, form: FormData): Promise<LoginState> {
  if (prev.step !== "password") return prev;
  const user = await db.user.findUnique({
    where: { email: prev.target },
    select: { lockedUntil: true },
  });
  if (user?.lockedUntil && user.lockedUntil > new Date()) return { ...prev, error: "locked" };
  try {
    await signIn("password", {
      email: prev.target,
      password: String(form.get("password") ?? ""),
      redirectTo: safeNext(String(form.get("next") ?? "")),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      const after = await db.user.findUnique({
        where: { email: prev.target },
        select: { lockedUntil: true },
      });
      return {
        ...prev,
        error: after?.lockedUntil && after.lockedUntil > new Date() ? "locked" : "wrong_password",
      };
    }
    throw err; // NEXT_REDIRECT on success
  }
  return prev;
}

/** Code step: sign in; a new account or a reset continues to "set password". */
async function verifyCode(prev: LoginState, form: FormData): Promise<LoginState> {
  if (prev.step !== "verify") return prev;
  if (prev.isNew && form.get("consent") !== "1") return { ...prev, error: "consent" };
  const next = safeNext(String(form.get("next") ?? ""));
  const locale = (await getLocale()) as AppLocale;
  const redirectTo =
    prev.channel === "EMAIL" && prev.setPassword
      ? getPathname({ href: { pathname: "/kabinet/parol", query: { next } }, locale })
      : next;
  try {
    await signIn("otp", {
      channel: prev.channel,
      target: prev.target,
      code: String(form.get("code") ?? "").replace(/\D/g, ""),
      consent: "1",
      redirectTo,
    });
  } catch (err) {
    if (err instanceof AuthError) return { ...prev, error: "invalid_code" };
    throw err; // NEXT_REDIRECT on success
  }
  return prev;
}

export async function googleSignInAction(form: FormData) {
  await signIn("google", { redirectTo: safeNext(String(form.get("next") ?? "")) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
