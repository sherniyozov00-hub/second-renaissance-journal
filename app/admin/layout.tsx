import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { fontVariables } from "@/lib/fonts";
import { siteConfig } from "@/lib/site";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: `%s — Admin · ${siteConfig.wordmark}` },
  robots: { index: false, follow: false },
};

/** Root layout of the admin panel (not indexed — TZ 5). Language: the staff_locale cookie. */
export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={fontVariables}>
      <body className="bg-blue-50">{children}</body>
    </html>
  );
}
