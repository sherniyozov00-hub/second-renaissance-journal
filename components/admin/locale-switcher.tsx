import { getLocale } from "next-intl/server";
import { setStaffLocaleAction } from "@/lib/admin/locale-actions";
import { cn } from "@/lib/utils";

const LABELS = { uz: "O‘zb", ru: "Рус", en: "Eng" } as const;

/** uz / ru / en switch for the staff panels; works without JavaScript. */
export async function StaffLocaleSwitcher({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const current = await getLocale();
  return (
    <form action={setStaffLocaleAction} className="flex gap-1" aria-label="Til / Язык / Language">
      {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((l) => (
        <button
          key={l}
          type="submit"
          name="locale"
          value={l}
          lang={l}
          aria-pressed={current === l}
          className={cn(
            "min-h-9 rounded-control px-2.5 text-xs font-semibold",
            current === l
              ? "bg-white text-blue-900"
              : tone === "dark"
                ? "text-blue-50/80 hover:bg-white/10"
                : "text-blue-800 hover:bg-blue-50",
          )}
        >
          {LABELS[l]}
        </button>
      ))}
    </form>
  );
}
