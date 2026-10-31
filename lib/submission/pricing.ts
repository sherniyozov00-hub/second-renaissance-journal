/**
 * Publication price (TZ 11): base fee + optional fast-track − promo code.
 * Pure so it can be unit tested; amounts are whole UZS.
 */
export type Promo = { discountPercent: number | null; discountAmount: number | null };

export type PriceBreakdown = {
  base: number;
  fastTrack: number;
  discount: number;
  total: number;
};

export function computePrice(opts: {
  base: number;
  fastTrackPrice: number | null;
  fastTrack: boolean;
  promo: Promo | null;
}): PriceBreakdown {
  const base = Math.max(0, Math.round(opts.base));
  const fastTrack =
    opts.fastTrack && opts.fastTrackPrice ? Math.max(0, Math.round(opts.fastTrackPrice)) : 0;
  const subtotal = base + fastTrack;
  let discount = 0;
  if (opts.promo?.discountPercent)
    discount = Math.round((subtotal * Math.min(100, opts.promo.discountPercent)) / 100);
  else if (opts.promo?.discountAmount) discount = Math.min(subtotal, opts.promo.discountAmount);
  return { base, fastTrack, discount, total: subtotal - discount };
}

/** In sandbox mode an unset "[NARX]" price falls back to this demo amount. */
export const SANDBOX_DEMO_PRICE = 50_000;

/** Numeric value of a price setting, or null for a placeholder like "[NARX]". */
export function parsePrice(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/\s/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
