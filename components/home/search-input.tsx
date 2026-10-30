"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** Search input whose placeholder is shorter on phones (Ekran 1 vs Ekran 2). */
export function SearchInput({
  id,
  placeholder,
  placeholderShort,
  defaultValue,
}: {
  id: string;
  placeholder: string;
  placeholderShort: string;
  defaultValue?: string;
}) {
  const wide = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  );

  return (
    <input
      id={id}
      name="q"
      type="search"
      defaultValue={defaultValue}
      placeholder={wide ? placeholder : placeholderShort}
      aria-label={placeholder}
      className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base text-ink outline-none placeholder:text-muted md:h-12"
    />
  );
}
