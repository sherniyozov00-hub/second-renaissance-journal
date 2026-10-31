import { Inter, Lora } from "next/font/google";

// Latin + Cyrillic (TZ 12.2). Shared by the public site and the admin/reviewer panels.
// Both are variable fonts: one file per subset covers every weight, which keeps the
// hero heading (the LCP element) fast on 4G (TZ 17). Uzbek Latin needs only the
// "latin" subset — it includes ‘ ’ ʻ ʼ. Italic is rare and synthesised by the browser.
export const lora = Lora({
  subsets: ["latin", "cyrillic"],
  variable: "--font-lora",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
  // Not preloaded: the LCP element is the Lora heading, which gets the bandwidth first.
  preload: false,
});

export const fontVariables = `${lora.variable} ${inter.variable}`;
