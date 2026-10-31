import JSZip from "jszip";
import { type DocNode, TEXT_BLOCKS } from "./doc";
import type { DraftReference } from "./schemas";
import { citationStrings } from "./scholar";

/**
 * Workspace draft → .docx ("Yuklab olish", and the manuscript sent with
 * "Jurnalga yuborish"). Headings, paragraphs, bold/italic, lists and tables;
 * images become a placeholder. Pending AI suggestions are not applied.
 * Times New Roman 14 / 1.5 lines, as the journal template asks (TZ 16).
 */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function runs(block: DocNode, base: { bold?: boolean; size?: number } = {}): string {
  const out: string[] = [];
  const walk = (n: DocNode) => {
    if (n.type === "text") {
      if (n.marks?.some((m) => m.type === "insertion")) return;
      const bold = base.bold || n.marks?.some((m) => m.type === "bold");
      const italic = n.marks?.some((m) => m.type === "italic");
      const props = `${bold ? "<w:b/>" : ""}${italic ? "<w:i/>" : ""}${base.size ? `<w:sz w:val="${base.size}"/>` : ""}`;
      out.push(
        `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${esc(n.text ?? "")}</w:t></w:r>`,
      );
    } else if (n.type === "hardBreak") out.push("<w:r><w:br/></w:r>");
    else n.content?.forEach(walk);
  };
  walk(block);
  return out.join("");
}

function paragraph(inner: string, opts: { center?: boolean; prefix?: string } = {}) {
  const pPr = `<w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/>${opts.center ? '<w:jc w:val="center"/>' : '<w:jc w:val="both"/>'}</w:pPr>`;
  const prefix = opts.prefix
    ? `<w:r><w:t xml:space="preserve">${esc(opts.prefix)}</w:t></w:r>`
    : "";
  return `<w:p>${pPr}${prefix}${inner}</w:p>`;
}

function blocks(nodes: DocNode[] | undefined, listPrefix?: (i: number) => string): string {
  return (nodes ?? [])
    .map((n, i) => {
      if (n.type === "heading") {
        const level = Number(n.attrs?.level ?? 2);
        return paragraph(runs(n, { bold: true, size: level <= 1 ? 32 : level === 2 ? 30 : 28 }));
      }
      if (n.type === "paragraph") return paragraph(runs(n), { prefix: listPrefix?.(i) });
      if (n.type === "bulletList") return blocks(n.content, () => "• ");
      if (n.type === "orderedList") return blocks(n.content, (j) => `${j + 1}. `);
      if (n.type === "listItem")
        return blocks(n.content, listPrefix ? () => listPrefix(i) : undefined);
      if (n.type === "blockquote") return blocks(n.content);
      if (n.type === "image")
        return paragraph(
          `<w:r><w:t>[Rasm${n.attrs?.alt ? `: ${esc(String(n.attrs.alt))}` : ""}]</w:t></w:r>`,
          { center: true },
        );
      if (n.type === "table") {
        const rows = (n.content ?? [])
          .map(
            (row) =>
              `<w:tr>${(row.content ?? [])
                .map(
                  (cell) =>
                    `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${
                      (cell.content ?? [])
                        .filter((c) => TEXT_BLOCKS.has(c.type))
                        .map((c) => paragraph(runs(c, { bold: cell.type === "tableHeader" })))
                        .join("") || "<w:p/>"
                    }</w:tc>`,
                )
                .join("")}</w:tr>`,
          )
          .join("");
        const border = (side: string) =>
          `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`;
        return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(border).join("")}</w:tblBorders></w:tblPr>${rows}</w:tbl><w:p/>`;
      }
      return n.content ? blocks(n.content) : "";
    })
    .join("");
}

export async function draftToDocx(draft: {
  title: string;
  body: DocNode;
  references: DraftReference[];
}): Promise<Buffer> {
  const refs = draft.references.length
    ? paragraph(
        runs(
          { type: "p", content: [{ type: "text", text: "Foydalanilgan adabiyotlar" }] },
          { bold: true, size: 30 },
        ),
      ) +
      draft.references
        .map((r, i) =>
          paragraph(
            `<w:r><w:t xml:space="preserve">${esc(`${i + 1}. ${citationStrings(r, i + 1).apa}`)}</w:t></w:r>`,
          ),
        )
        .join("")
    : "";
  const body =
    paragraph(
      runs({ type: "p", content: [{ type: "text", text: draft.title }] }, { bold: true, size: 32 }),
      { center: true },
    ) +
    blocks(draft.body.content) +
    refs;

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  );
  zip.file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="28"/><w:lang w:val="uz-Latn-UZ"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}
