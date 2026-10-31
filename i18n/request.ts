import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { routing } from "./routing";

/** Language of the staff panels (/admin, /taqriz), which live outside [locale]. */
export const STAFF_LOCALE_COOKIE = "staff_locale";

export default getRequestConfig(async ({ requestLocale }) => {
  let requested = await requestLocale;
  if (!requested) requested = (await cookies()).get(STAFF_LOCALE_COOKIE)?.value;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "Asia/Tashkent",
  };
});
