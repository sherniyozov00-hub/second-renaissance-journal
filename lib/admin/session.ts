import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { siteConfig } from "@/lib/site";

/**
 * The admin panel has its own sign-in, separate from the site: a site session
 * (Google or email) never opens /admin, even for an administrator's account.
 * Staff sign in at /admin/kirish with the email and the *staff* password; the
 * session is an HMAC-signed cookie limited to /admin, valid for 8 hours and
 * void as soon as the staff password changes (staffPasswordVersion).
 */
export const ADMIN_COOKIE = "srj_admin";
const TTL_MS = 8 * 3600 * 1000;
export const STAFF_ROLES: Role[] = ["ADMIN", "EDITOR"];

function sign(payload: string) {
  const key = `admin-session:${process.env.AUTH_SECRET || "dev-only-secret"}`;
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export async function startAdminSession(user: { id: string; staffPasswordVersion: number }) {
  const exp = Date.now() + TTL_MS;
  const payload = `${user.id}.${exp}.${user.staffPasswordVersion}`;
  (await cookies()).set(ADMIN_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    // Secure on the real (https) site; plain http only for local runs and tests.
    secure: siteConfig.url.startsWith("https://"),
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

/** The signed-in staff member of the admin panel, or null. */
export async function adminUser() {
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [id, exp, version, sig] = parts as [string, string, string, string];
  const payload = `${id}.${exp}.${version}`;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  if (Number(exp) < Date.now()) return null;
  const user = await db.user.findUnique({ where: { id }, include: { profile: true } });
  if (!user || user.isBlocked || !user.staffPasswordHash) return null;
  if (String(user.staffPasswordVersion) !== version) return null;
  if (!STAFF_ROLES.some((r) => user.roles.includes(r))) return null;
  return user;
}
