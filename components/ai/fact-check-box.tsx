"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { buttonClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import type { AiErrorCode, FactResult } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";
import { AiErrorNote, Disclaimer, MockNote, streamFactCheck, SummaryTiles } from "./ui";

function useFactCheck() {
  const locale = useLocale();
  const [results, setResults] = useState<FactResult[]>([]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<AiErrorCode | null>(null);
  const [mock, setMock] = useState(false);
  const run = async (body: { text?: string; articleId?: string }) => {
    setResults([]);
    setError(null);
    setFinished(false);
    setRunning(true);
    await streamFactCheck({ ...body, lang: locale }, (e) => {
      if (e.type === "start") setMock(e.mock);
      else if (e.type === "result") setResults((r) => [...r, e.result]);
      else if (e.type === "error") setError(e.code);
      else if (e.type === "done") setFinished(true);
    });
    setRunning(false);
    setFinished(true);
  };
  const summary = { correct: 0, incorrect: 0, needs_source: 0 };
  for (const r of results) summary[r.verdict]++;
  return { results, running, finished, error, mock, run, summary };
}

const TONE = {
  correct: "border-success/30 text-success",
  incorrect: "border-danger/30 text-danger",
  needs_source: "border-[#f5d58a] text-warning",
} as const;

function ResultList({ results }: { results: FactResult[] }) {
  const t = useTranslations("ai");
  const name = {
    correct: t("verdictCorrect"),
    incorrect: t("verdictIncorrect"),
    needs_source: t("verdictNeedsSource"),
  };
  return (
    <ul className="space-y-2.5">
      {results.map((r) => (
        <li
          key={r.id}
          className={cn("rounded-card border bg-white p-3.5", TONE[r.verdict].split(" ")[0])}
        >
          <p
            className={cn(
              "text-xs font-semibold tracking-[0.06em] uppercase",
              TONE[r.verdict].split(" ")[1],
            )}
          >
            {name[r.verdict]}
          </p>
          <p className="mt-1 font-serif text-[15px] text-ink">“{r.text}”</p>
          <p className="mt-1 text-sm text-text-2">{r.explanation}</p>
          {r.correction ? (
            <p className="mt-1.5 text-sm text-ink">
              <span className="font-semibold">{t("correction")}:</span> {r.correction}
            </p>
          ) : null}
          {r.sources.length ? (
            <p className="mt-1.5 flex flex-wrap gap-x-3 text-[13px]">
              {r.sources.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-800 hover:underline"
                >
                  {s.title}
                </a>
              ))}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Guest trial on /xorazmiy-ai (TZ 10.4): one paragraph, a few free checks a day. */
export function AiTrial({
  maxChars,
  perDay,
  signedIn,
}: {
  maxChars: number;
  perDay: number;
  signedIn: boolean;
}) {
  const t = useTranslations("ai");
  const [text, setText] = useState("");
  const fc = useFactCheck();
  return (
    <section
      id="sinov"
      className="scroll-mt-24 rounded-ai border border-border bg-white p-5 shadow-xl shadow-blue-900/10 md:p-6"
    >
      <h2 className="text-2xl font-bold">{t("trialTitle")}</h2>
      <p className="mt-2 text-text-2">{t("trialLead", { count: perDay })}</p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) void fc.run({ text });
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, maxChars))}
          rows={5}
          maxLength={maxChars}
          aria-label={t("trialTitle")}
          placeholder={t("trialPlaceholder")}
          className="w-full rounded-control border border-border-strong p-3 font-serif text-[16px] leading-relaxed focus:border-blue-800 focus:outline-none"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-text-2">
            {t("chars", { count: text.length, max: maxChars })}
          </span>
          <button
            type="submit"
            disabled={fc.running || !text.trim()}
            className={buttonClass("primary", "lg")}
          >
            {fc.running ? t("running") : t("trialRun")}
          </button>
        </div>
      </form>
      <div className="mt-4 space-y-3" aria-live="polite">
        {fc.mock ? <MockNote /> : null}
        {fc.error ? <AiErrorNote code={fc.error} /> : null}
        {fc.results.length || fc.running ? <SummaryTiles summary={fc.summary} /> : null}
        <ResultList results={fc.results} />
        {fc.finished && !fc.results.length && !fc.error ? (
          <p className="text-sm text-text-2">{t("factsNone")}</p>
        ) : null}
        {fc.results.length ? <Disclaimer /> : null}
        {fc.finished ? (
          <Link
            href={signedIn ? "/kabinet/yozish" : "/kirish?next=/kabinet/yozish"}
            className="inline-block text-sm font-semibold text-blue-800 hover:underline"
          >
            {t("trialMore")} →
          </Link>
        ) : null}
      </div>
    </section>
  );
}

/** Pre-check on the submission form (Ekran 6): fact check of the uploaded manuscript. */
export function PrecheckFacts({ articleId }: { articleId: string }) {
  const t = useTranslations("ai");
  const fc = useFactCheck();
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      {fc.finished && !fc.error ? (
        <p className="text-sm text-ink">
          {t("precheckSummary", {
            correct: fc.summary.correct,
            incorrect: fc.summary.incorrect,
            needs: fc.summary.needs_source,
          })}
          {fc.results.length ? (
            <button
              type="button"
              className="ml-2 font-semibold text-blue-800 hover:underline"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? "−" : "+"}
            </button>
          ) : null}
        </p>
      ) : (
        <button
          type="button"
          className={buttonClass("outline", "sm")}
          disabled={fc.running}
          onClick={() => void fc.run({ articleId })}
        >
          {fc.running ? t("running") : t("precheckRun")}
        </button>
      )}
      {fc.running && fc.results.length ? (
        <p className="text-xs text-text-2">{fc.results.length}…</p>
      ) : null}
      {fc.mock ? <MockNote /> : null}
      {fc.error ? <AiErrorNote code={fc.error} /> : null}
      {open ? <ResultList results={fc.results} /> : null}
      {fc.results.length ? <Disclaimer /> : null}
    </div>
  );
}
