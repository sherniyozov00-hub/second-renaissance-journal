/** Sidebar items; `key` is admin.common.nav_<key>. */
export const ADMIN_NAV = [
  { href: "/admin", key: "dashboard", adminOnly: false },
  { href: "/admin/maqolalar", key: "articles", adminOnly: false },
  { href: "/admin/sonlar", key: "issues", adminOnly: false },
  { href: "/admin/kategoriyalar", key: "categories", adminOnly: true },
  { href: "/admin/mualliflar", key: "authors", adminOnly: false },
  { href: "/admin/taqrizchilar", key: "reviewers", adminOnly: false },
  { href: "/admin/tolovlar", key: "payments", adminOnly: true },
  { href: "/admin/xorazmiy-ai", key: "ai", adminOnly: false },
  { href: "/admin/akademiya", key: "academy", adminOnly: true },
  { href: "/admin/sahifalar", key: "pages", adminOnly: true },
  { href: "/admin/foydalanuvchilar", key: "users", adminOnly: true },
  { href: "/admin/sozlamalar", key: "settings", adminOnly: true },
] as const;
