/** Main navigation (Ekran 1). Labels are message keys. */
export const NAV_ITEMS = [
  { href: "/maqolalar", label: "nav.articles" },
  { href: "/yonalishlar", label: "nav.categories" },
  { href: "/xorazmiy-ai", label: "nav.ai" },
  { href: "/akademiya", label: "nav.academy" },
  { href: "/mualliflarga", label: "nav.forAuthors" },
] as const;

/** Navigation on inner pages (Ekran 4). */
export const COMPACT_NAV_ITEMS = [
  { href: "/maqolalar", label: "nav.articles" },
  { href: "/yonalishlar", label: "nav.categories" },
  { href: "/sonlar", label: "nav.issues" },
  { href: "/akademiya", label: "nav.academy" },
] as const;
