import "server-only";
import { db } from "@/lib/db";

export { hashPassword, passwordProblem, verifyPassword } from "./password-hash";
export type { PasswordProblem } from "./password-hash";
import { verifyPassword } from "./password-hash";

const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;

/**
 * Checks a password with brute-force protection: five wrong attempts in a
 * row lock password sign-in for this account for 15 minutes.
 */
export async function checkUserPassword(
  user: { id: string; failedLogins: number; lockedUntil: Date | null },
  hash: string | null,
  password: string,
): Promise<"ok" | "wrong" | "locked"> {
  if (user.lockedUntil && user.lockedUntil > new Date()) return "locked";
  if (await verifyPassword(password, hash)) {
    if (user.failedLogins || user.lockedUntil) {
      await db.user.update({
        where: { id: user.id },
        data: { failedLogins: 0, lockedUntil: null },
      });
    }
    return "ok";
  }
  const failed = user.failedLogins + 1;
  await db.user.update({
    where: { id: user.id },
    data:
      failed >= MAX_FAILED
        ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) }
        : { failedLogins: failed },
  });
  return failed >= MAX_FAILED ? "locked" : "wrong";
}
