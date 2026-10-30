"use client";

import { House, Search, Star, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "nav.home", icon: House, match: (p: string) => p === "/" },
  {
    href: "/maqolalar",
    label: "nav.search",
    icon: Search,
    match: (p: string) => p.startsWith("/maqolalar"),
  },
  {
    href: "/xorazmiy-ai",
    label: "nav.ai",
    icon: Star,
    match: (p: string) => p.startsWith("/xorazmiy-ai"),
  },
  {
    href: "/kabinet",
    label: "nav.cabinet",
    icon: User,
    match: (p: string) => p.startsWith("/kabinet"),
  },
] as const;

/** Mobile bottom tab bar (Ekran 2). */
export function BottomNav() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("nav.home")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
    >
      <ul className="grid grid-cols-4">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-[60px] flex-col items-center justify-center gap-1 text-xs",
                  active ? "font-semibold text-blue-800" : "text-text-2",
                )}
              >
                <Icon className="size-5" strokeWidth={1.8} aria-hidden />
                {t(label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
