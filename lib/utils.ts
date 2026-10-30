import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the custom design tokens from app/globals.css so that
// e.g. `text-eyebrow` (a font size) is not dropped next to `text-gold-text` (a colour).
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["hero", "hero-mobile", "section", "card-title", "article", "eyebrow"],
      radius: ["control", "card", "ai"],
      color: [
        "border",
        "border-strong",
        "ink",
        "text-2",
        "muted",
        "gold",
        "gold-text",
        "success",
        "success-bg",
        "danger",
        "danger-bg",
        "warning",
        "warning-bg",
        "info-bg",
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
