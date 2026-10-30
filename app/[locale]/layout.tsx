import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Inter, Lora } from "next/font/google";
import { notFound } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { routing } from "@/i18n/routing";
import { getSettings } from "@/lib/settings/get";
import { siteConfig } from "@/lib/site";
import "../globals.css";

// Latin + Cyrillic (TZ 12.2).
const lora = Lora({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  const s = await getSettings();
  const google = String(s["seo.googleVerification"] ?? "");
  const bing = String(s["seo.bingVerification"] ?? "");
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: siteConfig.name, template: `%s — ${siteConfig.name}` },
    description: t("tagline"),
    // Search Console / Bing Webmaster codes are set in Admin → Settings (TZ 9.10).
    verification: {
      ...(google ? { google } : {}),
      ...(bing ? { other: { "msvalidate.01": bing } } : {}),
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0B1F4D",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${lora.variable} ${inter.variable}`}>
      <body className="pb-[60px] md:pb-0">
        <NextIntlClientProvider>
          {children}
          <BottomNav />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
