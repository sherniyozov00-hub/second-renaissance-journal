import { initials } from "@/lib/l10n";
import { cn } from "@/lib/utils";

/** Round profile photo, or the name's initials when there is no photo. */
export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  if (src)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tiny pre-sized JPEG
      <img
        src={src}
        alt=""
        width={160}
        height={160}
        className={cn("shrink-0 rounded-full bg-info-bg object-cover", className)}
      />
    );
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-info-bg font-serif font-bold text-blue-800",
        className,
      )}
    >
      {initials(name) || "?"}
    </span>
  );
}
