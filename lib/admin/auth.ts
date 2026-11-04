import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { currentUser } from "@/lib/auth/session";
import { adminUser } from "./session";

/**
 * Staff pages are not localised; roles are checked on the server for every
 * page and action. The admin panel (/admin, editors and admins) uses its own
 * session (lib/admin/session.ts), never the site one. The reviewer panel
 * (/taqriz) uses the site session.
 */
export async function requireStaff(roles: Role[], next: string) {
  if (roles.includes("REVIEWER")) {
    const user = await currentUser();
    if (!user) redirect(`/kirish?next=${encodeURIComponent(next)}`);
    if (!roles.some((r) => user.roles.includes(r))) redirect("/kabinet");
    return user;
  }
  const user = await adminUser();
  if (!user) redirect(`/admin/kirish?next=${encodeURIComponent(next)}`);
  if (!roles.some((r) => user.roles.includes(r))) redirect("/admin");
  return user;
}

export const requireEditor = (next = "/admin") => requireStaff(["EDITOR", "ADMIN"], next);
export const requireAdmin = (next = "/admin") => requireStaff(["ADMIN"], next);
export const requireReviewer = (next = "/taqriz") => requireStaff(["REVIEWER"], next);

/** For server actions: throws instead of redirecting. */
export async function staffOrThrow(roles: Role[]) {
  const user = roles.includes("REVIEWER") ? await currentUser() : await adminUser();
  if (!user || !roles.some((r) => user.roles.includes(r))) throw new Error("Forbidden");
  return user;
}
