import { describe, expect, it } from "vitest";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password-hash";

describe("passwords", () => {
  it("hashes with a random salt and verifies only the right password", async () => {
    const a = await hashPassword("Jurnal2026");
    const b = await hashPassword("Jurnal2026");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("Jurnal2026", a)).toBe(true);
    expect(await verifyPassword("jurnal2026", a)).toBe(false);
    expect(await verifyPassword("Jurnal2026", null)).toBe(false);
    expect(await verifyPassword("Jurnal2026", "plain-text")).toBe(false);
  });

  it("refuses trivial passwords", () => {
    expect(passwordProblem("abc12")).toBe("short");
    expect(passwordProblem("abcdefgh")).toBe("weak");
    expect(passwordProblem("12345678")).toBe("weak");
    expect(passwordProblem("O‘zbekiston1991")).toBeNull();
  });
});
