/**
 * The workspace document is TipTap (ProseMirror) JSON. These helpers read it
 * on the server and in the browser the same way: every text block (heading,
 * paragraph, table cell paragraph, list item) is one line, and text with a
 * pending "insertion" suggestion is left out — the AI and the export see the
 * author's text until a suggestion is accepted. Pure, unit tested.
 */

export type DocMark = { type: string; attrs?: Record<string, unknown> };
export type DocNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: DocMark[];
};

export const TEXT_BLOCKS = new Set(["paragraph", "heading"]);

export const EMPTY_DOC: DocNode = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "1. Kirish" }] },
    { type: "paragraph" },
  ],
};

export function isDoc(v: unknown): v is DocNode {
  return Boolean(v && typeof v === "object" && (v as DocNode).type === "doc");
}

const pending = (n: DocNode) => n.marks?.some((m) => m.type === "insertion") ?? false;

export function blockText(block: DocNode): string {
  let s = "";
  const walk = (n: DocNode) => {
    if (n.type === "text" && !pending(n)) s += n.text ?? "";
    else if (n.type === "hardBreak") s += " ";
    n.content?.forEach(walk);
  };
  walk(block);
  return s;
}

/** Text blocks in document order. */
export function textBlocks(doc: DocNode): DocNode[] {
  const out: DocNode[] = [];
  const walk = (n: DocNode) => {
    if (TEXT_BLOCKS.has(n.type)) out.push(n);
    else n.content?.forEach(walk);
  };
  walk(doc);
  return out;
}

export function docToText(doc: DocNode): string {
  return textBlocks(doc)
    .map(blockText)
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** Escapes a quote for a whitespace-tolerant search in the editor. */
export function quoteRegExp(quote: string): RegExp {
  const esc = quote
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  return new RegExp(esc);
}
