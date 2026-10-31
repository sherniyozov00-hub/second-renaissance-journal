import { normalizeUz } from "@/lib/text/uz";

/**
 * OTMlar reytingi (TZ 7-bosqich): universities ranked by articles published
 * in the journal. The institution is the affiliation each author gave in the
 * article or their profile. Placeholders such as "[Muassasa nomi]" are left out.
 */
export type RankingInput = {
  articleId: string;
  year: number;
  views: number;
  citations: number;
  authors: { key: string; affiliation: string | null }[];
};

export type RankingRow = {
  name: string;
  articles: number;
  authors: number;
  views: number;
  citations: number;
};

/** "Toshkent davlat agrar universiteti, Toshkent" → its name before the city. */
export function institutionName(affiliation: string | null | undefined): string | null {
  const raw = (affiliation ?? "").replace(/\s+/g, " ").trim();
  if (!raw || /^\[.*\]$/.test(raw) || raw.startsWith("[")) return null;
  const name = raw.split(/[;,]/)[0]!.trim();
  return name.length >= 3 ? name : null;
}

export function rankInstitutions(items: RankingInput[]): RankingRow[] {
  const map = new Map<
    string,
    {
      names: Map<string, number>;
      articles: Set<string>;
      authors: Set<string>;
      views: number;
      citations: number;
    }
  >();
  for (const a of items) {
    const seen = new Set<string>();
    for (const au of a.authors) {
      const name = institutionName(au.affiliation);
      if (!name) continue;
      const key = normalizeUz(name).replace(/[«»"“”]/g, "");
      let row = map.get(key);
      if (!row) {
        row = { names: new Map(), articles: new Set(), authors: new Set(), views: 0, citations: 0 };
        map.set(key, row);
      }
      row.names.set(name, (row.names.get(name) ?? 0) + 1);
      row.authors.add(au.key);
      if (!seen.has(key)) {
        seen.add(key);
        row.articles.add(a.articleId);
        row.views += a.views;
        row.citations += a.citations;
      }
    }
  }
  return [...map.values()]
    .map((r) => ({
      // The spelling used most often.
      name: [...r.names.entries()].sort((x, y) => y[1] - x[1])[0]![0],
      articles: r.articles.size,
      authors: r.authors.size,
      views: r.views,
      citations: r.citations,
    }))
    .sort(
      (a, b) =>
        b.articles - a.articles ||
        b.citations - a.citations ||
        b.views - a.views ||
        a.name.localeCompare(b.name),
    );
}
