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
