/**
 * Arithmetic the review agent must not guess: whether a percentage can come
 * from a sample of n people (k/n × 100 for a whole k), and what the nearest
 * possible values are. Pure functions — used by the agent's `percent_check`
 * tool and to pre-scan a draft for the sample size and percentages.
 */

export type PercentCheck = {
  value: number;
  text: string;
  ok: boolean;
  /** People behind the value when it fits (k of n). */
  count: number | null;
  /** Closest values that are possible for this n, at the same precision. */
  nearest: string[];
};

const PERCENT = /(\d{1,3}(?:[.,]\d{1,2})?)\s?%/g;

function decimalsOf(text: string) {
  const m = text.match(/[.,](\d+)/);
  return m ? m[1]!.length : 0;
}

function format(value: number, decimals: number, comma: boolean) {
  const s = value.toFixed(decimals);
  return comma ? s.replace(".", ",") : s;
}

/** Can `text` (e.g. "37,3" or "40") be k/n × 100 rounded to its own precision? */
export function checkPercent(text: string, n: number): PercentCheck {
  const clean = text.replace("%", "").trim();
  const value = Number(clean.replace(",", "."));
  const decimals = decimalsOf(clean);
  const comma = clean.includes(",");
  const half = 0.5 * 10 ** -decimals + 1e-9;
  if (!Number.isFinite(value) || !Number.isInteger(n) || n < 1 || n > 100_000)
    return { value, text: clean, ok: true, count: null, nearest: [] };
  const k = Math.round((value / 100) * n);
  const candidates = [k - 1, k, k + 1].filter((x) => x >= 0 && x <= n);
  const hit = candidates.find((x) => Math.abs((x / n) * 100 - value) <= half);
  if (hit !== undefined) return { value, text: clean, ok: true, count: hit, nearest: [] };
  const nearest = candidates
    .map((x) => ({ x, d: Math.abs((x / n) * 100 - value) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 2)
    .map(({ x }) => `${format((x / n) * 100, Math.max(decimals, 1), comma)} % (${x} kishi)`);
  return { value, text: clean, ok: false, count: null, nearest };
}

/** Percentages written in a text, in order (the "%" sign is required). */
export function findPercents(text: string): string[] {
  return [...text.matchAll(PERCENT)].map((m) => m[1]!);
}

const SAMPLE_WORDS =
  "talaba|talabalar|ishtirokchi|ishtirokchilar|respondent|respondentlar|kishi|nafar|o‘quvchi|o'quvchi|participants?|students?|respondents?|people|студент\\p{L}*|респондент\\p{L}*|участник\\p{L}*|человек";
const SAMPLE = new RegExp(
  `\\bn\\s*=\\s*(\\d{1,5})\\b|\\b(\\d{1,5})\\s+(?:ta\\s+|nafar\\s+)?(?:${SAMPLE_WORDS})`,
  "giu",
);

/** Numbers that look like sample sizes ("n = 35", "35 talaba", "60 respondents"), most frequent first. */
export function findSampleSizes(text: string): number[] {
  const counts = new Map<number, number>();
  for (const m of text.matchAll(SAMPLE)) {
    const n = Number(m[1] ?? m[2]);
    if (n >= 5 && n <= 100_000) counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

/**
 * A short note for the agent: the likely sample size and every percentage in
 * the text that cannot come from it. The agent decides whether a value is
 * really "of the whole sample" (subgroups and multi-answer questions differ).
 */
export function auditNote(text: string): { n: number | null; misfits: PercentCheck[] } {
  const sizes = findSampleSizes(text);
  const n = sizes[0] ?? null;
  if (!n) return { n: null, misfits: [] };
  const seen = new Set<string>();
  const misfits: PercentCheck[] = [];
  for (const p of findPercents(text)) {
    if (seen.has(p)) continue;
    seen.add(p);
    const c = checkPercent(p, n);
    if (!c.ok) misfits.push(c);
  }
  return { n, misfits };
}
