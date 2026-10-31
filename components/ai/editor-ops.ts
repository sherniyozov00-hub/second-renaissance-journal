import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { quoteRegExp } from "@/lib/ai/doc";

/**
 * Operations on the workspace editor. Paragraph numbers match the text the
 * AI received: every non-empty text block in order, pending insertions left
 * out (same rules as lib/ai/doc.ts on the server).
 */

type Block = { text: string; map: number[] };

function blocks(doc: PMNode): Block[] {
  const out: Block[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let text = "";
    const map: number[] = [];
    node.descendants((child, offset) => {
      const at = pos + 1 + offset;
      if (child.isText) {
        if (child.marks.some((m) => m.type.name === "insertion")) return false;
        for (let i = 0; i < child.text!.length; i++) {
          text += child.text![i];
          map.push(at + i);
        }
      } else if (child.type.name === "hardBreak") {
        text += " ";
        map.push(at);
      }
      return false;
    });
    if (text.trim()) out.push({ text, map });
    return false;
  });
  return out;
}

/** Text sent to the AI: one line per block. */
export function aiText(editor: Editor): string {
  return blocks(editor.state.doc)
    .map((b) => b.text.replace(/\s+/g, " ").trim())
    .join("\n");
}

export function selectedOrAll(editor: Editor): string {
  const { from, to, empty } = editor.state.selection;
  if (!empty) {
    const t = editor.state.doc.textBetween(from, to, "\n").trim();
    if (t.length > 40) return t;
  }
  return aiText(editor);
}

/** Document range of a quote inside paragraph `index`, or null. */
export function findRange(editor: Editor, index: number, quote: string) {
  const b = blocks(editor.state.doc)[index];
  if (!b || !quote.trim()) return null;
  const m = quoteRegExp(quote).exec(b.text);
  if (!m) return null;
  const from = b.map[m.index];
  const last = b.map[m.index + m[0].length - 1];
  if (from === undefined || last === undefined) return null;
  return { from, to: last + 1 };
}

export function clearFacts(editor: Editor) {
  const { tr, doc, schema } = editor.state;
  tr.removeMark(0, doc.content.size, schema.marks.fact);
  tr.setMeta("addToHistory", false);
  editor.view.dispatch(tr);
}

export function markFacts(
  editor: Editor,
  facts: { id: string; paragraph: number; text: string; verdict: string }[],
) {
  const { tr, schema } = editor.state;
  for (const f of facts) {
    const r = findRange(editor, f.paragraph, f.text);
    if (r)
      tr.addMark(r.from, r.to, schema.marks.fact!.create({ verdict: f.verdict, claimId: f.id }));
  }
  tr.setMeta("addToHistory", false);
  editor.view.dispatch(tr);
}

export function removeFact(editor: Editor, claimId: string) {
  const { tr, doc, schema } = editor.state;
  doc.descendants((node, pos) => {
    const mark = node.marks.find((m) => m.type.name === "fact" && m.attrs.claimId === claimId);
    if (mark) tr.removeMark(pos, pos + node.nodeSize, mark);
  });
  editor.view.dispatch(tr);
}

export type TrackedEdit = {
  id: string;
  paragraph: number;
  original: string;
  replacement: string;
};

/**
 * Shows suggestions as tracked changes: the original is marked deleted and
 * the replacement inserted right after it. Applied from the end of the
 * document so earlier positions stay valid. Returns the ids placed.
 */
export function applyTracked(editor: Editor, edits: TrackedEdit[]): string[] {
  const placed = edits
    .map((e) => ({ e, r: findRange(editor, e.paragraph, e.original) }))
    .filter((x): x is { e: TrackedEdit; r: { from: number; to: number } } => Boolean(x.r))
    .sort((a, b) => b.r.from - a.r.from);
  const { tr, schema } = editor.state;
  let lastFrom = Infinity;
  const ids: string[] = [];
  for (const { e, r } of placed) {
    if (r.to > lastFrom) continue; // overlaps a later suggestion
    lastFrom = r.from;
    tr.addMark(r.from, r.to, schema.marks.deletion!.create({ sid: e.id }));
    if (e.replacement) {
      tr.insert(r.to, schema.text(e.replacement, [schema.marks.insertion!.create({ sid: e.id })]));
    }
    ids.push(e.id);
  }
  editor.view.dispatch(tr);
  return ids;
}

function ranges(doc: PMNode, type: string, sid: string) {
  const out: { from: number; to: number }[] = [];
  doc.descendants((node, pos) => {
    if (node.isText && node.marks.some((m) => m.type.name === type && m.attrs.sid === sid)) {
      out.push({ from: pos, to: pos + node.nodeSize });
    }
  });
  return out.sort((a, b) => b.from - a.from);
}

/** Accept: drop the deleted text, keep the inserted. Reject: the opposite. */
export function resolveTracked(editor: Editor, sid: string, accept: boolean) {
  const { tr, doc, schema } = editor.state;
  const remove = ranges(doc, accept ? "deletion" : "insertion", sid);
  const keep = ranges(doc, accept ? "insertion" : "deletion", sid);
  const keepType = schema.marks[accept ? "insertion" : "deletion"];
  for (const r of keep) tr.removeMark(r.from, r.to, keepType);
  for (const r of remove) tr.delete(r.from, r.to);
  editor.view.dispatch(tr);
}

export function pendingIds(editor: Editor): Set<string> {
  const ids = new Set<string>();
  editor.state.doc.descendants((node) => {
    for (const m of node.marks) {
      if ((m.type.name === "insertion" || m.type.name === "deletion") && m.attrs.sid)
        ids.add(m.attrs.sid);
    }
  });
  return ids;
}

/** Inserts text right after a claim (in-text citation). */
export function insertAfter(editor: Editor, paragraph: number, quote: string, text: string) {
  const r = findRange(editor, paragraph, quote);
  const at = r ? r.to : editor.state.selection.to;
  editor.chain().focus().insertContentAt(at, text).run();
}

export function scrollToClaim(editor: Editor, claimId: string) {
  const el = editor.view.dom.querySelector(`[data-claim="${CSS.escape(claimId)}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/** "1-bo‘lim, 2-xatboshi" for each AI paragraph: sections are counted by headings. */
export function paragraphLocations(
  editor: Editor,
): { section: number; paragraph: number; heading: boolean }[] {
  const out: { section: number; paragraph: number; heading: boolean }[] = [];
  let section = 0;
  let paragraph = 0;
  editor.state.doc.descendants((node) => {
    if (!node.isTextblock) return true;
    if (!node.textContent.trim()) return false;
    if (node.type.name === "heading") {
      section++;
      paragraph = 0;
      out.push({ section, paragraph: 0, heading: true });
    } else {
      paragraph++;
      out.push({ section: Math.max(section, 1), paragraph, heading: false });
    }
    return false;
  });
  return out;
}
