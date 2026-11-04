"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { STAFF_ROLES, endAdminSession, startAdminSession } from "@/lib/admin/session";
import { normalizeEmail } from "@/lib/auth/identifiers";
import { requestOtp, verifyOtp } from "@/lib/auth/otp";
import { checkUserPassword, hashPassword, passwordProblem } from "@/lib/auth/password";
import { db } from "@/lib/db";

export type StaffLoginState = {
  step: "login" | "reset" | "verify";
  email?: string;
  error?: string;
  info?: string;
};

const staffKey = (email: string) => `staff:${email}`;

function safeNext(next: unknown) {
  const n = String(next ?? "");
  return n.startsWith("/admin") && !n.startsWith("//") ? n : "/admin";
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

async function findStaff(email: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.isBlocked || !STAFF_ROLES.some((r) => user.roles.includes(r))) return null;
  return user;
}

/** One action for the admin sign-in form; the submit button's "intent" picks the step. */
export async function staffLoginAction(
  prev: StaffLoginState,
  form: FormData,
): Promise<StaffLoginState> {
  const intent = String(form.get("intent") ?? "login");
  const email = normalizeEmail(String(form.get("email") ?? prev.email ?? ""));

  if (intent === "toReset") return { step: "reset", email: email ?? undefined };
  if (intent === "toLogin") return { step: "login", email: email ?? undefined };
  if (!email) return { ...prev, error: "invalid_email" };

  if (intent === "login") {
    const user = await findStaff(email);
    // The same answer for an unknown email and a wrong password.
    if (!user?.staffPasswordHash) {
      // A staff member who has no admin password yet sets it by email code.
      return user
        ? { step: "reset", email, info: "set_first" }
        : { step: "login", email, error: "wrong" };
    }
    const result = await checkUserPassword(
      user,
      user.staffPasswordHash,
      String(form.get("password") ?? ""),
    );
    if (result !== "ok") return { step: "login", email, error: result };
    await startAdminSession(user);
    redirect(safeNext(form.get("next")));
  }

  if (intent === "sendCode") {
    const user = await findStaff(email);
    if (user) {
      const r = await requestOtp("EMAIL", staffKey(email), await clientIp(), "uz", email);
      if (!r.ok && r.error !== "too_soon") return { step: "reset", email, error: r.error };
    }
    // Never reveal whether the email belongs to staff.
    return { step: "verify", email, info: "code_sent" };
  }

  if (intent === "setPassword") {
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("password2") ?? ""))
      return { step: "verify", email, error: "mismatch" };
    const problem = passwordProblem(password);
    if (problem) return { step: "verify", email, error: `pw_${problem}` };
    const code = String(form.get("code") ?? "").replace(/\D/g, "");
    if (!(await verifyOtp("EMAIL", staffKey(email), code)))
      return { step: "verify", email, error: "invalid_code" };
    const user = await findStaff(email);
    if (!user) return { step: "login", email, error: "wrong" };
    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        staffPasswordHash: await hashPassword(password),
        staffPasswordVersion: { increment: 1 },
        failedLogins: 0,
        lockedUntil: null,
      },
    });
    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "staff_password_set",
        entity: "User",
        entityId: user.id,
      },
    });
    await startAdminSession(updated);
    redirect(safeNext(form.get("next")));
  }

  return prev;
}

export async function staffLogoutAction() {
  await endAdminSession();
  redirect("/admin/kirish");
}
