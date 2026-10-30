import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "outline" | "secondary" | "gold";
type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  // Filled blue — main actions ("Maqola yuborish", "Qidirish").
  primary: "bg-blue-800 text-white hover:bg-blue-900",
  // Blue outline — secondary action next to a primary one ("Shablon (.docx)").
  outline: "border border-blue-800 bg-white text-blue-800 hover:bg-blue-50",
  // Neutral outline — tertiary actions ("Telegram’da ulashish").
  secondary: "border border-border-strong bg-white text-blue-800 hover:bg-blue-50",
  // Gold — the CTA on the dark price card (Ekran 2).
  gold: "bg-gold text-blue-900 hover:brightness-95",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-6 text-base",
};

/** Class names for buttons and button-styled links. Minimum target 44×44 (TZ 12.2). */
export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap transition-colors",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

/** Rounded tag/chip ("agrotexnologiya", tabs on the home page). */
export function chipClass(active = false, className?: string) {
  return cn(
    "inline-flex min-h-8 items-center rounded-full border px-3 text-sm transition-colors",
    active
      ? "border-blue-800 bg-blue-800 text-white"
      : "border-border-strong bg-white text-blue-800 hover:border-blue-800",
    className,
  );
}

export const cardClass = "rounded-card border border-border bg-white";
