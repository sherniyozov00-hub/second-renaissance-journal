import { createHash } from "node:crypto";
import type { FactResult, FactSource, FactSummary, ModelVerdict, Verdict } from "./schemas";

/**
 * Pure helpers behind Xorazmiy AI: splitting text, cache keys, and the
 * platform rules that the model's answers must pass (TZ 10.2, 10.3).
 * Unit tested; no network, no database.
 */

/** Paragraphs as the editor shows them; empty lines dropped. */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Headings are not fact-checked: short lines without a full stop. */
export function isCheckable(paragraph: string): boolean {
  const words = paragraph.split(/\s+/).length;
  return words >= 4 && /[.!?…;:]|\d/.test(paragraph);
}

export function hashText(...parts: string[]): string {
  return createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 40);
}

export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}][\p{L}\p{N}‘’'ʻʼ-]*/gu)?.length ?? 0;
}

/** Comparable form of a URL: no scheme, no "www.", no trailing slash, no hash. */
export function normalizeUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    return `${host}${u.pathname.replace(/\/+$/, "")}${u.search}`;
  } catch {
    return null;
  }
}

/**
 * TZ 10.2: only sources that were really retrieved are shown, and a verdict
 * must stand on them. Sources the model did not get from web search are
 * dropped; "incorrect" or "correct" without a remaining source becomes
 * "needs_source".
 */
export function enforceVerdict(
  v: Pick<ModelVerdict, "verdict" | "explanation" | "correction" | "sources">,
  retrieved: ReadonlySet<string>,
): {
  verdict: Verdict;
  sources: FactSource[];
  correction: string | null;
  downgraded?: FactResult["downgraded"];
} {
  const seen = new Set<string>();
  const sources = v.sources.filter((s) => {
    const key = normalizeUrl(s.url);
    if (!key || !retrieved.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const dropped = sources.length < v.sources.length;
  if (v.verdict !== "needs_source" && sources.length === 0) {
    return {
      verdict: "needs_source",
      sources,
      correction: null,
      downgraded: dropped ? "unverified_source" : "no_source",
    };
  }
  return {
    verdict: v.verdict,
    sources,
    correction: v.verdict === "incorrect" ? v.correction?.trim() || null : null,
  };
}

export function summarize(results: Pick<FactResult, "verdict">[]): FactSummary {
  const s: FactSummary = { correct: 0, incorrect: 0, needs_source: 0 };
  for (const r of results) s[r.verdict]++;
  return s;
}

/**
 * Model quotes are not always byte-exact (quotes, apostrophes, spaces).
 * Returns the claim as it is written in the paragraph, or null.
 */
export function locateInParagraph(paragraph: string, quote: string): string | null {
  if (!quote.trim()) return null;
  if (paragraph.includes(quote)) return quote;
  const fold = (s: string) =>
    s
      .replace(/[‘’ʻʼ`´]/g, "'")
      .replace(/[“”«»„]/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/\s+/g, " ")
      .toLowerCase();
  const p = fold(paragraph);
  const q = fold(quote.trim());
  const at = p.indexOf(q);
  // Folding keeps lengths (one char → one char, runs of spaces aside), so map back
  // through a char index built on the same rules.
  if (at < 0) return null;
  const map: number[] = [];
  let prevSpace = false;
  for (let i = 0; i < paragraph.length; i++) {
    const space = /\s/.test(paragraph[i]!);
    if (space && prevSpace) continue;
    prevSpace = space;
    map.push(i);
  }
  const start = map[at];
  const end = map[at + q.length - 1];
  if (start === undefined || end === undefined) return null;
  return paragraph.slice(start, end + 1);
}

/** Guest key: hashed IP + device cookie, so raw IPs are never stored. */
export function guestKey(ip: string, device: string): string {
  return `g_${hashText("guest", ip, device).slice(0, 32)}`;
}
