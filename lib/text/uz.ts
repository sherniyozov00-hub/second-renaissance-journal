/**
 * Uzbek text helpers shared by search (TZ section 8), slugs (section 5)
 * and typography (section 12.2).
 */

/** Every apostrophe-like character authors type in place of ‘ or ’. */
const APOSTROPHES = /[‘’ʻʼ`´'′]/g;

/** The canonical apostrophe used by search normalisation. */
const CANONICAL_APOSTROPHE = "'";

/** U+2018 — used after o and g (o‘, g‘). */
const TURNED_COMMA = "‘";
/** U+2019 — used as the tutuq belgisi (ta’sir). */
const RIGHT_QUOTE = "’";

/**
 * Normalises text for search indexing and queries: lower-case, unified
 * apostrophes, `ö`/`ğ` folded into o'/g', collapsed whitespace.
 * The same function must be applied to the index and to the query.
 */
export function normalizeUz(input: string): string {
  return input
    .normalize("NFC")
    .toLowerCase()
    .replace(/ö/g, "o'")
    .replace(/ğ/g, "g'")
    .replace(APOSTROPHES, CANONICAL_APOSTROPHE)
    .replace(/\s+/g, " ")
    .trim();
}

const VOWELS = "аеёиоуэюяўaeiou";

/** Cyrillic → Uzbek Latin (official 1995 alphabet, x for х). */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  ё: "yo",
  ж: "j",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "x",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sh",
  ъ: "'",
  ы: "i",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  ў: "o'",
  қ: "q",
  ғ: "g'",
  ҳ: "h",
};

/**
 * Transliterates Cyrillic (Uzbek or Russian) to Uzbek Latin so that a query
 * like "агротехнология" also matches Latin articles. Output is lower-case.
 */
export function cyrillicToLatin(input: string): string {
  const text = input.toLowerCase();
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === "е") {
      const prev = i > 0 ? text[i - 1]! : " ";
      const atWordStart = !/[\p{L}]/u.test(prev);
      out += atWordStart || VOWELS.includes(prev) ? "ye" : "e";
      continue;
    }
    out += CYRILLIC_TO_LATIN[ch] ?? ch;
  }
  return out;
}

export function hasCyrillic(input: string): boolean {
  return /[Ѐ-ӿ]/.test(input);
}

/**
 * Readable Latin URL slug: "Farg‘ona vodiysida tomchilatib sug‘orish"
 * → "fargona-vodiysida-tomchilatib-sugorish".
 */
export function slugify(input: string, maxLength = 80): string {
  const latin = cyrillicToLatin(normalizeUz(input));
  const slug = latin
    .replace(/'/g, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= maxLength) return slug;
  const cut = slug.slice(0, maxLength);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > maxLength / 2 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, "");
}

/**
 * Applies the site-wide typography rule (TZ 12.2): o‘ and g‘ use U+2018,
 * every other apostrophe (tutuq belgisi) uses U+2019.
 */
export function uzTypography(input: string): string {
  return input
    .replace(/([oOgG])[‘’ʻʼ`´']/g, `$1${TURNED_COMMA}`)
    .replace(/(^|[^oOgG])[‘ʻʼ`´']/g, `$1${RIGHT_QUOTE}`);
}
