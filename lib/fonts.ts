import { Inter, Lora } from "next/font/google";

// Latin + Cyrillic (TZ 12.2). Shared by the public site and the admin/reviewer panels.
export const lora = Lora({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const fontVariables = `${lora.variable} ${inter.variable}`;
