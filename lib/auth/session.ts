import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/client";
import { getPathname, redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { db } from "@/lib/db";

/**
 * The signed-in user, re-read from the database on every request so that
 * role changes and blocking take effect immediately (TZ 17: roles are checked
 * on the server).
 */
export const currentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });
  return user && !user.isBlocked ? user : null;
});

export async function requireUser(locale: AppLocale, next: string) {
  const user = await currentUser();
  if (!user) redirect({ href: { pathname: "/kirish", query: { next } }, locale });
  return user!;
}

export function hasRole(user: { roles: Role[] } | null, ...roles: Role[]) {
  return !!user && roles.some((r) => user.roles.includes(r));
}

/**
 * For cabinet pages. Layouts and pages render in parallel in Next.js, so a
 * layout redirect alone does not protect a page — each page calls this.
 */
export function requireCabinetUser(locale: string, path = "/kabinet") {
  const l = locale as AppLocale;
  return requireUser(l, getPathname({ href: path, locale: l }));
}

/**
 * The session signed in with an emailed code in the last 15 minutes: the
 * author just proved the email, so a password may be set without the old one.
 */
export async function recentCodeSignIn(): Promise<boolean> {
  const session = await auth();
  const s = session?.signedIn;
  return s?.method === "otp" && typeof s.at === "number" && Date.now() - s.at < 15 * 60 * 1000;
}
