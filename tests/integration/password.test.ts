import { afterAll, describe, expect, it } from "vitest";
import { checkUserPassword, hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";

const EMAIL = "lockout@example.com";

afterAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
  await db.$disconnect();
});

describe("password sign-in protection", () => {
  it("locks after five wrong attempts, even for the right password", async () => {
    const hash = await hashPassword("Togri-parol1");
    let user = await db.user.upsert({
      where: { email: EMAIL },
      update: { passwordHash: hash, failedLogins: 0, lockedUntil: null },
      create: { email: EMAIL, passwordHash: hash },
    });
    expect(await checkUserPassword(user, hash, "Togri-parol1")).toBe("ok");
    for (let i = 0; i < 4; i++) {
      user = await db.user.findUniqueOrThrow({ where: { email: EMAIL } });
      expect(await checkUserPassword(user, hash, "xato-parol1")).toBe("wrong");
    }
    user = await db.user.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(await checkUserPassword(user, hash, "xato-parol1")).toBe("locked");
    user = await db.user.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(await checkUserPassword(user, hash, "Togri-parol1")).toBe("locked");
  });
});
