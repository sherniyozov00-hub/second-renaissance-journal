import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { OTP_MAX_ATTEMPTS, requestOtp, verifyOtp } from "@/lib/auth/otp";

// Uses the mock SMS provider; OTP_MOCK_CODE fixes the code for the test.
process.env.SMS_PROVIDER = "mock";
process.env.OTP_MOCK_CODE = "246810";
const PHONE = "+998990000099";

beforeEach(() => db.otpCode.deleteMany({ where: { target: PHONE } }));
afterAll(async () => {
  await db.otpCode.deleteMany({ where: { target: PHONE } });
  await db.$disconnect();
});

describe("one-time login codes", () => {
  it("accepts the right code once", async () => {
    expect((await requestOtp("PHONE", PHONE, "10.0.0.1")).ok).toBe(true);
    expect(await verifyOtp("PHONE", PHONE, "246810")).toBe(true);
    expect(await verifyOtp("PHONE", PHONE, "246810")).toBe(false);
  });

  it("locks the code after too many wrong attempts", async () => {
    await requestOtp("PHONE", PHONE, "10.0.0.1");
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++)
      expect(await verifyOtp("PHONE", PHONE, "000000")).toBe(false);
    expect(await verifyOtp("PHONE", PHONE, "246810")).toBe(false);
  });

  it("refuses to resend within a minute", async () => {
    await requestOtp("PHONE", PHONE, "10.0.0.1");
    const again = await requestOtp("PHONE", PHONE, "10.0.0.1");
    expect(again).toMatchObject({ ok: false, error: "too_soon" });
  });

  it("stores only a hash of the code", async () => {
    await requestOtp("PHONE", PHONE, "10.0.0.1");
    const row = await db.otpCode.findFirst({ where: { target: PHONE } });
    expect(row?.codeHash).not.toContain("246810");
  });
});
