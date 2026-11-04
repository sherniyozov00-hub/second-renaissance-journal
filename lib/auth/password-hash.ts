/** Password hashing (scrypt) — no server-only import, so the seed can use it too. */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  opts: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 32;
const MAXMEM = 64 * 1024 * 1024;

/** Stored as "scrypt$N$r$p$salt$hash" (base64 parts). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(
    password.normalize("NFKC"),
    Buffer.from(salt, "base64"),
    expected.length,
    { N: Number(n), r: Number(r), p: Number(p), maxmem: MAXMEM },
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export type PasswordProblem = "short" | "weak" | "long";

/** At least 8 characters with a letter and a digit (no trivial passwords). */
export function passwordProblem(password: string): PasswordProblem | null {
  if (password.length < 8) return "short";
  if (password.length > 128) return "long";
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return "weak";
  return null;
}
