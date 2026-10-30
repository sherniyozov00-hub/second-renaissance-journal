"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Suggestion = { kind: "article" | "author" | "keyword"; label: string; href: string };

/** Search input with autocomplete (titles, authors, keywords) — TZ 8. */
export function SearchAutocomplete({
  defaultValue,
  placeholder,
  formId,
}: {
  defaultValue: string;
  placeholder: string;
  formId: string;
}) {
  const t = useTranslations("search");
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function update(next: string) {
    setValue(next);
    clearTimeout(timer.current);
    if (next.trim().length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(next)}`);
        const data = (await res.json()) as { items: Suggestion[] };
        setItems(data.items);
        setActive(-1);
        setOpen(data.items.length > 0);
      } catch {
        setOpen(false);
      }
    }, 200);
  }

  function choose(s: Suggestion) {
    setOpen(false);
    if (s.kind === "keyword") {
      setValue(s.label);
      const form = document.getElementById(formId) as HTMLFormElement | null;
      const input = form?.querySelector<HTMLInputElement>('input[name="q"]');
      if (input) input.value = s.label;
      form?.requestSubmit();
    } else {
      router.push(s.href);
    }
  }

  const kindLabel = {
    keyword: t("suggestKeyword"),
    article: t("suggestArticle"),
    author: t("suggestAuthor"),
  };

  return (
    <div className="relative min-w-0 flex-1">
      <input
        name="q"
        type="search"
        value={value}
        onChange={(e) => update(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => items.length && setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, -1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            choose(items[active]!);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className="h-12 w-full bg-transparent px-3 text-base text-ink outline-none placeholder:text-muted"
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full left-0 z-30 mt-2 w-full overflow-hidden rounded-card border border-border bg-white py-1 shadow-lg"
        >
          {items.map((s, i) => (
            <li
              key={`${s.kind}-${s.href}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
              className={cn(
                "flex cursor-pointer items-baseline gap-3 px-4 py-2 text-sm",
                i === active ? "bg-blue-50" : "hover:bg-blue-50",
              )}
            >
              <span className="w-24 shrink-0 text-xs text-muted">{kindLabel[s.kind]}</span>
              <span className="text-ink">{s.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Submits the search form whenever a filter control marked data-autosubmit changes. */
export function AutoSubmit({ formId }: { formId: string }) {
  useEffect(() => {
    function onChange(e: Event) {
      const el = e.target as HTMLInputElement | HTMLSelectElement;
      if (el.dataset?.autosubmit === undefined) return;
      const form = document.getElementById(formId) as HTMLFormElement | null;
      form?.requestSubmit();
    }
    // Keep shared URLs short: empty fields and default values are not submitted.
    function onSubmit(e: Event) {
      const form = e.target as HTMLFormElement;
      if (form.id !== formId) return;
      const defaults: Record<string, string> = { joy: "all", saralash: "relevance" };
      const skipped: (HTMLInputElement | HTMLSelectElement)[] = [];
      for (const el of Array.from(form.elements) as (HTMLInputElement | HTMLSelectElement)[]) {
        if (!el.name || el.disabled || el.type === "checkbox") continue;
        if (el.value === "" || defaults[el.name] === el.value) {
          el.disabled = true;
          skipped.push(el);
        }
      }
      setTimeout(() => skipped.forEach((el) => (el.disabled = false)), 0);
    }
    document.addEventListener("change", onChange);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("change", onChange);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [formId]);
  return null;
}

/** Sidebar on desktop; bottom sheet on mobile (TZ 8). */
export function FilterPanel({
  children,
  activeCount,
}: {
  children: React.ReactNode;
  activeCount: number;
}) {
  const t = useTranslations("search");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border-strong bg-white px-4 text-sm font-semibold text-ink md:hidden"
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        {t("filters")}
        {activeCount ? (
          <span className="rounded-full bg-blue-800 px-2 text-xs text-white">{activeCount}</span>
        ) : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-40 bg-ink/40 md:hidden"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={t("filters")}
        className={cn(
          "md:static md:block md:max-h-none md:overflow-visible md:rounded-none md:bg-transparent md:p-0 md:shadow-none",
          open
            ? "fixed inset-x-0 bottom-0 z-50 block max-h-[85vh] overflow-y-auto rounded-t-[18px] bg-white p-5 pb-8 shadow-2xl"
            : "hidden",
        )}
      >
        <div className="mb-4 flex items-center justify-between md:hidden">
          <span className="text-lg font-semibold text-ink">{t("filters")}</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("showResults")}
            className="flex size-11 items-center justify-center rounded-control border border-border-strong"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-control bg-blue-800 font-semibold text-white md:hidden"
        >
          {t("showResults")}
        </button>
      </div>
    </>
  );
}

/** "Yana 6 ta yo‘nalish" toggle for the category filter list. */
export function MoreToggle({
  children,
  more,
  showLabel,
  hideLabel,
}: {
  children: React.ReactNode;
  more: React.ReactNode;
  showLabel: string;
  hideLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {children}
      {/* Kept in the DOM while collapsed so checked boxes are still submitted. */}
      <div hidden={!open}>{more}</div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-1 text-sm font-semibold text-blue-800 hover:underline"
      >
        {open ? hideLabel : showLabel}
      </button>
    </>
  );
}
