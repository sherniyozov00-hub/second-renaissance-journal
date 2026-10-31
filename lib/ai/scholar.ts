import { formatApa, formatBibtex, formatGost } from "@/lib/citation";
import type { DraftReference, ScholarItem } from "./schemas";

/**
 * International sources (TZ 10.1, 10.2): OpenAlex, Crossref and Semantic
 * Scholar. Only records these services really return are shown; DOIs are
 * confirmed through Crossref, otherwise the item is marked unverified.
 * Parsers are pure and unit tested; fetchers time out quickly so one slow
 * service does not block the others. SCHOLAR_MODE=mock serves fixtures.
 */

const UA = "SecondRenaissanceJournal/1.0 (mailto:editor@example.com)";
const TIMEOUT = 8000;

function cleanDoi(doi: unknown): string | null {
  if (typeof doi !== "string") return null;
  const m = doi.trim().match(/10\.\d{4,9}\/\S+/);
  return m ? m[0].replace(/[.,;]+$/, "").toLowerCase() : null;
}

function stripTags(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t || null;
}

/** OpenAlex stores abstracts as an inverted index { word: [positions] }. */
export function invertedToText(index: unknown): string | null {
  if (!index || typeof index !== "object") return null;
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index as Record<string, number[]>)) {
    for (const p of positions) words[p] = word;
  }
  const text = words.filter(Boolean).join(" ");
  return text || null;
}

type Json = Record<string, unknown>;
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});

export function parseOpenAlex(body: unknown): ScholarItem[] {
  return arr(obj(body).results).flatMap((w): ScholarItem[] => {
    const title = stripTags(w.display_name ?? w.title);
    const doi = cleanDoi(w.doi);
    const location = obj(w.primary_location);
    const url = doi
      ? `https://doi.org/${doi}`
      : (location.landing_page_url as string) || (w.id as string);
    if (!title || !url) return [];
    return [
      {
        id: `oa:${String(w.id ?? title)
          .split("/")
          .pop()}`,
        title,
        authors: arr(w.authorships)
          .map((a) => String(obj(a.author).display_name ?? ""))
          .filter(Boolean)
          .slice(0, 10),
        year: typeof w.publication_year === "number" ? w.publication_year : null,
        journal: (obj(location.source).display_name as string) ?? null,
        doi,
        url,
        verified: false,
        abstract: invertedToText(w.abstract_inverted_index),
        source: "openalex",
        citedBy: typeof w.cited_by_count === "number" ? w.cited_by_count : null,
      },
    ];
  });
}

function crossrefItem(it: Json): ScholarItem | null {
  const title = stripTags(arr(it.title)[0] ?? (it.title as unknown));
  const doi = cleanDoi(it.DOI);
  if (!title || !doi) return null;
  const parts = arr(obj(it.issued)["date-parts"])[0] as unknown;
  const year = Array.isArray(parts) && typeof parts[0] === "number" ? parts[0] : null;
  return {
    id: `cr:${doi}`,
    title,
    authors: arr(it.author)
      .map((a) => [a.given, a.family].filter(Boolean).join(" ") || String(a.name ?? ""))
      .filter(Boolean)
      .slice(0, 10),
    year,
    journal: (arr(it["container-title"])[0] as unknown as string) ?? null,
    doi,
    url: `https://doi.org/${doi}`,
    // A record that came from Crossref is the DOI check itself.
    verified: true,
    abstract: stripTags(it.abstract),
    source: "crossref",
    citedBy:
      typeof it["is-referenced-by-count"] === "number"
        ? (it["is-referenced-by-count"] as number)
        : null,
  };
}

export function parseCrossref(body: unknown): ScholarItem[] {
  return arr(obj(obj(body).message).items).flatMap((it) => crossrefItem(it) ?? []);
}

export function parseSemanticScholar(body: unknown): ScholarItem[] {
  return arr(obj(body).data).flatMap((p): ScholarItem[] => {
    const title = stripTags(p.title);
    const doi = cleanDoi(obj(p.externalIds).DOI);
    const url = doi ? `https://doi.org/${doi}` : (p.url as string);
    if (!title || !url) return [];
    return [
      {
        id: `s2:${String(p.paperId ?? title)}`,
        title,
        authors: arr(p.authors)
          .map((a) => String(a.name ?? ""))
          .filter(Boolean)
          .slice(0, 10),
        year: typeof p.year === "number" ? p.year : null,
        journal: (p.venue as string) || null,
        doi,
        url,
        verified: false,
        abstract: stripTags(p.abstract),
        source: "semanticscholar",
        citedBy: typeof p.citationCount === "number" ? p.citationCount : null,
      },
    ];
  });
}

const titleKey = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/** One entry per work: DOI first, then normalised title; Crossref wins ties. */
export function mergeResults(lists: ScholarItem[][], limit = 8): ScholarItem[] {
  const out: ScholarItem[] = [];
  for (const item of lists.flat()) {
    const same = out.find(
      (x) => (item.doi && x.doi === item.doi) || titleKey(x.title) === titleKey(item.title),
    );
    if (!same) out.push(item);
    else {
      same.verified ||= item.verified;
      same.abstract ??= item.abstract;
      same.citedBy = Math.max(same.citedBy ?? 0, item.citedBy ?? 0) || same.citedBy;
      same.doi ??= item.doi;
    }
  }
  return out
    .sort(
      (a, b) =>
        Number(Boolean(b.doi)) - Number(Boolean(a.doi)) || (b.citedBy ?? 0) - (a.citedBy ?? 0),
    )
    .slice(0, limit);
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

/** Crossref lookup of a DOI; false when Crossref does not know it. */
export async function verifyDoi(doi: string): Promise<boolean> {
  if (process.env.SCHOLAR_MODE === "mock") return MOCK_ITEMS.some((m) => m.doi === doi);
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(TIMEOUT),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function searchScholar(
  queries: string[],
  limit = 8,
): Promise<{ items: ScholarItem[]; failed: string[] }> {
  if (process.env.SCHOLAR_MODE === "mock") return { items: MOCK_ITEMS.slice(0, limit), failed: [] };
  const failed: string[] = [];
  const run = async (name: string, url: string, parse: (b: unknown) => ScholarItem[]) => {
    try {
      return parse(await getJson(url));
    } catch (e) {
      console.warn("[scholar]", name, e instanceof Error ? e.message : e);
      failed.push(name);
      return [];
    }
  };
  const lists = await Promise.all(
    queries.slice(0, 2).flatMap((q) => {
      const enc = encodeURIComponent(q);
      return [
        run(
          "crossref",
          `https://api.crossref.org/works?query=${enc}&rows=5&select=DOI,title,author,issued,container-title,abstract,is-referenced-by-count`,
          parseCrossref,
        ),
        run("openalex", `https://api.openalex.org/works?search=${enc}&per-page=5`, parseOpenAlex),
        run(
          "semanticscholar",
          `https://api.semanticscholar.org/graph/v1/paper/search?query=${enc}&limit=5&fields=title,authors,year,venue,externalIds,url,abstract,citationCount`,
          parseSemanticScholar,
        ),
      ];
    }),
  );
  const items = mergeResults(lists, limit);
  await Promise.all(
    items.map(async (it) => {
      if (it.doi && !it.verified) it.verified = await verifyDoi(it.doi);
    }),
  );
  return { items, failed: [...new Set(failed)] };
}

export function toCitation(r: DraftReference) {
  return {
    title: r.title,
    authors: r.authors.length ? r.authors : ["[Muallif]"],
    year: r.year ?? new Date().getFullYear(),
    journal: r.journal ?? "",
    doi: r.doi,
    url: r.url,
  };
}

export function citationStrings(r: DraftReference, index = 1) {
  const c = toCitation(r);
  const key = `${
    (r.authors[0] ?? "ref")
      .split(/\s+/)
      .pop()!
      .toLowerCase()
      .replace(/[^a-z]/g, "") || "ref"
  }${r.year ?? ""}${index}`;
  return { apa: formatApa(c), gost: formatGost(c), bibtex: formatBibtex(c, key) };
}

const MOCK_ITEMS: ScholarItem[] = [
  {
    id: "mock:1",
    title: "Drip irrigation and cotton yield: a field experiment",
    authors: ["A. Researcher", "B. Scientist"],
    year: 2021,
    journal: "Agricultural Water Management",
    doi: "10.1016/j.agwat.2021.000001",
    url: "https://doi.org/10.1016/j.agwat.2021.000001",
    verified: true,
    abstract: "Sinov rejimi namunasi (SCHOLAR_MODE=mock).",
    source: "crossref",
    citedBy: 42,
  },
  {
    id: "mock:2",
    title: "Water productivity of irrigated cotton in Central Asia",
    authors: ["C. Author"],
    year: 2019,
    journal: "Irrigation Science",
    doi: null,
    url: "https://openalex.org/W0000000002",
    verified: false,
    abstract: null,
    source: "openalex",
    citedBy: 7,
  },
];
