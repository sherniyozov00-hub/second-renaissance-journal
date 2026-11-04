"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { safeNext } from "@/lib/auth/identifiers";
import { checkUserPassword, hashPassword, passwordProblem } from "@/lib/auth/password";
import { currentUser, recentCodeSignIn } from "@/lib/auth/session";
import { db } from "@/lib/db";

export type PasswordState = { error?: string; ok?: boolean };

/**
 * Sets or changes the site password. The current password is asked unless
 * the account has none yet or the author signed in with an emailed code in
 * the last 15 minutes (first sign-in or "forgot password").
 */
export async function setPasswordAction(
  _prev: PasswordState,
  form: FormData,
): Promise<PasswordState> {
  const user = await currentUser();
  if (!user) return { error: "auth" };
  if (!user.email) return { error: "no_email" };
  const password = String(form.get("password") ?? "");
  if (password !== String(form.get("password2") ?? "")) return { error: "mismatch" };
  const problem = passwordProblem(password);
  if (problem) return { error: `pw_${problem}` };
  if (user.passwordHash && !(await recentCodeSignIn())) {
    const r = await checkUserPassword(user, user.passwordHash, String(form.get("current") ?? ""));
    if (r !== "ok") return { error: r === "locked" ? "locked" : "current" };
  }
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null },
  });
  const next = String(form.get("next") ?? "");
  const locale = (await getLocale()) as AppLocale;
  // After the first sign-in or a reset: on to where the author was going.
  if (next) redirect(safeNext(next, getPathname({ href: "/kabinet", locale })));
  return { ok: true };
}
