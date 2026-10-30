import { defineRouting } from "next-intl/routing";

// Uzbek is the default and has no prefix; Russian and English live under
// /ru and /en (TZ section 5). Locale detection is off so that crawlers and
// visitors always get the language the URL says.
export const routing = defineRouting({
  locales: ["uz", "ru", "en"],
  defaultLocale: "uz",
  localePrefix: "as-needed",
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];
