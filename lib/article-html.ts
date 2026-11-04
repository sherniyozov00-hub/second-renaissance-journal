import sanitizeHtml from "sanitize-html";
import { slugify } from "@/lib/text/uz";

export type TocItem = { id: string; text: string };

const ALLOWED = {
  allowedTags: [
    "h2",
    "h3",
    "h4",
    "p",
    "br",
    "strong",
    "em",
    "b",
    "i",
    "sub",
    "sup",
    "ul",
    "ol",
    "li",
    "blockquote",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "caption",
    "figure",
    "figcaption",
    "img",
    "a",
    "code",
    "pre",
    "hr",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel"],
    img: ["src", "alt", "width", "height"],
    h2: ["id"],
    h3: ["id"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow" }),
  },
} satisfies sanitizeHtml.IOptions;

function stripTags(html: string) {
  return html.replace(/<[^>]+>/g, "").trim();
}

/**
 * Sanitises publication HTML (TZ 17 — XSS protection) and makes sure every
 * H2 has an id, returning the table of contents built from the H2s.
 */
export function prepareArticleHtml(raw: string): { html: string; toc: TocItem[] } {
  const clean = sanitizeHtml(raw, ALLOWED);
  const toc: TocItem[] = [];
  const used = new Set<string>();
  const html = clean.replace(/<h2(?:\s+id="([^"]*)")?>([\s\S]*?)<\/h2>/g, (_m, id, inner) => {
    const text = stripTags(inner);
    let anchor = id || slugify(text) || `section-${toc.length + 1}`;
    while (used.has(anchor)) anchor += "-1";
    used.add(anchor);
    toc.push({ id: anchor, text });
    return `<h2 id="${anchor}">${inner}</h2>`;
  });
  return { html, toc };
}

/**
 * Turns in-text citations "[3]" or "[2, 5]" into links to the reference list
 * (#ref-3) with the reference as a tooltip, as journal sites do. Only numbers
 * that exist in the list are linked; text inside tags is left alone.
 */
export function linkCitations(html: string, references: string[]): string {
  if (!references.length) return html;
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return html.replace(/(>[^<]*)/g, (segment) =>
    segment.replace(/\[(\d{1,3}(?:\s*[,–-]\s*\d{1,3})*)\]/g, (match, inner: string) => {
      const nums = inner.split(/\s*[,–-]\s*/).map(Number);
      if (!nums.every((n) => n >= 1 && n <= references.length)) return match;
      const first = nums[0]!;
      const title = esc(references[first - 1]!.slice(0, 300));
      return `<a class="cite" href="#ref-${first}" title="${title}">[${inner}]</a>`;
    }),
  );
}
