import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { availableProviders, clickQrLinks, paymentCode } from "@/lib/payments/providers";
import { markPaid } from "@/lib/payments/service";

const PHONE = "+998990000079";

afterAll(async () => {
  const u = await db.user.findUnique({ where: { phone: PHONE } });
  if (u) {
    await db.payment.deleteMany({ where: { userId: u.id } });
    await db.user.delete({ where: { id: u.id } });
  }
  delete process.env.PAYMENTS_MODE;
  await db.$disconnect();
});

describe("Click QR (self-employed receiver)", () => {
  it("builds the QR link and USSD code with the amount", () => {
    expect(clickQrLinks("0114800", 39990)).toEqual({
      url: "https://indoor.click.uz/pay?id=0114800&t=0&amount=39990",
      ussd: "*880*0114800*39990#",
    });
    expect(paymentCode("cmabcdef123456")).toBe("P-123456");
  });

  it("is the only method live until Click/Payme keys exist; never the sandbox", async () => {
    process.env.PAYMENTS_MODE = "live";
    delete process.env.CLICK_SERVICE_ID;
    delete process.env.PAYME_MERCHANT_ID;
    expect(await availableProviders()).toEqual(["CLICK_QR"]);
    process.env.PAYMENTS_MODE = "sandbox";
    expect(await availableProviders()).toContain("CLICK");
  });

  it("an admin's confirmation activates Premium", async () => {
    const u = await db.user.upsert({
      where: { phone: PHONE },
      update: { premiumUntil: null },
      create: { phone: PHONE, name: "QR test" },
    });
    const p = await db.payment.create({
      data: { userId: u.id, provider: "CLICK_QR", amount: 39_990, purpose: "AI_PACKAGE" },
    });
    expect(await markPaid(p.id, `click-qr-${p.id}`, { confirmedBy: "admin" })).toBe("paid");
    const after = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(after.premiumUntil!.getTime()).toBeGreaterThan(Date.now() + 29 * 864e5);
  });
});
