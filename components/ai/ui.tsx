"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { AiErrorCode, FactEvent, FactSummary } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";

/** TZ 10.2: under every AI answer. */
export function Disclaimer({ className }: { className?: string }) {
  const t = useTranslations("ai");
  return <p className={cn("text-xs text-text-2", className)}>{t("disclaimer")}</p>;
}

export function MockNote() {
  const t = useTranslations("ai");
  return (
    <p className="rounded-control bg-warning-bg px-3 py-2 text-xs text-warning" role="note">
      {t("mock")}
    </p>
  );
}

export function AiErrorNote({ code }: { code: AiErrorCode }) {
  const t = useTranslations("ai");
  return (
    <p role="alert" className="rounded-control bg-danger-bg px-3 py-2 text-sm text-danger">
      {t(`error_${code}`)}
    </p>
  );
}

export function Feedback({ onSend }: { onSend: (verdict: "up" | "down") => void | Promise<void> }) {
  const t = useTranslations("ai");
  const [sent, setSent] = useState(false);
  if (sent) return <span className="text-xs text-text-2">{t("thanks")}</span>;
  const btn =
    "inline-flex size-8 items-center justify-center rounded-control text-text-2 hover:bg-blue-50 hover:text-blue-800";
  return (
    <span className="inline-flex gap-1">
      <button
        type="button"
        className={btn}
        aria-label={t("helpful")}
        onClick={() => {
          setSent(true);
          void onSend("up");
        }}
      >
        <ThumbsUp className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        className={btn}
        aria-label={t("notHelpful")}
        onClick={() => {
          setSent(true);
          void onSend("down");
        }}
      >
        <ThumbsDown className="size-4" aria-hidden />
      </button>
    </span>
  );
}

/** Three counters at the top of the check panel (Ekran 3). */
export function SummaryTiles({ summary }: { summary: FactSummary }) {
  const t = useTranslations("ai");
  const tiles = [
    { n: summary.correct, label: t("correct"), cls: "bg-success-bg text-success" },
    { n: summary.incorrect, label: t("incorrect"), cls: "bg-danger-bg text-danger" },
    { n: summary.needs_source, label: t("needsSource"), cls: "bg-warning-bg text-warning" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {tiles.map((x) => (
        <div key={x.label} className={cn("rounded-card px-2 py-3 text-center", x.cls)}>
          <div className="text-2xl leading-none font-bold">{x.n}</div>
          <div className="mt-1 text-xs">{x.label}</div>
        </div>
      ))}
    </div>
  );
}

/** POSTs to the fact-check endpoint and calls `onEvent` for every NDJSON line. */
export async function streamFactCheck(
  body: { text?: string; draftId?: string; articleId?: string },
  onEvent: (e: FactEvent) => void,
) {
  let res: Response;
  try {
    res = await fetch("/api/ai/factcheck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    onEvent({ type: "error", code: "unavailable" });
    return;
  }
  if (!res.body) {
    onEvent({ type: "error", code: "unavailable" });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (value) buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) {
        try {
          onEvent(JSON.parse(line) as FactEvent);
        } catch {}
      }
    }
    if (done) break;
  }
}
