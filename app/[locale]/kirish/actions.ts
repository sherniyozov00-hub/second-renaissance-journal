"use server";

import { getLocale } from "next-intl/server";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { signIn, signOut } from "@/auth";
import { normalizeEmail, normalizePhone, safeNext } from "@/lib/auth/identifiers";
import { requestOtp } from "@/lib/auth/otp";
import { phoneLoginEnabled } from "@/lib/notify/sms";

export type LoginState =
  | { step: "identify"; error?: string; retryAfterSec?: number }
  | { step: "verify"; channel: "PHONE" | "EMAIL"; target: string; error?: string };

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

/** One action for the whole flow; the submit button's "intent" picks the step. */
export async function loginAction(prev: LoginState, form: FormData): Promise<LoginState> {
  const intent = form.get("intent");
  if (intent === "restart") return { step: "identify" };
  if (intent === "verify") return verifyCode(prev, form);
  return requestCode(form);
}

/** Step 1: validate the phone/email and send a one-time code. */
async function requestCode(form: FormData): Promise<LoginState> {
  const channel = form.get("channel") === "PHONE" && phoneLoginEnabled() ? "PHONE" : "EMAIL";
  const raw = String(form.get("target") ?? "");
  const target = channel === "PHONE" ? normalizePhone(raw) : normalizeEmail(raw);
  if (!target)
    return { step: "identify", error: channel === "PHONE" ? "invalid_phone" : "invalid_email" };
  if (form.get("consent") !== "1") return { step: "identify", error: "consent" };

  const result = await requestOtp(channel, target, await clientIp(), await getLocale());
  // A code that is still valid can be entered even if a resend was refused.
  if (!result.ok && result.error !== "too_soon") return { step: "identify", error: result.error };
  return { step: "verify", channel, target };
}

/** Step 2: check the code and sign in. */
async function verifyCode(prev: LoginState, form: FormData): Promise<LoginState> {
  if (prev.step !== "verify") return prev;
  try {
    await signIn("otp", {
      channel: prev.channel,
      target: prev.target,
      code: String(form.get("code") ?? "").replace(/\D/g, ""),
      consent: "1",
      redirectTo: safeNext(String(form.get("next") ?? "")),
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
