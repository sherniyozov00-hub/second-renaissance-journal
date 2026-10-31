/**
 * Citation strings for the "Iqtibos keltirish" box (Ekran 4): APA 7, GOST R 7.0.5
 * and BibTeX. Pure functions so they can be unit tested.
 */

export type CitationInput = {
  title: string;
  authors: string[];
  /** null when the source gives no date: APA "n.d.", GOST "б. г.". */
  year: number | null;
  journal: string;
  volume?: number | null;
  issue?: number | null;
  pages?: string | null;
  doi?: string | null;
  url: string;
};

function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  const last = parts.pop() ?? "";
  return { last, first: parts };
}

/** "Aziza Karimova" → "Karimova, A." */
function apaName(full: string) {
  const { last, first } = splitName(full);
  const initials = first.map((p) => `${p[0]!.toUpperCase()}.`).join(" ");
  return initials ? `${last}, ${initials}` : last;
}

/** "Aziza Karimova" → "Karimova A." */
function gostName(full: string) {
  const { last, first } = splitName(full);
  const initials = first.map((p) => `${p[0]!.toUpperCase()}.`).join(" ");
  return initials ? `${last} ${initials}` : last;
}

function apaAuthors(names: string[]) {
  const list = names.map(apaName);
  if (list.length <= 1) return list.join("");
  if (list.length === 2) return `${list[0]}, & ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, & ${list.at(-1)}`;
}

export function formatApa(c: CitationInput): string {
  const volume = c.volume ? ` ${c.volume}` : "";
  const issue = c.issue ? `(${c.issue})` : "";
  const pages = c.pages ? `, ${c.pages}` : "";
  const link = c.doi ? ` https://doi.org/${c.doi}` : ` ${c.url}`;
  const source = c.journal ? ` ${c.journal},${volume}${issue}${pages}.` : "";
  return `${apaAuthors(c.authors)} (${c.year ?? "n.d."}). ${c.title}.${source}${link}`;
}

export function formatGost(c: CitationInput): string {
  const [first, ...rest] = c.authors;
  const lead = first ? `${gostName(first)} ` : "";
  const all = c.authors.map(gostName).join(", ");
  const issue = c.issue ? ` № ${c.issue}.` : "";
  const pages = c.pages ? ` С. ${c.pages}.` : "";
  const doi = c.doi ? ` DOI: ${c.doi}.` : "";
  const responsibility = rest.length ? ` / ${all}` : "";
  const source = c.journal ? ` // ${c.journal}.` : ".";
  return `${lead}${c.title}${responsibility}${source} ${c.year ?? "б. г."}.${issue}${pages}${doi} URL: ${c.url}`;
}

export function formatBibtex(c: CitationInput, key: string): string {
  const fields: [string, string | number | null | undefined][] = [
    ["title", c.title],
    ["author", c.authors.map(apaName).join(" and ")],
    ["journal", c.journal],
    ["year", c.year],
    ["volume", c.volume],
    ["number", c.issue],
    ["pages", c.pages?.replace("–", "--")],
    ["doi", c.doi],
    ["url", c.url],
  ];
  const body = fields
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `  ${k} = {${v}}`)
    .join(",\n");
  return `@article{${key},\n${body}\n}`;
}
