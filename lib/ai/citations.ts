import type { DraftReference } from "./schemas";

/**
 * "Iqtiboslar" (TZ 10.1): checks that in-text citations and the reference
 * list match. Understands APA author–year — (Karimov, 2021),
 * (Karimov va Aliyeva, 2020), (Karimov va boshq., 2019), Karimov (2021),
 * (Smith et al., 2020) — and numeric [1], [2–4]. Pure, unit tested.
 */

export type CitationCheck = {
  style: "apa" | "numeric" | "none";
  /** Citations in the text with no matching reference. */
  missing: string[];
  /** References never cited in the text. */
  uncited: string[];
  matched: number;
};

const surname = (full: string) => {
  const s = full.trim();
  if (s.includes(",")) return s.split(",")[0]!.trim();
  return s.split(/\s+/).pop() ?? s;
};
const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}]/gu, "");

const APA =
  /\(([^()]*?\p{Lu}[\p{L}‘’'-]+(?:\s+(?:va|and|&)\s+\p{Lu}[\p{L}‘’'-]+|\s+(?:va boshq\.|et al\.|и др\.))?,\s*(?:19|20)\d\d[a-z]?(?:;\s*[^()]+?)*)\)|(\p{Lu}[\p{L}‘’'-]+)(?:\s+(?:va boshq\.|et al\.))?\s+\(((?:19|20)\d\d)[a-z]?\)/gu;

type AuthorYear = { label: string; name: string; year: string };

export function findApaCitations(text: string): AuthorYear[] {
  const out: AuthorYear[] = [];
  for (const m of text.matchAll(APA)) {
    if (m[1]) {
      for (const part of m[1].split(";")) {
        const pm = part.trim().match(/(\p{Lu}[\p{L}‘’'-]+).*?,\s*((?:19|20)\d\d)/u);
        if (pm) out.push({ label: part.trim(), name: pm[1]!, year: pm[2]! });
      }
    } else if (m[2] && m[3]) {
      out.push({ label: m[0], name: m[2], year: m[3] });
    }
  }
  return out;
}

export function findNumericCitations(text: string): number[] {
  const nums = new Set<number>();
  for (const m of text.matchAll(/\[(\d+(?:\s*[–-]\s*\d+)?(?:\s*,\s*\d+(?:\s*[–-]\s*\d+)?)*)\]/g)) {
    for (const part of m[1]!.split(",")) {
      const [a, b] = part.split(/[–-]/).map((x) => Number(x.trim()));
      if (b && b >= a! && b - a! < 50) for (let i = a!; i <= b; i++) nums.add(i);
      else if (a) nums.add(a);
    }
  }
  return [...nums].sort((x, y) => x - y);
}

export function checkCitations(text: string, refs: DraftReference[]): CitationCheck {
  const apa = findApaCitations(text);
  const numeric = findNumericCitations(text);
  const label = (r: DraftReference) =>
    `${r.authors[0] ? surname(r.authors[0]) : r.title.slice(0, 40)} (${r.year ?? "y.y."})`;

  if (numeric.length > apa.length) {
    const missing = numeric.filter((n) => n > refs.length).map((n) => `[${n}]`);
    const uncited = refs.flatMap((r, i) =>
      numeric.includes(i + 1) ? [] : [`[${i + 1}] ${label(r)}`],
    );
    return { style: "numeric", missing, uncited, matched: numeric.length - missing.length };
  }
  if (!apa.length) {
    return { style: "none", missing: [], uncited: refs.map(label), matched: 0 };
  }
  const used = new Set<number>();
  const missing: string[] = [];
  let matched = 0;
  for (const c of apa) {
    const i = refs.findIndex(
      (r) =>
        String(r.year ?? "") === c.year && r.authors.some((a) => fold(surname(a)) === fold(c.name)),
    );
    if (i >= 0) {
      used.add(i);
      matched++;
    } else if (!missing.includes(c.label)) missing.push(c.label);
  }
  const uncited = refs.flatMap((r, i) => (used.has(i) ? [] : [label(r)]));
  return { style: "apa", missing, uncited, matched };
}

/** In-text citation the workspace inserts for a reference. */
export function inTextCitation(r: DraftReference, style: "apa" | "numeric", n: number): string {
  if (style === "numeric") return `[${n}]`;
  const names = r.authors.map(surname);
  const who =
    names.length === 0
      ? r.title.split(/\s+/).slice(0, 3).join(" ")
      : names.length === 1
        ? names[0]
        : names.length === 2
          ? `${names[0]} va ${names[1]}`
          : `${names[0]} va boshq.`;
  return `(${who}, ${r.year ?? "y.y."})`;
}
