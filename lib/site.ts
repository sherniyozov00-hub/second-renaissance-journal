/**
 * Site identity. The name is a single configuration value (TZ section 19),
 * so it can be changed without touching components or the logo file.
 */
export const siteConfig = {
  name: process.env.SITE_NAME ?? "The Third Renaissance of Uzbekistan",
  /** First line of the wordmark next to the logo. */
  wordmark: process.env.SITE_WORDMARK ?? "The Third Renaissance",
  /** Second line of the wordmark: "OF UZBEKISTAN · ILMIY JURNAL". */
  wordmarkSub: process.env.SITE_WORDMARK_SUB ?? "OF UZBEKISTAN",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  defaultLocale: "uz",
  locales: ["uz", "ru", "en"],
} as const;

export type SiteLocale = (typeof siteConfig.locales)[number];
