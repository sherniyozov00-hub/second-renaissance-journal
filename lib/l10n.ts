import type { AppLocale } from "@/i18n/routing";

export type L10n = { uz: string; ru?: string; en?: string };

/** Picks the value for a locale from a { uz, ru, en } JSON field, falling back to Uzbek. */
export function pick(value: unknown, locale: AppLocale): string {
  if (!value || typeof value !== "object") return typeof value === "string" ? value : "";
  const v = value as Partial<L10n>;
  return v[locale] || v.uz || "";
}

type LocalizedTitle = { titleUz: string; titleRu: string | null; titleEn: string | null };

type LocalizedAbstract = {
  abstractUz: string;
  abstractRu: string | null;
  abstractEn: string | null;
};

/** Article title in the UI locale, falling back to the Uzbek original. */
export function articleTitle(a: LocalizedTitle, locale: AppLocale): string {
  if (locale === "ru" && a.titleRu) return a.titleRu;
  if (locale === "en" && a.titleEn) return a.titleEn;
  return a.titleUz;
}

export function articleAbstract(a: LocalizedAbstract, locale: AppLocale): string {
  if (locale === "ru" && a.abstractRu) return a.abstractRu;
  if (locale === "en" && a.abstractEn) return a.abstractEn;
  return a.abstractUz;
}

const INTL_LOCALE: Record<AppLocale, string> = { uz: "uz-Latn", ru: "ru", en: "en-GB" };

export function formatDate(date: Date | null | undefined, locale: AppLocale): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Tashkent",
  }).format(date);
}

export function formatNumber(n: number, locale: AppLocale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(n);
}

/** "AK" for "Aziza Karimova". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
