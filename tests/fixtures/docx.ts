import JSZip from "jszip";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Builds a minimal valid .docx from paragraphs; `macro` adds a VBA project. */
export async function makeDocx(
  paragraphs: string[],
  opts: { macro?: boolean } = {},
): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  const body = paragraphs
    .map((p) => `<w:p><w:r><w:t xml:space="preserve">${esc(p)}</w:t></w:r></w:p>`)
    .join("");
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
  );
  if (opts.macro) zip.file("word/vbaProject.bin", "fake");
  return zip.generateAsync({ type: "nodebuffer" });
}

/** A manuscript that follows the template (TZ 16). */
export function sampleManuscript(words = 3200, references = 10): string[] {
  const filler = (n: number, seed: string) =>
    Array.from({ length: n }, (_, i) => `${seed}${i % 97} so‘z${(i * 7) % 13}`).join(" ");
  const per = Math.floor(words / 10);
  return [
    "Sarlavha",
    "1. Kirish",
    filler(per, "kirish"),
    "2. Materiallar va usullar",
    filler(per, "usul"),
    "3. Natijalar",
    filler(per, "natija"),
    "4. Muhokama",
    filler(per, "muhokama"),
    "5. Xulosa",
    filler(per, "xulosa"),
    "Foydalanilgan adabiyotlar",
    ...Array.from(
      { length: references },
      (_, i) =>
        `Muallif, A. (20${10 + i}). Maqola nomi ${i}. Jurnal, 1(2), 3–4. https://doi.org/10.1000/x${i}`,
    ),
  ];
}
