"use client";

import { Check, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ── Abstract in three languages (Ekran 4) ────────────────────────────────────

export type AbstractTab = { key: string; label: string; text: string; lang: string };

export function AbstractTabs({ tabs, initial }: { tabs: AbstractTab[]; initial: string }) {
  const [active, setActive] = useState(initial);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  if (!current) return null;

  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`abstract-tab-${t.key}`}
            aria-selected={t.key === current.key}
            aria-controls="abstract-panel"
            onClick={() => setActive(t.key)}
            className={cn(
              "min-h-9 rounded-full border px-3.5 text-sm transition-colors",
              t.key === current.key
                ? "border-blue-800 bg-blue-800 font-semibold text-white"
                : "border-border-strong bg-white text-ink hover:border-blue-800",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p
        id="abstract-panel"
        role="tabpanel"
        aria-labelledby={`abstract-tab-${current.key}`}
        lang={current.lang}
        className="mt-4 font-serif text-[17px] leading-[1.75] text-ink md:text-lg"
      >
        {current.text}
      </p>
    </div>
  );
}

// ── Citation box ─────────────────────────────────────────────────────────────

type Format = "apa" | "gost" | "bibtex";

export function CitationBox({
  formats,
  labels,
}: {
  formats: Record<Format, string>;
  labels: { title: string; copy: string; copied: string };
}) {
  const [format, setFormat] = useState<Format>("apa");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(formats[format]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (insecure context); the text stays selectable.
    }
  }

  return (
    <section id="iqtibos" className="scroll-mt-6 rounded-card border border-gold/35 bg-gold/8 p-6">
      <h2 className="font-sans text-base font-semibold text-ink">{labels.title}</h2>
      <p
        className={cn(
          "mt-3 text-[15px] leading-relaxed break-words text-ink",
          format === "bibtex" && "font-mono text-[13px] whitespace-pre-wrap",
        )}
      >
        {formats[format]}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["apa", "gost", "bibtex"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={f === format}
            onClick={() => setFormat(f)}
            className={cn(
              "min-h-10 rounded-control border bg-white px-4 text-sm text-ink",
              f === format ? "border-ink font-bold" : "border-border-strong",
            )}
          >
            {f === "apa" ? "APA" : f === "gost" ? "GOST" : "BibTeX"}
          </button>
        ))}
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-control bg-blue-800 px-4 text-sm font-semibold text-white hover:bg-blue-900"
        >
          {copied ? <Check className="size-4" aria-hidden /> : null}
          {copied ? labels.copied : labels.copy}
        </button>
      </div>
    </section>
  );
}

// ── Copy link button ─────────────────────────────────────────────────────────

export function CopyLinkButton({
  url,
  label,
  copiedLabel,
}: {
  url: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? copiedLabel : label}
      title={copied ? copiedLabel : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // ignore
        }
      }}
      className="flex size-11 items-center justify-center rounded-control border border-border-strong bg-white text-blue-800 hover:bg-blue-50"
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
    </button>
  );
}

// ── View counter beacon ──────────────────────────────────────────────────────

/** Counts one view per article per browser session without blocking rendering. */
export function ViewBeacon({ articleId }: { articleId: string }) {
  useEffect(() => {
    const key = `viewed:${articleId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage disabled: still count.
    }
    void fetch(`/api/articles/${articleId}/view`, { method: "POST", keepalive: true });
  }, [articleId]);
  return null;
}
