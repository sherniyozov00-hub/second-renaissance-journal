/** Main navigation, the same on every page. Labels are message keys. */
export const NAV_ITEMS = [
  { href: "/maqolalar", label: "nav.articles" },
  { href: "/sonlar", label: "nav.issuesShort" },
  { href: "/xorazmiy-ai", label: "nav.ai" },
  { href: "/akademiya", label: "nav.academy" },
  { href: "/mualliflarga", label: "nav.forAuthors" },
] as const;

/** Kept for callers of the old inner-page list: now identical. */
export const COMPACT_NAV_ITEMS = NAV_ITEMS;
