/**
 * Uzbek (Latin) text checks that code can do exactly — no AI, no cost, no
 * guessing. Every check is tied to a written rule:
 *  - "O‘zbek tilining asosiy imlo qoidalari" (Vazirlar Mahkamasining
 *    1995-yil 24-avgustdagi 339-son qarori), rule numbers in `rule`;
 *  - the Latin alphabet law (931-XII, 1995 tahriri): oʻ, gʻ and the tutuq
 *    belgisi ʼ;
 *  - general typography (spaces around punctuation, paired brackets).
 * Checks that depend on meaning (commas in compound sentences, case endings)
 * are left to the AI and the author; nothing here flags a disputed rule.
 */

export type LintSeverity = "error" | "warning" | "info";

export type LintIssue = {
  id: string;
  severity: LintSeverity;
  /** Exact text that triggered the issue. */
  match: string;
  /** Offset of `match` in the text. */
  index: number;
  message: string;
  /** Replacement for `match`, when it is unambiguous. */
  suggestion: string | null;
  rule: string;
};

const CYRILLIC = /[Ѐ-ӿ]/;
const LATIN = /[A-Za-z]/;
/** oʻ/gʻ marks people type: ʻ ‘ ' ` ’ ´ ʼ. */
const OKINA = "ʻ‘'`’´ʼ";

type Check = (text: string) => LintIssue[];

function issue(
  id: string,
  severity: LintSeverity,
  m: RegExpExecArray | { 0: string; index: number },
  message: string,
  suggestion: string | null,
  rule: string,
  offset = 0,
): LintIssue {
  return {
    id,
    severity,
    match: m[0],
    index: m.index + offset,
    message,
    suggestion,
    rule,
  };
}

function all(re: RegExp, text: string): RegExpExecArray[] {
  const out: RegExpExecArray[] = [];
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = g.exec(text))) {
    out.push(m);
    if (m[0] === "") g.lastIndex++;
  }
  return out;
}

const CYR_TO_LAT: Record<string, string> = {
  а: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  х: "x",
  у: "y",
  к: "k",
  м: "m",
  т: "t",
  в: "v",
  н: "n",
  А: "A",
  Е: "E",
  О: "O",
  Р: "P",
  С: "C",
  Х: "X",
  У: "Y",
  К: "K",
  М: "M",
  Т: "T",
  В: "B",
  Н: "H",
};

/** A Latin word with a Cyrillic look-alike inside ("оʻtin" with Cyrillic о). */
const mixedScript: Check = (text) =>
  all(/[\p{L}ʻ‘'`’ʼ]+/u, text)
    .filter((m) => CYRILLIC.test(m[0]) && LATIN.test(m[0]))
    .map((m) => {
      const fixed = [...m[0]].map((c) => CYR_TO_LAT[c] ?? c).join("");
      return issue(
        "mixed-script",
        "error",
        m,
        "So‘z ichida kirill harfi bor (lotin harfiga o‘xshaydi, lekin boshqa belgi). Qidiruv va imlo tekshiruvi bu so‘zni tanimaydi.",
        CYRILLIC.test(fixed) ? null : fixed,
        "Lotin alifbosi (931-XII-son Qonun)",
      );
    });

/** oʻ/gʻ written with a backtick or a right quote: o`, g’ → oʻ, gʻ. */
const okinaShape: Check = (text) =>
  all(/([OoGg])([`’´”])/u, text)
    .filter((m) => /\p{L}/u.test(text[m.index + 2] ?? "") || /\p{L}/u.test(text[m.index - 1] ?? ""))
    .map((m) =>
      issue(
        "okina-shape",
        "warning",
        m,
        `“${m[0]}” — oʻ/gʻ harfi uchun “ʻ” (yoki “‘”) belgisi ishlatiladi; “${m[2]}” boshqa belgi (u tutuq belgisi yoki urg‘u shakli).`,
        `${m[1]}ʻ`,
        "Lotin alifbosi: Oʻ oʻ, Gʻ gʻ",
      ),
    );

/** Different oʻ/gʻ marks mixed in one text (oʻ and o‘ and o'). */
function okinaConsistency(text: string): LintIssue[] {
  const marks = new Map<string, RegExpExecArray>();
  for (const m of all(/[OoGg]([ʻ‘'])(?=\p{L})/u, text)) {
    if (!marks.has(m[1]!)) marks.set(m[1]!, m);
  }
  if (marks.size < 2) return [];
  const names = [...marks.keys()].map((k) => `“${k}”`).join(", ");
  const first = [...marks.values()][1]!;
  return [
    issue(
      "okina-mixed",
      "info",
      first,
      `Matnda oʻ/gʻ harfi turli belgilar bilan yozilgan (${names}). Bir xil belgi tanlang — qidiruv va nusxa ko‘chirishda muammo bo‘lmaydi.`,
      null,
      "Lotin alifbosi: Oʻ oʻ, Gʻ gʻ",
    ),
  ];
}

const SPACE_BEFORE = /[  ]+([,.;:!?])(?![.\d])/u;
const spaceBeforePunct: Check = (text) =>
  all(SPACE_BEFORE, text)
    // "... " (ellipsis) and " .5" decimals are left alone.
    .filter(
      (m) =>
        !(m[1] === "." && text.slice(m.index + m[0].length, m.index + m[0].length + 2) === ".."),
    )
    .map((m) =>
      issue(
        "space-before-punct",
        "error",
        m,
        `“${m[1]}” belgisidan oldin bo‘sh joy qo‘yilmaydi.`,
        m[1]!,
        "Tinish belgilari: belgi oldingi so‘zga yopishib yoziladi",
      ),
    );

const noSpaceAfter: Check = (text) =>
  all(/([,;:])(?=[\p{L}«“(])/u, text)
    // "3,5" (decimal) and "10:30" (time) never match: the next char is a letter.
    .filter((m) => !/https?$|www$/i.test(text.slice(Math.max(0, m.index - 6), m.index)))
    // "std::vector" (code) and "t,f,f,d." (a mistyped abbreviation, not a list).
    .filter((m) => text[m.index - 1] !== ":" && text[m.index + 1] !== ":")
    // "f(x1,x2)" — variables in a formula.
    .filter((m) => !/\d/.test(text[m.index - 1] ?? ""))
    .filter(
      (m) =>
        !(
          /(^|[^\p{L}])\p{L}$/u.test(text.slice(Math.max(0, m.index - 2), m.index)) &&
          /^\p{L}([^\p{L}]|$)/u.test(text.slice(m.index + 1, m.index + 3))
        ),
    )
    .map((m) =>
      issue(
        "space-after-punct",
        "error",
        m,
        `“${m[1]}” belgisidan keyin bo‘sh joy qo‘yiladi.`,
        `${m[1]} `,
        "Tinish belgilari: belgidan keyin bo‘sh joy",
      ),
    );

const doubleSpace: Check = (text) =>
  all(/(?<=\S) {2,}(?=\S)/u, text).map((m) =>
    issue("double-space", "info", m, "Ikki va undan ortiq bo‘sh joy.", " ", "Tipografiya"),
  );

const repeatedWord: Check = (text) =>
  all(/(?<![\p{L}ʻ‘'’ʼ-])([\p{L}ʻ‘'’ʼ]{2,})[ \u00A0]+\1(?![\p{L}ʻ‘'’ʼ-])/iu, text)
    .filter((m) => !/^(ha|yo['ʻ‘’]q|tez|asta|sekin)$/i.test(m[1]!))
    .map((m) =>
      issue(
        "repeated-word",
        "warning",
        m,
        `“${m[1]}” so‘zi ketma-ket ikki marta yozilgan.`,
        m[1]!,
        "Tahrir",
      ),
    );

const MONTHS = "yanvar|fevral|mart|aprel|may|iyun|iyul|avgust|sentabr|oktabr|noyabr|dekabr";

/** 1991 yil, 1 sentabr → 1991-yil, 1-sentabr (rule 56). */
const ordinalHyphen: Check = (text) => [
  ...all(/\b(1[0-9]{3}|20[0-9]{2})\s+(yil\p{L}*)/u, text).map((m) =>
    issue(
      "ordinal-year",
      "error",
      m,
      "Tartib son arab raqami bilan yozilganda -nchi o‘rniga chiziqcha qo‘yiladi: “1991-yil”.",
      `${m[1]}-${m[2]}`,
      "Imlo qoidalari, 56-band",
    ),
  ),
  ...all(new RegExp(`\\b([12]?[0-9]|3[01])\\s+(${MONTHS}|sentyabr|oktyabr)\\p{L}*`, "u"), text).map(
    (m) =>
      issue(
        "ordinal-date",
        "error",
        m,
        "Sana tartib son bilan yoziladi: “1-sentabr”, “24-avgustdagi”.",
        // Also fixes a Russian-style month in the same span: 5 sentyabrda → 5-sentabrda.
        m[0].replace(/\s+/, "-").replace(/(sent|okt)yabr/i, "$1abr"),
        "Imlo qoidalari, 56-band",
      ),
  ),
];

/** XX-asr → XX asr: no hyphen after Roman numerals (rule 56). */
const romanHyphen: Check = (text) =>
  all(/\b([IVXLC]{1,6})-(asr\p{L}*|sinf\p{L}*|bob\p{L}*|bo['ʻ‘’]lim\p{L}*|kurs\p{L}*)/u, text).map(
    (m) =>
      issue(
        "roman-hyphen",
        "error",
        m,
        "Rim raqamidan keyin chiziqcha yozilmaydi: “XX asr”, “X sinf”.",
        `${m[1]} ${m[2]}`,
        "Imlo qoidalari, 56-band",
      ),
  );

/** Russian-style month spellings: sentyabr, oktyabr → sentabr, oktabr (rule 1). */
const monthSpelling: Check = (text) =>
  all(/\b(Sent|sent|Okt|okt)yabr(\p{L}*)/u, text).map((m) =>
    issue(
      "month-spelling",
      "error",
      m,
      "O‘zbek imlosida “sentabr”, “oktabr” deb yoziladi (“-yabr” emas).",
      `${m[1]}abr${m[2]}`,
      "Imlo qoidalari, 1-band (sentabr, noyabr)",
    ),
  );

/**
 * Frequent words that need the tutuq belgisi and are often typed without it.
 * Lowercase only: names (Sanatovich, Talimapjon) keep their registered spelling.
 */
const TUTUQ: [RegExp, string][] = [
  [/\b([t])alim(\p{L}*)/u, "aʼlim"],
  [/\b([m])alumot(\p{L}*)/u, "aʼlumot"],
  [/\b([e])tibor(\p{L}*)/u, "ʼtibor"],
  [/\b([m])asuliyat(\p{L}*)/u, "asʼuliyat"],
  [/\b([t])asir(\p{L}*)/u, "aʼsir"],
  [/\b([m])anaviy(\p{L}*)/u, "aʼnaviy"],
  [/\b([t])aminla(\p{L}*)/u, "aʼminla"],
  [/\b([t])akidla(\p{L}*)/u, "aʼkidla"],
  [/\b([s])anat(?!or)(\p{L}*)/u, "anʼat"],
];
const missingTutuq: Check = (text) =>
  TUTUQ.flatMap(([re, rest]) =>
    all(re, text).map((m) => {
      const fixed = `${m[1]}${rest}${m[2]}`;
      return issue(
        "missing-tutuq",
        "error",
        m,
        `Tutuq belgisi tushib qolgan: “${fixed}”.`,
        fixed,
        "Imlo qoidalari, 32-band (tutuq belgisi)",
      );
    }),
  );

/** "a - b" used as a dash, "5 - 10" as a range. */
const hyphenAsDash: Check = (text) => [
  ...all(/(?<=[\p{L}»”)]) - (?=[\p{L}«“(])/u, text).map((m) =>
    issue(
      "hyphen-dash",
      "info",
      m,
      "Bu yerda chiziqcha (-) emas, tire (–) kerak: chiziqcha so‘z ichida, tire so‘zlar orasida bo‘sh joy bilan.",
      " – ",
      "Tinish belgilari: tire",
    ),
  ),
  ...all(/(?<=\d) ?- ?(?=\d)/u, text)
    .filter((m) => m[0].includes(" "))
    .map((m) =>
      issue(
        "range-dash",
        "info",
        m,
        "Sonlar oralig‘i bo‘sh joysiz tire bilan yoziladi: “5–10”.",
        "–",
        "Tipografiya",
      ),
    ),
];

/** Unbalanced brackets and quotation marks. */
function pairs(text: string): LintIssue[] {
  const out: LintIssue[] = [];
  const PAIRS: [string, string, string][] = [
    ["(", ")", "qavs"],
    ["«", "»", "qo‘shtirnoq"],
    ["“", "”", "qo‘shtirnoq"],
  ];
  for (const [open, close, name] of PAIRS) {
    const stack: number[] = [];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === open) stack.push(i);
      else if (text[i] === close) {
        if (stack.length) stack.pop();
        else
          out.push(
            issue(
              "unbalanced",
              "warning",
              { 0: close, index: i },
              `Ochilmagan ${name} yopilgan.`,
              null,
              "Tinish belgilari: juft belgilar",
            ),
          );
      }
    }
    for (const i of stack)
      out.push(
        issue(
          "unbalanced",
          "warning",
          { 0: open, index: i },
          `${name[0]!.toUpperCase()}${name.slice(1)} ochilgan, lekin yopilmagan.`,
          null,
          "Tinish belgilari: juft belgilar",
        ),
      );
  }
  return out;
}

/** -mi is written together with the word before it: keldimi? (rule 55). */
const miParticle: Check = (text) =>
  all(/(?<=\p{L})(?:-| )mi(?=[?\s.,!]|$)/u, text)
    // " mi " between words can be a plain word in other languages; only before "?".
    .filter((m) => m[0].startsWith("-") || text[m.index + m[0].length] === "?")
    .map((m) =>
      issue(
        "mi-particle",
        "error",
        m,
        "-mi yuklamasi oldingi so‘zga qo‘shib yoziladi: “keldimi?”.",
        "mi",
        "Imlo qoidalari, 55-band",
      ),
    );

/** hech, har, bir, u, bu, shu are written apart from the next word (rule 60). */
const SEPARATE: [RegExp, string][] = [
  [/\b(hech)(kim|nima|narsa|qanday|qaysi|qachon|qayer|bir)(\p{L}*)/iu, "$1 $2$3"],
  [/\b(har)(kim|bir|qanday|qaysi|doim|xil|tomon)(\p{L}*)/iu, "$1 $2$3"],
  [/\b(hamma)(vaqt|joy)(\p{L}*)/iu, "$1 $2$3"],
  [/\b(bir)(xil|necha)(\p{L}*)/iu, "$1 $2$3"],
  [/\b(u|bu|shu|o[‘ʻ']sha)(yer|yoq)(da|dan|ga|gacha|dagi|ni|ning)?\b/iu, "$1 $2$3"],
];
const separateWords: Check = (text) =>
  SEPARATE.flatMap(([re, rep]) =>
    all(re, text).map((m) =>
      issue(
        "separate-words",
        "error",
        m,
        `Ajratib yoziladi: “${m[0].replace(re, rep)}”.`,
        m[0].replace(re, rep),
        "Imlo qoidalari, 60-band",
      ),
    ),
  );

const CHECKS: Check[] = [
  mixedScript,
  okinaShape,
  okinaConsistency,
  spaceBeforePunct,
  noSpaceAfter,
  doubleSpace,
  repeatedWord,
  ordinalHyphen,
  romanHyphen,
  monthSpelling,
  missingTutuq,
  miParticle,
  separateWords,
  hyphenAsDash,
  pairs,
];

const ORDER: Record<LintSeverity, number> = { error: 0, warning: 1, info: 2 };

/** Links and e-mail addresses are not prose: nothing inside them is checked. */
function skipSpans(text: string): [number, number][] {
  return all(/https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w-]+\.[\w.]+|doi\.org\/\S+/iu, text).map((m) => [
    m.index,
    m.index + m[0].length,
  ]);
}

/** All issues, in text order; overlapping duplicates are dropped. */
export function lintUzbek(text: string): LintIssue[] {
  const seen = new Set<string>();
  const skip = skipSpans(text);
  const found = CHECKS.flatMap((c) => c(text)).filter(
    (i) => !skip.some(([a, b]) => i.index >= a && i.index < b),
  );
  // An issue inside another issue's span whose suggestion already covers it
  // (“5 sentyabrda” → “5-sentabrda” also fixes the month) is not listed twice.
  const covered = (i: LintIssue) =>
    found.some(
      (o) =>
        o !== i &&
        o.suggestion !== null &&
        o.match.length > i.match.length &&
        i.index >= o.index &&
        i.index + i.match.length <= o.index + o.match.length,
    );
  return found
    .filter((i) => !covered(i))
    .filter((i) => {
      const key = `${i.id}:${i.index}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.index - b.index || ORDER[a.severity] - ORDER[b.severity]);
}

/** Short summary for an AI prompt: counts and the first few examples per kind. */
export function lintNote(text: string, perKind = 3): string {
  const issues = lintUzbek(text).filter((i) => i.severity !== "info");
  if (!issues.length) return "Kod tekshiruvi (imlo va tinish belgilari): mexanik xato topilmadi.";
  const groups = new Map<string, LintIssue[]>();
  for (const i of issues) groups.set(i.id, [...(groups.get(i.id) ?? []), i]);
  const lines = [...groups.values()].map((g) => {
    const ex = g
      .slice(0, perKind)
      .map((i) => `“${i.match}”${i.suggestion ? ` → “${i.suggestion}”` : ""}`)
      .join("; ");
    return `- ${g[0]!.message} (${g.length} ta; ${g[0]!.rule}). Masalan: ${ex}`;
  });
  return `Kod tekshiruvi (imlo va tinish belgilari, aniq qoidalar bo‘yicha):\n${lines.join("\n")}`;
}

export const OKINA_CHARS = OKINA;
