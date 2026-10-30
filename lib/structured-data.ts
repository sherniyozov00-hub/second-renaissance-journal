/**
 * Schema.org JSON-LD builders (TZ 9.4). Pure functions so they can be tested
 * without a database.
 */

type Person = { name: string; url?: string; affiliation?: string | null; orcid?: string | null };

function person(p: Person) {
  return {
    "@type": "Person",
    name: p.name,
    ...(p.url ? { url: p.url } : {}),
    ...(p.affiliation && !/^\[.*\]$/.test(p.affiliation)
      ? { affiliation: { "@type": "Organization", name: p.affiliation } }
      : {}),
    ...(p.orcid && /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(p.orcid)
      ? { sameAs: `https://orcid.org/${p.orcid}` }
      : {}),
  };
}

export function periodical(opts: {
  name: string;
  url: string;
  issn?: string | null;
  description?: string;
}) {
  return {
    "@type": "Periodical",
    "@id": `${opts.url}#periodical`,
    name: opts.name,
    url: opts.url,
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.issn && !/^\[.*\]$/.test(opts.issn) ? { issn: opts.issn } : {}),
    isAccessibleForFree: true,
    inLanguage: ["uz", "ru", "en"],
  };
}

export function scholarlyArticle(a: {
  url: string;
  title: string;
  abstract: string;
  keywords: string[];
  language: string;
  datePublished: Date | null;
  dateModified: Date;
  authors: Person[];
  pdfUrl: string;
  pageStart?: number | null;
  pageEnd?: number | null;
  doi?: string | null;
  issue?: { number: number; year: number; url: string } | null;
  journal: { name: string; url: string; issn?: string | null };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    "@id": a.url,
    url: a.url,
    headline: a.title.slice(0, 110),
    name: a.title,
    abstract: a.abstract,
    keywords: a.keywords.join(", "),
    inLanguage: a.language,
    ...(a.datePublished ? { datePublished: a.datePublished.toISOString() } : {}),
    dateModified: a.dateModified.toISOString(),
    author: a.authors.map(person),
    license: "https://creativecommons.org/licenses/by/4.0/",
    isAccessibleForFree: true,
    ...(a.pageStart ? { pageStart: a.pageStart } : {}),
    ...(a.pageEnd ? { pageEnd: a.pageEnd } : {}),
    ...(a.doi ? { identifier: { "@type": "PropertyValue", propertyID: "DOI", value: a.doi } } : {}),
    encoding: { "@type": "MediaObject", contentUrl: a.pdfUrl, encodingFormat: "application/pdf" },
    publisher: { "@type": "Organization", name: a.journal.name, url: a.journal.url },
    isPartOf: a.issue
      ? {
          "@type": "PublicationIssue",
          issueNumber: a.issue.number,
          datePublished: String(a.issue.year),
          url: a.issue.url,
          isPartOf: periodical(a.journal),
        }
      : periodical(a.journal),
  };
}

export function breadcrumbList(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function profilePage(p: Person & { url: string; description?: string | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: p.url,
    mainEntity: { ...person(p), ...(p.description ? { description: p.description } : {}) },
  };
}

/** Home page: the journal as a Periodical plus a WebSite with a site search box. */
export function homeGraph(opts: {
  name: string;
  url: string;
  searchUrl: string;
  issn?: string | null;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      periodical({
        name: opts.name,
        url: opts.url,
        issn: opts.issn,
        description: opts.description,
      }),
      {
        "@type": "WebSite",
        "@id": `${opts.url}#website`,
        name: opts.name,
        url: opts.url,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${opts.searchUrl}?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}
