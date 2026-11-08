import data from "./corpus/uz-examples.json";

/**
 * Real passages from Uzbek-language journal articles (CC BY 4.0, Zenodo) that
 * Xorazmiy Ustoz shows as examples. Each was read and graded by hand:
 * "good" passages model a section well; "weak" ones (with a note on why) are
 * shown as what not to do. Passages with spelling or extraction errors were
 * left out. Sources: «Maktabgacha va maktab ta’limi», «Yashil iqtisodiyot va
 * taraqqiyot», «Muhandislik va iqtisodiyot», «Raqamli iqtisodiyot»,
 * «Al-Farg‘oniy avlodlari», agrarian and medical journals.
 */

export type ExampleKind =
  | "abstract"
  | "aim"
  | "gap"
  | "literature"
  | "method"
  | "limitations"
  | "results"
  | "discussion"
  | "conclusion";

export type CorpusExample = {
  kind: ExampleKind;
  quality: "good" | "weak";
  note: string | null;
  text: string;
  title: string;
  authors: string[];
  journal: string;
  year: string;
  field: string;
  url: string;
  license: string;
};

export const EXAMPLES = data as CorpusExample[];

/** Which kinds of passage help at each Ustoz stage (1–7). */
const BY_STAGE: Record<number, ExampleKind[]> = {
  1: ["aim", "gap"],
  2: ["literature", "gap"],
  3: ["method", "limitations"],
  4: ["results"],
  5: ["discussion", "limitations"],
  6: ["conclusion", "abstract"],
  7: ["abstract"],
};

const stem = (w: string) =>
  w
    .toLowerCase()
    .replace(/[ʻ‘’'`ʼ]/g, "")
    .slice(0, 5);
const words = (s: string) =>
  new Set(
    s
      .split(/[^\p{L}ʻ‘’'ʼ]+/u)
      .filter((w) => w.length >= 4)
      .map(stem),
  );

function overlap(a: Set<string>, b: Set<string>) {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

/** Small deterministic hash, so the same draft does not always get the same pair. */
function seed(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Up to two passages for a stage: the closest "good" one by topic, plus a
 * "weak" one of the same kind for contrast when there is one.
 */
export function pickExamples(stage: number, topic: string, salt = ""): CorpusExample[] {
  const kinds = BY_STAGE[stage] ?? BY_STAGE[1]!;
  const t = words(topic);
  const rank = (pool: CorpusExample[]) =>
    pool
      .map((e) => ({
        e,
        score: overlap(t, words(`${e.title} ${e.field} ${e.text}`)) * 10 + (seed(salt + e.url) % 7),
      }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.e);
  const good = rank(EXAMPLES.filter((e) => kinds.includes(e.kind) && e.quality === "good"));
  const first = good[0];
  if (!first) return [];
  const weak = rank(EXAMPLES.filter((e) => e.kind === first.kind && e.quality === "weak"))[0];
  return weak ? [first, weak] : [first];
}

const KIND_LABEL: Record<ExampleKind, string> = {
  abstract: "annotatsiya",
  aim: "maqsad",
  gap: "bo‘shliqni ko‘rsatish",
  literature: "adabiyotlar sharhi",
  method: "usul",
  limitations: "cheklovlar",
  results: "natija",
  discussion: "muhokama",
  conclusion: "xulosa",
};

/** The passages as a prompt block, each with its source for attribution. */
export function examplesBlock(examples: CorpusExample[]): string {
  if (!examples.length) return "";
  const items = examples.map((e, i) => {
    const who = e.authors.length ? `${e.authors.join(", ")}` : "muallif ko‘rsatilmagan";
    return `<namuna raqam="${i + 1}" turi="${KIND_LABEL[e.kind]}" baho="${e.quality === "good" ? "yaxshi" : "kuchsiz"}">
${e.text}
Manba: ${who}. “${e.title}”. ${e.journal}, ${e.year}. ${e.url} (CC BY 4.0)${e.note ? `\nIzoh: ${e.note}` : ""}
</namuna>`;
  });
  return `<jurnal_namunalari izoh="Real o‘zbek jurnallaridan, qo‘lda saralangan. Kerak bo‘lsa birini muallifga ko‘rsat: tuzilmasini tushuntir, manbasini ayt; kuchsiz namunani “bunday yozmang” deb, sababini aytib ko‘rsat. Matnini muallifga ko‘chirib berma.">
${items.join("\n")}
</jurnal_namunalari>`;
}
