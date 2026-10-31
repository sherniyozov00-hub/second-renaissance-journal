import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * Editor marks of the Xorazmiy AI workspace (Ekran 3):
 * - fact: green / red / yellow underline from the fact check;
 * - insertion / deletion: tracked changes (added text on a blue background,
 *   removed text struck through in red), each tied to one suggestion id.
 */

export const FactMark = Mark.create({
  name: "fact",
  inclusive: false,
  addAttributes() {
    return {
      verdict: { default: "needs_source", parseHTML: (el) => el.getAttribute("data-fact") },
      claimId: { default: null, parseHTML: (el) => el.getAttribute("data-claim") },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-fact]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const { verdict, claimId, ...rest } = HTMLAttributes as Record<string, string>;
    return [
      "span",
      mergeAttributes(rest, {
        "data-fact": verdict,
        "data-claim": claimId,
        class: `fact-mark fact-${verdict}`,
      }),
      0,
    ];
  },
});

export const InsertionMark = Mark.create({
  name: "insertion",
  inclusive: false,
  excludes: "deletion",
  addAttributes() {
    return { sid: { default: null, parseHTML: (el) => el.getAttribute("data-sid") } };
  },
  parseHTML() {
    return [{ tag: "ins[data-sid]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const { sid, ...rest } = HTMLAttributes as Record<string, string>;
    return ["ins", mergeAttributes(rest, { "data-sid": sid, class: "tc-ins" }), 0];
  },
});

export const DeletionMark = Mark.create({
  name: "deletion",
  inclusive: false,
  excludes: "insertion",
  addAttributes() {
    return { sid: { default: null, parseHTML: (el) => el.getAttribute("data-sid") } };
  },
  parseHTML() {
    return [{ tag: "del[data-sid]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const { sid, ...rest } = HTMLAttributes as Record<string, string>;
    return ["del", mergeAttributes(rest, { "data-sid": sid, class: "tc-del" }), 0];
  },
});
