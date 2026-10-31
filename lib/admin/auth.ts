import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { currentUser } from "@/lib/auth/session";

/**
 * Staff pages (/admin, /taqriz) are not localised. Roles are checked on the
 * server for every page and action (TZ 17).
 */
export async function requireStaff(roles: Role[], next: string) {
  const user = await currentUser();
  if (!user) redirect(`/kirish?next=${encodeURIComponent(next)}`);
  if (!roles.some((r) => user.roles.includes(r))) redirect("/kabinet");
  return user;
}

export const requireEditor = (next = "/admin") => requireStaff(["EDITOR", "ADMIN"], next);
export const requireAdmin = (next = "/admin") => requireStaff(["ADMIN"], next);
export const requireReviewer = (next = "/taqriz") => requireStaff(["REVIEWER"], next);

/** For server actions: throws instead of redirecting. */
export async function staffOrThrow(roles: Role[]) {
  const user = await currentUser();
  if (!user || !roles.some((r) => user.roles.includes(r))) throw new Error("Forbidden");
  return user;
}
