import { getTranslations } from "next-intl/server";
import { startMentorEvalAction } from "@/app/admin/ai-actions";
import { panel } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/styles";
import { db } from "@/lib/db";
import type { EvalRun } from "@/lib/ai/mentor-eval";
import { cn } from "@/lib/utils";

type Stored =
  | ({ status: "done" } & EvalRun)
  | { status: "running"; at: string }
  | { status: "error"; error: string };

/** Admin → Xorazmiy AI: run the Ustoz evaluation and read the last result. */
export async function MentorEvalSection({ live, isAdmin }: { live: boolean; isAdmin: boolean }) {
  const t = await getTranslations("admin.ai.eval");
  const last = await db.aiCheck.findFirst({
    where: { type: "MENTOR", model: "eval" },
    orderBy: { createdAt: "desc" },
    select: { result: true, createdAt: true },
  });
  const run = last?.result as Stored | undefined;

  return (
    <section className={cn(panel, "mt-6 p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="font-sans text-xl font-semibold">{t("title")}</h2>
          <p className="mt-1 text-sm text-text-2">{t("lead")}</p>
          {!live ? (
            <p className="mt-1 text-sm font-semibold text-warning">{t("mockNote")}</p>
          ) : null}
        </div>
        {isAdmin ? (
          <form action={startMentorEvalAction}>
            <button
              type="submit"
              className={buttonClass("primary", "md")}
              disabled={run?.status === "running"}
            >
              {run?.status === "running" ? t("running") : t("run")}
            </button>
          </form>
        ) : null}
      </div>

      {run?.status === "running" ? (
        <p className="mt-4 text-sm text-text-2">{t("runningHint")}</p>
      ) : null}
      {run?.status === "error" ? (
        <p className="mt-4 rounded-control bg-danger-bg px-3 py-2 text-sm text-danger">
          {t("error")}: {run.error}
        </p>
      ) : null}
      {run?.status === "done" ? (
        <>
          <p className="mt-4 text-sm">
            <strong>
              {t("summary", {
                passed: run.passed,
                total: run.total,
                checks: run.checksPassed,
                checksTotal: run.checksTotal,
              })}
            </strong>{" "}
            · {run.model} · ${run.cost.toFixed(3)} · {new Date(run.at).toLocaleString("uz-UZ")}
          </p>
          <ul className="mt-3 space-y-2">
            {run.results.map((r) => (
              <li key={r.id} className="rounded-card border border-border">
                <details>
                  <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm">
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-xs font-bold",
                        r.passed ? "bg-success-bg text-success" : "bg-danger-bg text-danger",
                      )}
                      aria-label={r.passed ? t("pass") : t("fail")}
                    >
                      {r.passed ? "✓" : "✗"}
                    </span>
                    <span className="font-semibold">{r.title}</span>
                    <span className="text-text-2">— {r.goal}</span>
                  </summary>
                  <div className="space-y-2 border-t border-border px-4 py-3 text-sm">
                    <p>
                      <span className="font-semibold">{t("message")}:</span> {r.message}
                    </p>
                    {r.error ? (
                      <p className="text-danger">{r.error}</p>
                    ) : (
                      <p className="rounded-control bg-blue-50 px-3 py-2 whitespace-pre-line">
                        {r.reply}
                      </p>
                    )}
                    <ul className="flex flex-wrap gap-1.5">
                      {r.checks.map((k) => (
                        <li
                          key={k.label}
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs",
                            k.ok ? "bg-success-bg text-success" : "bg-danger-bg text-danger",
                          )}
                        >
                          {k.ok ? "✓" : "✗"} {k.label}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-text-2">
                      {t("stage")}: {r.stage} · {t("notes")}: {r.notes || "—"}
                    </p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {!run ? <p className="mt-4 text-sm text-text-2">{t("never")}</p> : null}
    </section>
  );
}
