import JSZip from "jszip";
import mammoth from "mammoth";

export const MAX_DOCX_BYTES = 10 * 1024 * 1024;

export type DocxError = "too_large" | "not_docx" | "macros" | "corrupt" | "empty";

/**
 * Validates an uploaded manuscript (TZ 7.3, 17): .docx only, ≤ 10 MB, a real
 * Office Open XML package, and no macros (VBA projects are rejected).
 */
export async function validateDocx(file: {
  name: string;
  size: number;
  buffer: Buffer;
}): Promise<DocxError | null> {
  if (file.size > MAX_DOCX_BYTES) return "too_large";
  if (!/\.docx$/i.test(file.name)) return "not_docx";
  if (file.buffer.subarray(0, 2).toString("latin1") !== "PK") return "not_docx";
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file.buffer);
  } catch {
    return "corrupt";
  }
  if (!zip.file("word/document.xml")) return "not_docx";
  const contentTypes = (await zip.file("[Content_Types].xml")?.async("string")) ?? "";
  const hasVba = Object.keys(zip.files).some((n) => /vbaProject\.bin$|vbaData\.xml$/i.test(n));
  if (hasVba || /macroEnabled/i.test(contentTypes)) return "macros";
  return null;
}

export async function extractDocx(buffer: Buffer): Promise<{ html: string; text: string }> {
  const [html, raw] = await Promise.all([
    mammoth.convertToHtml({ buffer }),
    mammoth.extractRawText({ buffer }),
  ]);
  return { html: html.value, text: raw.value };
}

/** Section headings required by the journal template (TZ 16). */
export const REQUIRED_SECTIONS = [
  {
    key: "introduction",
    patterns: [
      /^\s*(\d+\.?\s*)?kirish\b/i,
      /^\s*(\d+\.?\s*)?introduction\b/i,
      /^\s*(\d+\.?\s*)?введение(?![\p{L}])/iu,
    ],
  },
  {
    key: "methods",
    patterns: [
      /materiallar va usullar|^\s*(\d+\.?\s*)?usullar\b/i,
      /methods/i,
      /методы|материалы и методы/i,
    ],
  },
  {
    key: "results",
    patterns: [/^\s*(\d+\.?\s*)?natijalar\b/i, /^\s*(\d+\.?\s*)?results\b/i, /результаты/i],
  },
  {
    key: "discussion",
    patterns: [/^\s*(\d+\.?\s*)?muhokama\b/i, /^\s*(\d+\.?\s*)?discussion\b/i, /обсуждение/i],
  },
  {
    key: "conclusion",
    patterns: [
      /^\s*(\d+\.?\s*)?xulosa\b/i,
      /^\s*(\d+\.?\s*)?conclusions?\b/i,
      /заключение|выводы/i,
    ],
  },
  {
    key: "references",
    patterns: [
      /adabiyotlar/i,
      /^\s*references\b|^\s*bibliography\b/i,
      /литература|список литературы/i,
    ],
  },
] as const;

export type TemplateReport = {
  words: number;
  sections: Record<(typeof REQUIRED_SECTIONS)[number]["key"], boolean>;
  references: number;
  referencesWithYear: number;
  referencesWithDoi: number;
};

const isReferencesHeading = (line: string) =>
  /^\s*(foydalanilgan\s+)?adabiyotlar|^\s*references\b|^\s*bibliography\b|^\s*список литературы|^\s*литература/i.test(
    line,
  );

/**
 * Checks a manuscript against the template: length without references,
 * required sections, number and format of references (APA 7 year in parentheses).
 */
export function analyzeManuscript(text: string): TemplateReport {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const refIndex = lines.findIndex((l) => l.length < 60 && isReferencesHeading(l));
  const body = refIndex >= 0 ? lines.slice(0, refIndex) : lines;
  const refs = refIndex >= 0 ? lines.slice(refIndex + 1).filter((l) => l.length > 20) : [];

  const headings = lines.filter((l) => l.length < 80);
  const sections = Object.fromEntries(
    REQUIRED_SECTIONS.map((s) => [s.key, headings.some((h) => s.patterns.some((p) => p.test(h)))]),
  ) as TemplateReport["sections"];

  return {
    words: body
      .join(" ")
      .split(/\s+/)
      .filter((w) => /[\p{L}\p{N}]/u.test(w)).length,
    sections,
    references: refs.length,
    referencesWithYear: refs.filter((r) => /\((19|20)\d{2}[a-z]?\)/.test(r)).length,
    referencesWithDoi: refs.filter((r) => /\b10\.\d{4,9}\/\S+/i.test(r)).length,
  };
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
