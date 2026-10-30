"use client";

import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LABELS: Record<AppLocale, string> = { uz: "O‘zbekcha", ru: "Русский", en: "English" };

/** Links to the current page in the other languages. */
export function LocaleSwitcher({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const query = Object.fromEntries(useSearchParams());

  return (
    <ul className={cn("flex items-center gap-4", className)}>
      {routing.locales.map((l) => (
        <li key={l}>
          <Link
            href={{ pathname, query }}
            locale={l}
            hrefLang={l}
            aria-current={l === locale ? "true" : undefined}
            className={cn(
              "hover:underline",
              tone === "dark"
                ? l === locale
                  ? "font-semibold text-white"
                  : "text-blue-50/85"
                : l === locale
                  ? "font-semibold text-blue-800"
                  : "text-text-2",
            )}
          >
            {LABELS[l]}
          </Link>
        </li>
      ))}
    </ul>
  );
}
