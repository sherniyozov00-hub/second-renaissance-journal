import { cyrillicToLatin, hasCyrillic, normalizeUz } from "@/lib/text/uz";

/**
 * Search normalisation — must match the SQL function uz_search_norm():
 * lower-case, ö/ğ folded, apostrophes removed ("O‘zbek" → "ozbek").
 */
export function searchNormalize(input: string): string {
  return normalizeUz(input).replace(/'/g, "");
}

/** Word tokens of a normalised string (letters and digits only). */
export function tokenize(input: string): string[] {
  return searchNormalize(input).match(/[\p{L}\p{N}]+/gu) ?? [];
}

/**
 * Query variants to search for: the query itself and, for Cyrillic input, its
 * Latin transliteration ("агротехнология" → "agrotexnologiya").
 */
export function queryVariants(q: string): string[][] {
  const variants = [tokenize(q)];
  if (hasCyrillic(q)) variants.push(tokenize(cyrillicToLatin(q)));
  return variants.filter((v) => v.length > 0).slice(0, 2);
}

/**
 * to_tsquery('simple', …) input with prefix matching on every word, so that
 * "agrotexnologiya" also finds "agrotexnologiyalar" (TZ 8: word suffixes).
 * Example: (agrotexnologiya:* & paxta:*) | (агротехнология:*).
 */
export function buildTsQuery(q: string): string | null {
  const groups = queryVariants(q)
    .map((tokens) =>
      tokens
        .slice(0, 8)
        .map((t) => `${t}:*`)
        .join(" & "),
    )
    .filter(Boolean);
  if (!groups.length) return null;
  return groups.map((g) => `(${g})`).join(" | ");
}

/** Normalised Latin form used for trigram (typo-tolerant) matching. */
export function trigramQuery(q: string): string {
  return searchNormalize(hasCyrillic(q) ? cyrillicToLatin(q) : q).trim();
}

export type Segment = { text: string; hit: boolean };

/**
 * Length of the original-text prefix of `word` that matches one of the
 * normalised tokens, or 0. "agrotexnologiyalar" + "agrotexnologiya" → 15;
 * "O‘zbekiston" + "ozbek" → 6 (the apostrophe is counted in the original).
 */
function matchedPrefix(word: string, tokens: string[]): number {
  const norm = tokenize(word)[0];
  if (!norm) return 0;
  const token = tokens.filter((t) => norm.startsWith(t)).sort((a, b) => b.length - a.length)[0];
  if (!token) return 0;
  const lead = word.length - word.trimStart().length;
  for (let i = lead + 1; i <= word.length; i++) {
    if ((tokenize(word.slice(0, i))[0] ?? "").length >= token.length) return i;
  }
  return word.length;
}

function pushSegment(segments: Segment[], text: string, hit: boolean) {
  if (!text) return;
  const last = segments.at(-1);
  if (last && last.hit === hit) last.text += text;
  else segments.push({ text, hit });
}

function markWords(words: string[], tokens: string[], segments: Segment[]) {
  for (const w of words) {
    const n = /\S/.test(w) ? matchedPrefix(w, tokens) : 0;
    pushSegment(segments, w.slice(0, n), true);
    pushSegment(segments, w.slice(n), false);
  }
}

/** Marks the matched prefixes in a short text such as a title. */
export function highlightText(text: string, q: string): Segment[] {
  const segments: Segment[] = [];
  markWords(text.split(/(\s+)/), queryVariants(q).flat(), segments);
  return segments;
}

/**
 * Builds a snippet around the first matching word and marks the matched part
 * of every word that starts with a query token (works across o‘/o' spellings
 * and for Cyrillic input).
 */
export function highlightSnippet(text: string, q: string, maxLength = 220): Segment[] {
  const tokens = queryVariants(q).flat();
  const words = text.split(/(\s+)/);
  const firstHit = words.findIndex((w) => /\S/.test(w) && matchedPrefix(w, tokens) > 0);

  let start = 0;
  if (firstHit > 0) {
    // Keep ~60 characters of context before the first hit.
    let chars = 0;
    start = firstHit;
    while (start > 0 && chars < 60) {
      start--;
      chars += words[start]!.length;
    }
  }

  let end = start;
  let length = 0;
  while (end < words.length && length < maxLength) length += words[end++]!.length;

  const segments: Segment[] = [];
  if (start > 0) pushSegment(segments, "…", false);
  markWords(words.slice(start, end), tokens, segments);
  if (end < words.length) pushSegment(segments, "…", false);
  return segments;
}

/** True when the text contains a word matching the query. */
export function hasMatch(text: string, q: string): boolean {
  const tokens = queryVariants(q).flat();
  return text.split(/\s+/).some((w) => matchedPrefix(w, tokens) > 0);
}
