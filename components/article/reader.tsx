"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Thin gold line at the top: how far the reader is through the article. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      setProgress(total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [targetId]);
  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent">
      <div
        className="h-full bg-gold transition-[width] duration-150"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}

/** Table of contents that marks the section being read. */
export function TocNav({ items, label }: { items: { id: string; text: string }[]; label: string }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((e): e is HTMLElement => Boolean(e));
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, [items]);
  return (
    <nav aria-label={label}>
      <ul className="space-y-0.5 border-l border-border text-[15px]">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? "location" : undefined}
              className={cn(
                "-ml-px block border-l-2 py-1.5 pl-3.5 leading-snug transition-colors",
                active === item.id
                  ? "border-gold font-semibold text-ink"
                  : "border-transparent text-text-2 hover:text-blue-800",
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Click on a figure in the article to see it full size. */
export function FigureZoom({
  containerId,
  closeLabel,
}: {
  containerId: string;
  closeLabel: string;
}) {
  const [img, setImg] = useState<{ src: string; alt: string } | null>(null);
  useEffect(() => {
    const root = document.getElementById(containerId);
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t instanceof HTMLImageElement) setImg({ src: t.currentSrc || t.src, alt: t.alt });
    };
    root.addEventListener("click", onClick);
    root.querySelectorAll("img").forEach((i) => i.classList.add("cursor-zoom-in"));
    return () => root.removeEventListener("click", onClick);
  }, [containerId]);
  useEffect(() => {
    if (!img) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setImg(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [img]);
  if (!img) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={img.alt || closeLabel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4"
      onClick={() => setImg(null)}
    >
      <button
        type="button"
        aria-label={closeLabel}
        className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        onClick={() => setImg(null)}
      >
        <X className="size-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.src} alt={img.alt} className="max-h-full max-w-full rounded-card bg-white" />
    </div>
  );
}
