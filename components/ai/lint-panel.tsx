"use client";

import type { Editor } from "@tiptap/react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { buttonClass } from "@/components/ui/styles";
import { cn } from "@/lib/utils";
import { applyLintFix, lintEditor, selectRange, type EditorLintIssue } from "./editor-ops";

/** Issue kinds whose suggestion is always safe to apply in bulk. */
const SAFE = new Set([
  "mixed-script",
  "okina-shape",
  "space-before-punct",
  "space-after-punct",
  "ordinal-year",
  "ordinal-date",
  "roman-hyphen",
  "month-spelling",
  "missing-tutuq",
]);

const card = "rounded-card border border-border bg-white p-3.5";

/**
 * "Imlo va tinish belgilari": exact, rule-based checks that run in the
 * browser — no AI, no cost, no quota. Each issue names the rule it follows.
 */
export function LintPanel({ editor }: { editor: Editor }) {
  const t = useTranslations("ai.lint");
  // Checked when the panel opens (it mounts each time the tool is chosen).
  const [issues, setIssues] = useState<EditorLintIssue[]>(() => lintEditor(editor));
  const run = useCallback(() => setIssues(lintEditor(editor)), [editor]);

  const fixOne = (i: EditorLintIssue) => {
    applyLintFix(editor, i);
    run();
  };
  const fixAll = () => {
    // From the end, so earlier ranges stay valid while later text changes.
    for (const i of [...issues].filter((x) => SAFE.has(x.id)).sort((a, b) => b.from - a.from))
      applyLintFix(editor, i);
    run();
  };

  const safeCount = issues.filter((i) => SAFE.has(i.id) && i.suggestion !== null).length;

  return (
    <>
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <p className="text-sm text-text-2">{t("intro")}</p>
      <div className="flex flex-col gap-2">
        <button type="button" className={buttonClass("secondary", "md", "w-full")} onClick={run}>
          {t("recheck")}
        </button>
        {safeCount ? (
          <button type="button" className={buttonClass("primary", "md", "w-full")} onClick={fixAll}>
            {t("fixAll", { count: safeCount })}
          </button>
        ) : null}
      </div>
      {!issues.length ? <p className="text-sm font-semibold text-success">{t("clean")}</p> : null}
      {issues.length ? (
        <p className="text-sm font-semibold">{t("found", { count: issues.length })}</p>
      ) : null}
      <ul className="space-y-2">
        {issues.map((i) => (
          <li
            key={`${i.id}:${i.from}`}
            className={cn(
              card,
              "border-l-4",
              i.severity === "error"
                ? "border-l-danger"
                : i.severity === "warning"
                  ? "border-l-gold"
                  : "border-l-border-strong",
            )}
          >
            <button
              type="button"
              onClick={() => selectRange(editor, i.from, i.to)}
              className="rounded-control bg-blue-50 px-2 py-1 font-mono text-sm text-ink hover:bg-info-bg"
              title={t("show")}
            >
              {i.match.trim() ? i.match : `“${i.match}”`}
            </button>
            {i.suggestion !== null ? (
              <span className="ml-2 text-sm text-text-2">
                →{" "}
                <span className="font-mono text-success">
                  {i.suggestion.trim() ? i.suggestion : `“${i.suggestion}”`}
                </span>
              </span>
            ) : null}
            <p className="mt-1.5 text-sm text-ink">{i.message}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="text-xs text-muted">{i.rule}</span>
              {i.suggestion !== null ? (
                <button
                  type="button"
                  onClick={() => fixOne(i)}
                  className="text-sm font-semibold text-blue-800 hover:underline"
                >
                  {t("fix")}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
