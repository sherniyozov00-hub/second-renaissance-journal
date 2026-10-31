"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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

export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center rounded-control px-3 text-[15px]",
                active
                  ? "bg-blue-800 font-semibold text-white"
                  : "text-blue-50/90 hover:bg-white/5 hover:text-white",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
