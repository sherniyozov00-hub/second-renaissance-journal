/**
 * Google Scholar (Highwire Press) meta tags — TZ 9.3. Rendered as elements so
 * that each citation_author is followed by its own citation_author_institution,
 * which Scholar relies on; React hoists them into <head>.
 */
export type ScholarMetaInput = {
  title: string;
  authors: { name: string; institution?: string | null }[];
  publicationDate: Date | null;
  journalTitle: string;
  volume?: number | null;
  issue?: number | null;
  firstPage?: number | null;
  lastPage?: number | null;
  pdfUrl: string;
  abstractUrl: string;
  language: string;
  keywords: string[];
  doi?: string | null;
  issn?: string | null;
};

const isPlaceholder = (v: string) => /^\[.*\]$/.test(v.trim());

/** Ordered [name, content] pairs; exported for tests. */
export function scholarMetaTags(m: ScholarMetaInput): [string, string][] {
  const tags: [string, string][] = [["citation_title", m.title]];
  for (const a of m.authors) {
    tags.push(["citation_author", a.name]);
    if (a.institution && !isPlaceholder(a.institution))
      tags.push(["citation_author_institution", a.institution]);
  }
  if (m.publicationDate) {
    // Scholar expects YYYY/MM/DD.
    tags.push([
      "citation_publication_date",
      m.publicationDate.toISOString().slice(0, 10).replace(/-/g, "/"),
    ]);
  }
  tags.push(["citation_journal_title", m.journalTitle]);
  if (m.volume) tags.push(["citation_volume", String(m.volume)]);
  if (m.issue) tags.push(["citation_issue", String(m.issue)]);
  if (m.firstPage) tags.push(["citation_firstpage", String(m.firstPage)]);
  if (m.lastPage) tags.push(["citation_lastpage", String(m.lastPage)]);
  tags.push(["citation_pdf_url", m.pdfUrl]);
  tags.push(["citation_abstract_html_url", m.abstractUrl]);
  tags.push(["citation_language", m.language]);
  if (m.keywords.length) tags.push(["citation_keywords", m.keywords.join("; ")]);
  if (m.doi) tags.push(["citation_doi", m.doi]);
  if (m.issn && !isPlaceholder(m.issn)) tags.push(["citation_issn", m.issn]);
  return tags;
}

export function ScholarMeta(props: ScholarMetaInput) {
  return (
    <>
      {scholarMetaTags(props).map(([name, content], i) => (
        <meta key={`${name}-${i}`} name={name} content={content} />
      ))}
    </>
  );
}
