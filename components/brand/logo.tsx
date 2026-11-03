import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

type Variant = "header" | "footer";

/** On dark backgrounds the square is a shade lighter so it stands out. */
const BG: Record<Variant, string> = { header: "#0B1F4D", footer: "#13295E" };

/** Kufic-style geometric “3R” monogram: gold 3, white R, gold inner frame. */
export function LogoMark({
  variant = "header",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect x="6" y="6" width="88" height="88" rx="6" fill={BG[variant]} />
      <rect
        x="11"
        y="11"
        width="78"
        height="78"
        rx="3"
        fill="none"
        stroke="#C9A227"
        strokeWidth="2"
      />
      <g fill="#C9A227">
        <rect x="20" y="24" width="26" height="7" />
        <rect x="39" y="24" width="7" height="52" />
        <rect x="26" y="46.5" width="20" height="7" />
        <rect x="20" y="69" width="26" height="7" />
      </g>
      <g fill="#FFFFFF">
        <rect x="54" y="24" width="7" height="52" />
        <rect x="54" y="24" width="26" height="7" />
        <rect x="73" y="24" width="7" height="29" />
        <rect x="54" y="46" width="26" height="7" />
        <path d="M63 53h8l11 23h-8z" />
      </g>
    </svg>
  );
}

/** Logo with wordmark: "The Third Renaissance" / "OF UZBEKISTAN · ILMIY JURNAL". */
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
      <LogoMark variant={variant} className="size-10" />
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
