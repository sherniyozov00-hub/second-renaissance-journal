import "server-only";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings/get";
import { cancelPayment, markPaid } from "./service";

/**
 * Payme Merchant API (JSON-RPC 2.0): CheckPerformTransaction, CreateTransaction,
 * PerformTransaction, CancelTransaction, CheckTransaction, GetStatement.
 * Amounts are in tiyin. Every method is idempotent per Payme's rules.
 */
export const PAYME_ERRORS = {
  AUTH: -32504,
  METHOD: -32601,
  AMOUNT: -31001,
  TX_NOT_FOUND: -31003,
  CANT_PERFORM: -31008,
  ORDER: -31050,
} as const;

const TX_TIMEOUT_MS = 12 * 3600 * 1000;

type RpcRequest = { id?: number | string; method?: string; params?: Record<string, unknown> };
type PaymeState = {
  id: string;
  create_time: number;
  perform_time: number;
  cancel_time: number;
  state: number;
  reason: number | null;
};

function error(id: RpcRequest["id"], code: number, message: string) {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message: { uz: message, ru: message, en: message } },
  };
}

function result(id: RpcRequest["id"], value: unknown) {
  return { jsonrpc: "2.0", id, result: value };
}

/** Basic auth "Paycom:<key>" as Payme sends it. */
export function paymeAuthorized(header: string | null, key: string | undefined): boolean {
  if (!header?.startsWith("Basic ") || !key) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString();
  const expected = `Paycom:${key}`;
  const a = Buffer.from(decoded);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function stateOf(data: unknown): PaymeState | null {
  return data && typeof data === "object" && "create_time" in data ? (data as PaymeState) : null;
}

async function receiptDetail(title: string, amountTiyin: number) {
  const s = await getSettings();
  return {
    receipt_type: 0,
    items: [
      {
        title: title.slice(0, 120),
        price: amountTiyin,
        count: 1,
        code: String(s["payments.mxikCode"]),
        package_code: String(s["payments.unitCode"]),
        vat_percent: 0,
      },
    ],
  };
}

export async function handlePayme(req: RpcRequest, authHeader: string | null): Promise<unknown> {
  const { id, method, params = {} } = req;
  if (!paymeAuthorized(authHeader, process.env.PAYME_SECRET_KEY))
    return error(id, PAYME_ERRORS.AUTH, "Unauthorized");

  const account = (params.account ?? {}) as { payment_id?: string };
  const findPayment = (paymentId?: string) =>
    paymentId
      ? db.payment.findUnique({ where: { id: paymentId }, include: { article: true } })
      : null;
  const findByTx = (txId: unknown) =>
    db.payment.findFirst({
      where: { provider: "PAYME", providerTxId: String(txId) },
      include: { article: true },
    });

  switch (method) {
    case "CheckPerformTransaction": {
      const p = await findPayment(account.payment_id);
      if (!p || p.status !== "PENDING") return error(id, PAYME_ERRORS.ORDER, "Order not found");
      if (Number(params.amount) !== p.amount * 100)
        return error(id, PAYME_ERRORS.AMOUNT, "Wrong amount");
      return result(id, {
        allow: true,
        detail: await receiptDetail(
          p.article?.titleUz ?? (p.purpose === "AI_PACKAGE" ? "Xorazmiy AI paketi" : "Nashr"),
          p.amount * 100,
        ),
      });
    }

    case "CreateTransaction": {
      const existing = await findByTx(params.id);
      if (existing) {
        const st = stateOf(existing.providerData);
        if (!st || st.state !== 1) return error(id, PAYME_ERRORS.CANT_PERFORM, "Cannot create");
        return result(id, {
          create_time: st.create_time,
          transaction: existing.id,
          state: st.state,
        });
      }
      const p = await findPayment(account.payment_id);
      if (!p || p.status !== "PENDING") return error(id, PAYME_ERRORS.ORDER, "Order not found");
      if (Number(params.amount) !== p.amount * 100)
        return error(id, PAYME_ERRORS.AMOUNT, "Wrong amount");
      if (p.providerTxId && p.providerTxId !== String(params.id)) {
        return error(id, PAYME_ERRORS.ORDER, "Order is busy with another transaction");
      }
      const st: PaymeState = {
        id: String(params.id),
        create_time: Number(params.time),
        perform_time: 0,
        cancel_time: 0,
        state: 1,
        reason: null,
      };
      await db.payment.update({
        where: { id: p.id },
        data: { provider: "PAYME", providerTxId: st.id, providerData: st },
      });
      return result(id, { create_time: st.create_time, transaction: p.id, state: 1 });
    }

    case "PerformTransaction": {
      const p = await findByTx(params.id);
      const st = stateOf(p?.providerData);
      if (!p || !st) return error(id, PAYME_ERRORS.TX_NOT_FOUND, "Transaction not found");
      if (st.state === 2)
        return result(id, { transaction: p.id, perform_time: st.perform_time, state: 2 });
      if (st.state !== 1) return error(id, PAYME_ERRORS.CANT_PERFORM, "Cannot perform");
      if (Date.now() - st.create_time > TX_TIMEOUT_MS) {
        const cancelled = { ...st, state: -1, cancel_time: Date.now(), reason: 4 };
        await cancelPayment(p.id, cancelled);
        return error(id, PAYME_ERRORS.CANT_PERFORM, "Transaction timed out");
      }
      const done = { ...st, state: 2, perform_time: Date.now() };
      await markPaid(p.id, st.id, done);
      return result(id, { transaction: p.id, perform_time: done.perform_time, state: 2 });
    }

    case "CancelTransaction": {
      const p = await findByTx(params.id);
      const st = stateOf(p?.providerData);
      if (!p || !st) return error(id, PAYME_ERRORS.TX_NOT_FOUND, "Transaction not found");
      if (st.state < 0)
        return result(id, { transaction: p.id, cancel_time: st.cancel_time, state: st.state });
      const cancelled = {
        ...st,
        state: st.state === 2 ? -2 : -1,
        cancel_time: Date.now(),
        reason: Number(params.reason ?? 0),
      };
      if (st.state === 2) {
        // Refund after payment: mark refunded; the editor sees it in the admin panel.
        await db.payment.update({
          where: { id: p.id },
          data: { status: "REFUNDED", providerData: cancelled },
        });
      } else {
        await cancelPayment(p.id, cancelled);
      }
      return result(id, {
        transaction: p.id,
        cancel_time: cancelled.cancel_time,
        state: cancelled.state,
      });
    }

    case "CheckTransaction": {
      const p = await findByTx(params.id);
      const st = stateOf(p?.providerData);
      if (!p || !st) return error(id, PAYME_ERRORS.TX_NOT_FOUND, "Transaction not found");
      return result(id, {
        create_time: st.create_time,
        perform_time: st.perform_time,
        cancel_time: st.cancel_time,
        transaction: p.id,
        state: st.state,
        reason: st.reason,
      });
    }

    case "GetStatement": {
      const from = Number(params.from);
      const to = Number(params.to);
      const rows = await db.payment.findMany({
        where: { provider: "PAYME", providerTxId: { not: null } },
      });
      const transactions = rows
        .map((p) => ({ p, st: stateOf(p.providerData) }))
        .filter(({ st }) => st && st.create_time >= from && st.create_time <= to)
        .map(({ p, st }) => ({
          id: st!.id,
          time: st!.create_time,
          amount: p.amount * 100,
          account: { payment_id: p.id },
          create_time: st!.create_time,
          perform_time: st!.perform_time,
          cancel_time: st!.cancel_time,
          transaction: p.id,
          state: st!.state,
          reason: st!.reason,
        }));
      return result(id, { transactions });
    }

    default:
      return error(id, PAYME_ERRORS.METHOD, "Method not found");
  }
}
