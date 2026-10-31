import { searchNormalize } from "@/lib/search/normalize";

/**
 * Originality against articles already on the platform (TZ 10.1): word
 * 5-gram shingles, containment of the manuscript's shingles in each other
 * text. An external service can replace this behind the same function.
 */
const SHINGLE = 5;

export function shingles(text: string, size = SHINGLE): Set<string> {
  const words = searchNormalize(text).match(/[\p{L}\p{N}]+/gu) ?? [];
  const out = new Set<string>();
  for (let i = 0; i + size <= words.length; i++) out.add(words.slice(i, i + size).join(" "));
  return out;
}

export type OriginalityMatch = { id: string; title: string; overlap: number };

export type OriginalityReport = {
  /** 0–100: share of the manuscript not found in other texts. */
  originality: number;
  matches: OriginalityMatch[];
};

export function originality(
  text: string,
  corpus: { id: string; title: string; text: string }[],
): OriginalityReport {
  const own = shingles(text);
  if (own.size === 0) return { originality: 100, matches: [] };

  const copied = new Set<string>();
  const matches: OriginalityMatch[] = [];
  for (const doc of corpus) {
    const other = shingles(doc.text);
    let hit = 0;
    for (const s of own) {
      if (other.has(s)) {
        hit++;
        copied.add(s);
      }
    }
    if (hit)
      matches.push({ id: doc.id, title: doc.title, overlap: Math.round((hit / own.size) * 100) });
  }
  matches.sort((a, b) => b.overlap - a.overlap);
  return {
    originality: Math.round((1 - copied.size / own.size) * 100),
    matches: matches.slice(0, 5),
  };
}
