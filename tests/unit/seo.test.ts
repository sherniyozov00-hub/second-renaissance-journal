import { describe, expect, it } from "vitest";
import { scholarMetaTags } from "@/components/seo/scholar-meta";
import { relatedKeywords } from "@/lib/search/query";
import { jsonLd, truncate } from "@/lib/seo";
import { breadcrumbList, homeGraph, scholarlyArticle } from "@/lib/structured-data";

const journal = {
  name: "The Third Renaissance of Uzbekistan",
  url: "https://x.uz/",
  issn: "[RAQAM]",
};

describe("Google Scholar meta tags", () => {
  const tags = scholarMetaTags({
    title: "Sarlavha",
    authors: [
      { name: "Aziza Karimova", institution: "TDAU" },
      { name: "Bekzod Rahimov", institution: "[Muassasa nomi]" },
    ],
    publicationDate: new Date("2026-10-20T00:00:00Z"),
    journalTitle: journal.name,
    volume: 1,
    issue: 1,
    firstPage: 3,
    lastPage: 12,
    pdfUrl: "https://x.uz/maqola/s/pdf",
    abstractUrl: "https://x.uz/maqola/s",
    language: "uz",
    keywords: ["paxta", "suv"],
    doi: null,
    issn: "[RAQAM]",
  });

  it("puts each institution right after its author and skips placeholders", () => {
    const names = tags.map(([n]) => n);
    expect(names.slice(0, 4)).toEqual([
      "citation_title",
      "citation_author",
      "citation_author_institution",
      "citation_author",
    ]);
    expect(tags).not.toContainEqual(["citation_author_institution", "[Muassasa nomi]"]);
    expect(names).not.toContain("citation_issn");
    expect(names).not.toContain("citation_doi");
  });

  it("uses Scholar's date format and includes the required fields", () => {
    const map = Object.fromEntries(tags);
    expect(map.citation_publication_date).toBe("2026/10/20");
    expect(map.citation_firstpage).toBe("3");
    expect(map.citation_lastpage).toBe("12");
    expect(map.citation_pdf_url).toBe("https://x.uz/maqola/s/pdf");
    expect(map.citation_keywords).toBe("paxta; suv");
  });
});

describe("JSON-LD", () => {
  it("describes a ScholarlyArticle inside an issue of the periodical", () => {
    const data = scholarlyArticle({
      url: "https://x.uz/maqola/s",
      title: "Sarlavha",
      abstract: "Annotatsiya",
      keywords: ["paxta"],
      language: "uz",
      datePublished: new Date("2026-10-20T00:00:00Z"),
      dateModified: new Date("2026-10-21T00:00:00Z"),
      authors: [{ name: "Aziza Karimova", affiliation: "TDAU", orcid: "0000-0002-1825-0097" }],
      pdfUrl: "https://x.uz/maqola/s/pdf",
      pageStart: 3,
      pageEnd: 12,
      issue: { number: 1, year: 2026, url: "https://x.uz/son/2026-1" },
      journal,
    });
    expect(data["@type"]).toBe("ScholarlyArticle");
    expect(data.author[0]).toEqual({
      "@type": "Person",
      name: "Aziza Karimova",
      affiliation: { "@type": "Organization", name: "TDAU" },
      sameAs: "https://orcid.org/0000-0002-1825-0097",
    });
    expect(data.isPartOf["@type"]).toBe("PublicationIssue");
    expect(
      (data.isPartOf as { isPartOf: { "@type": string; issn?: string } }).isPartOf,
    ).toMatchObject({
      "@type": "Periodical",
    });
    // The ISSN placeholder is not published.
    expect(JSON.stringify(data)).not.toContain("[RAQAM]");
  });

  it("adds a SearchAction on the home page", () => {
    const g = homeGraph({
      name: journal.name,
      url: "https://x.uz/",
      searchUrl: "https://x.uz/maqolalar",
      description: "d",
    });
    const site = g["@graph"][1] as { potentialAction: { target: { urlTemplate: string } } };
    expect(site.potentialAction.target.urlTemplate).toBe(
      "https://x.uz/maqolalar?q={search_term_string}",
    );
  });

  it("numbers breadcrumb items from 1", () => {
    const b = breadcrumbList([
      { name: "Bosh sahifa", url: "https://x.uz/" },
      { name: "Maqola", url: "https://x.uz/maqola/s" },
    ]);
    expect(b.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });

  it("cannot break out of the script tag", () => {
    expect(jsonLd({ a: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});

describe("helpers", () => {
  it("truncates descriptions to 155 characters on a word boundary", () => {
    const t = truncate("so‘z ".repeat(60), 155);
    expect(t.length).toBeLessThanOrEqual(155);
    expect(t.endsWith("…")).toBe(true);
  });

  it("suggests related keywords that differ from the query", () => {
    const items = [
      { keywords: ["agrotexnologiya", "aqlli fermerlik", "IoT"] },
      { keywords: ["agrotexnologiyalar", "aqlli fermerlik", "sug‘orish"] },
    ];
    expect(relatedKeywords(items, "agrotexnologiya")).toEqual([
      "aqlli fermerlik",
      "IoT",
      "sug‘orish",
    ]);
  });
});
