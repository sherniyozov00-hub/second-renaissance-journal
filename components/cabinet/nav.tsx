"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { signOutAction } from "@/app/[locale]/kirish/actions";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/kabinet", label: "myArticles" },
  { href: "/kabinet/yozish", label: "writing" },
  { href: "/kabinet/sertifikatlar", label: "certificates" },
  { href: "/kabinet/tolovlar", label: "payments" },
  { href: "/kabinet/darslar", label: "lessons" },
  { href: "/kabinet/profil", label: "profile" },
] as const;

export function CabinetNav() {
  const t = useTranslations("cabinet");
  const ta = useTranslations("auth");
  const pathname = usePathname();
  return (
    <nav aria-label={t("title")} className="rounded-card border border-border bg-white p-2">
      <ul>
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-control px-3.5 text-base",
                  active
                    ? "bg-info-bg/70 font-semibold text-blue-800"
                    : "text-ink hover:bg-blue-50",
                )}
              >
                {t(item.label)}
              </Link>
            </li>
          );
        })}
        <li>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex min-h-11 w-full items-center rounded-control px-3.5 text-base text-danger hover:bg-danger-bg"
            >
              {ta("logout")}
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
