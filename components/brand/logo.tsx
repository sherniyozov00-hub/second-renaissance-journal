import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

type Variant = "header" | "footer";

const COLORS: Record<Variant, { star: string; centre: string; radius: number }> = {
  header: { star: "#1E3A8A", centre: "#C99A2E", radius: 7.5 },
  footer: { star: "#C99A2E", centre: "#0B1F4D", radius: 5.5 },
};

/** Eight-pointed star: two squares, the second rotated 45°, with a centre circle. */
export function LogoMark({
  variant = "header",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const c = COLORS[variant];
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <g fill={c.star}>
        <rect x="7" y="7" width="26" height="26" />
        <rect x="7" y="7" width="26" height="26" transform="rotate(45 20 20)" />
      </g>
      <circle cx="20" cy="20" r={c.radius} fill={c.centre} />
    </svg>
  );
}

/** Logo with wordmark: "The Second Renaissance" / "OF UZBEKISTAN · ILMIY JURNAL". */
export function Logo({
  variant = "header",
  subtitle,
  subtitleClassName,
  className,
}: {
  variant?: Variant;
  /** Appended to the second line, e.g. "ILMIY JURNAL". */
  subtitle?: string;
  subtitleClassName?: string;
  className?: string;
}) {
  const onDark = variant === "footer";
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark variant={variant} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-serif text-xl font-bold md:text-[22px]",
            onDark ? "text-white" : "text-blue-900",
          )}
        >
          {siteConfig.wordmark}
        </span>
        <span
          className={cn(
            "mt-1 text-[11px] font-semibold tracking-[0.12em] uppercase",
            onDark ? "text-blue-50" : "text-muted",
          )}
        >
          {siteConfig.wordmarkSub}
          {subtitle ? <span className={subtitleClassName}> · {subtitle}</span> : null}
        </span>
      </span>
    </span>
  );
}
