import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import { siteConfig } from "@/lib/site";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s — ${siteConfig.name}`,
  },
  description: "Yosh olimlar uchun elektron ilmiy jurnal va Xorazmiy AI ilmiy yordamchisi.",
};

export const viewport: Viewport = {
  themeColor: "#0B1F4D",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz" className={`${lora.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
