import { describe, expect, it } from "vitest";
import { currentStep } from "@/components/cabinet/article-card";
import { maskPhone, normalizeEmail, normalizePhone, safeNext } from "@/lib/auth/identifiers";
import { hashCode } from "@/lib/auth/otp";

describe("normalizePhone", () => {
  it("accepts the usual ways people type an Uzbek number", () => {
    for (const v of ["+998 90 123 45 67", "998901234567", "90 123-45-67", "(90) 1234567"]) {
      expect(normalizePhone(v), v).toBe("+998901234567");
    }
  });

  it("rejects wrong lengths", () => {
    expect(normalizePhone("90 123 45 6")).toBeNull();
    expect(normalizePhone("+7 900 123 45 67")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });

  it("masks numbers for display", () => {
    expect(maskPhone("+998901234567")).toBe("+998 90 *** ** 67");
  });
});

describe("normalizeEmail", () => {
  it("lower-cases and validates", () => {
    expect(normalizeEmail("  Aziza@Misol.UZ ")).toBe("aziza@misol.uz");
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail("a@b")).toBeNull();
  });
});

describe("safeNext", () => {
  it("allows only same-site paths (no open redirect)", () => {
    expect(safeNext("/kabinet/profil")).toBe("/kabinet/profil");
    expect(safeNext("/ru/kabinet")).toBe("/ru/kabinet");
    expect(safeNext("https://evil.example")).toBe("/kabinet");
    expect(safeNext("//evil.example")).toBe("/kabinet");
    expect(safeNext("/\\evil.example")).toBe("/kabinet");
    expect(safeNext(undefined, "/ru/kabinet")).toBe("/ru/kabinet");
  });
});

describe("OTP hashing", () => {
  it("binds the code to its target and never stores it in clear text", () => {
    const h = hashCode("+998901234567", "123456");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("123456");
    expect(hashCode("+998901234568", "123456")).not.toBe(h);
  });
});

describe("cabinet progress line", () => {
  it("maps statuses to the five Ekran 7 steps", () => {
    expect(currentStep("AWAITING_PAYMENT")).toBe(1);
    expect(currentStep("UNDER_REVIEW")).toBe(2);
    expect(currentStep("REVISION_REQUESTED")).toBe(2);
    expect(currentStep("ACCEPTED")).toBe(3);
    expect(currentStep("PUBLISHED")).toBe(5);
  });
});
