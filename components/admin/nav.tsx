"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const ADMIN_NAV = [
  { href: "/admin", label: "Boshqaruv paneli", adminOnly: false },
  { href: "/admin/maqolalar", label: "Maqolalar", adminOnly: false },
  { href: "/admin/sonlar", label: "Jurnal sonlari", adminOnly: false },
  { href: "/admin/kategoriyalar", label: "Kategoriyalar", adminOnly: true },
  { href: "/admin/mualliflar", label: "Mualliflar", adminOnly: false },
  { href: "/admin/taqrizchilar", label: "Taqrizchilar", adminOnly: false },
  { href: "/admin/tolovlar", label: "To‘lovlar", adminOnly: true },
  { href: "/admin/akademiya", label: "Akademiya darslari", adminOnly: true },
  { href: "/admin/sahifalar", label: "Sahifalar va SEO", adminOnly: true },
  { href: "/admin/foydalanuvchilar", label: "Foydalanuvchilar va rollar", adminOnly: true },
  { href: "/admin/sozlamalar", label: "Sozlamalar", adminOnly: true },
] as const;

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {ADMIN_NAV.filter((i) => isAdmin || !i.adminOnly).map((item) => {
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
