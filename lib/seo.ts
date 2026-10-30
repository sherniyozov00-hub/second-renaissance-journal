import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";

const OG_LOCALE: Record<AppLocale, string> = { uz: "uz_UZ", ru: "ru_RU", en: "en_US" };

/** Absolute URL of a path in a locale ("/maqola/x" → "https://…/ru/maqola/x"). */
export function absoluteUrl(path: string, locale: AppLocale): string {
  return `${siteConfig.url}${getPathname({ href: path, locale })}`;
}

/** Canonical URL plus hreflang alternates for uz/ru/en and x-default (TZ 9.2). */
export function localeAlternates(path: string, locale: AppLocale): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = absoluteUrl(path, l);
  languages["x-default"] = absoluteUrl(path, routing.defaultLocale);
  return { canonical: absoluteUrl(path, locale), languages };
}

/** Title, description (≤155 chars), canonical, hreflang, Open Graph and Twitter Card. */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  type = "website",
  noindex = false,
}: {
  locale: AppLocale;
  path: string;
  title: string;
  description?: string;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
}): Metadata {
  const desc = description ? truncate(description, 155) : undefined;
  const url = absoluteUrl(path, locale);
  return {
    title,
    description: desc,
    alternates: localeAlternates(path, locale),
    openGraph: {
      type,
      url,
      title,
      description: desc,
      siteName: siteConfig.name,
      locale: OG_LOCALE[locale],
    },
    twitter: { card: "summary_large_image", title, description: desc },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

/** Serialises JSON-LD safely for a <script> tag (no "</script>" breakouts). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
