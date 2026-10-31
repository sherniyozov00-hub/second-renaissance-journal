import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { clickSign, handleClick } from "@/lib/payments/click";
import { handlePayme, PAYME_ERRORS } from "@/lib/payments/payme";
import { markPaid } from "@/lib/payments/service";

process.env.PAYME_SECRET_KEY = "test-payme-key";
process.env.CLICK_SECRET_KEY = "test-click-key";
const AUTH = `Basic ${Buffer.from("Paycom:test-payme-key").toString("base64")}`;

let userId = "";
let categoryId = "";
const created: string[] = [];

async function pendingPayment(amount = 50_000) {
  const article = await db.article.create({
    data: {
      slug: `test-payment-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      titleUz: "To‘lov testi maqolasi",
      abstractUz: "Annotatsiya",
      categoryId,
      status: "AWAITING_PAYMENT",
      submitterId: userId,
    },
  });
  created.push(article.id);
  const payment = await db.payment.create({
    data: { articleId: article.id, userId, provider: "PAYME", amount },
  });
  return { article, payment };
}

beforeAll(async () => {
  const user = await db.user.upsert({
    where: { phone: "+998990000088" },
    update: {},
    create: { phone: "+998990000088", name: "Payments test" },
  });
  userId = user.id;
  categoryId = (await db.category.findFirstOrThrow()).id;
});

afterAll(async () => {
  await db.payment.deleteMany({ where: { articleId: { in: created } } });
  await db.auditLog.deleteMany({ where: { entityId: { in: created } } });
  await db.article.deleteMany({ where: { id: { in: created } } });
  await db.$disconnect();
});

describe("Payme Merchant API", () => {
  it("rejects requests without the merchant key", async () => {
    const res = (await handlePayme(
      { id: 1, method: "CheckPerformTransaction", params: {} },
      "Basic eA==",
    )) as {
      error: { code: number };
    };
    expect(res.error.code).toBe(PAYME_ERRORS.AUTH);
  });

  it("runs the full flow and moves the article to UNDER_REVIEW", async () => {
    const { article, payment } = await pendingPayment();
    const account = { payment_id: payment.id };

    const wrong = (await handlePayme(
      { id: 1, method: "CheckPerformTransaction", params: { amount: 1, account } },
      AUTH,
    )) as { error: { code: number } };
    expect(wrong.error.code).toBe(PAYME_ERRORS.AMOUNT);

    const check = (await handlePayme(
      { id: 2, method: "CheckPerformTransaction", params: { amount: 5_000_000, account } },
      AUTH,
    )) as { result: { allow: boolean; detail: { items: unknown[] } } };
    expect(check.result.allow).toBe(true);
    expect(check.result.detail.items).toHaveLength(1);

    const txId = `payme-${Date.now()}`;
    const create = (await handlePayme(
      {
        id: 3,
        method: "CreateTransaction",
        params: { id: txId, time: Date.now(), amount: 5_000_000, account },
      },
      AUTH,
    )) as { result: { state: number } };
    expect(create.result.state).toBe(1);

    const perform = (await handlePayme(
      { id: 4, method: "PerformTransaction", params: { id: txId } },
      AUTH,
    )) as {
      result: { state: number; perform_time: number };
    };
    expect(perform.result.state).toBe(2);

    // Idempotent: performing again returns the same result.
    const again = (await handlePayme(
      { id: 5, method: "PerformTransaction", params: { id: txId } },
      AUTH,
    )) as {
      result: { state: number; perform_time: number };
    };
    expect(again.result).toEqual(perform.result);

    const status = (await handlePayme(
      { id: 6, method: "CheckTransaction", params: { id: txId } },
      AUTH,
    )) as {
      result: { state: number };
    };
    expect(status.result.state).toBe(2);

    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("PAID");
    const after = await db.article.findUniqueOrThrow({ where: { id: article.id } });
    expect(after.status).toBe("UNDER_REVIEW");
    expect(after.submittedAt).not.toBeNull();
  });

  it("cancels an unpaid transaction", async () => {
    const { payment } = await pendingPayment();
    const txId = `payme-cancel-${Date.now()}`;
    await handlePayme(
      {
        id: 1,
        method: "CreateTransaction",
        params: {
          id: txId,
          time: Date.now(),
          amount: 5_000_000,
          account: { payment_id: payment.id },
        },
      },
      AUTH,
    );
    const res = (await handlePayme(
      { id: 2, method: "CancelTransaction", params: { id: txId, reason: 3 } },
      AUTH,
    )) as {
      result: { state: number };
    };
    expect(res.result.state).toBe(-1);
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe(
      "CANCELLED",
    );
  });
});

describe("Click SHOP API", () => {
  function signed(p: Record<string, string>, complete: boolean) {
    return { ...p, sign_string: clickSign(p, "test-click-key", complete) };
  }

  it("rejects a bad signature", async () => {
    const res = await handleClick(
      { click_trans_id: "1", sign_string: "x", action: "0" },
      "prepare",
    );
    expect(res.error).toBe(-1);
  });

  it("prepares and completes a payment", async () => {
    const { article, payment } = await pendingPayment(70_000);
    const base = {
      click_trans_id: `${Date.now()}`,
      service_id: "1",
      merchant_trans_id: payment.id,
      amount: "70000",
      sign_time: "2026-10-31 10:00:00",
    };
    const prep = await handleClick(signed({ ...base, action: "0" }, false), "prepare");
    expect(prep.error).toBe(0);

    const wrongAmount = await handleClick(
      signed({ ...base, amount: "1", action: "0" }, false),
      "prepare",
    );
    expect(wrongAmount.error).toBe(-2);

    const done = await handleClick(
      signed(
        { ...base, action: "1", merchant_prepare_id: String(prep.merchant_prepare_id), error: "0" },
        true,
      ),
      "complete",
    );
    expect(done.error).toBe(0);
    expect((await db.article.findUniqueOrThrow({ where: { id: article.id } })).status).toBe(
      "UNDER_REVIEW",
    );

    const repeat = await handleClick(
      signed(
        { ...base, action: "1", merchant_prepare_id: String(prep.merchant_prepare_id), error: "0" },
        true,
      ),
      "complete",
    );
    expect(repeat.error).toBe(-4);
  });
});

describe("markPaid", () => {
  it("is idempotent", async () => {
    const { payment } = await pendingPayment();
    expect(await markPaid(payment.id, "sandbox-1")).toBe("paid");
    expect(await markPaid(payment.id, "sandbox-1")).toBe("already_paid");
  });
});
