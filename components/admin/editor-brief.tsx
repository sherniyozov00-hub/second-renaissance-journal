import { getTranslations } from "next-intl/server";
import { briefAction } from "@/app/admin/actions";
import { panel } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/styles";
import type { EditorBrief } from "@/lib/editorial/assistant";
import { cn } from "@/lib/utils";

/** "Muharrir yordamchisi" panel on the editor's article page. */
export async function EditorBriefPanel({
  articleId,
  brief,
}: {
  articleId: string;
  brief: EditorBrief | null;
}) {
  const t = await getTranslations("admin.brief");
  return (
    <section className={cn(panel, "p-5")} aria-labelledby="brief-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="brief-title" className="font-sans text-lg font-semibold">
          {t("title")}
        </h2>
        <form action={briefAction}>
          <input type="hidden" name="articleId" value={articleId} />
          <button className={buttonClass("secondary", "sm")}>
            {brief ? t("rerun") : t("run")}
          </button>
        </form>
      </div>
      {!brief ? (
        <p className="mt-3 text-sm text-text-2">{t("empty")}</p>
      ) : (
        <div className="mt-3 space-y-4 text-sm">
          <p className="text-text-2">
            {t("meta", { version: brief.version, words: brief.words })} ·{" "}
            {brief.warnings ? t("warnings", { count: brief.warnings }) : t("allGood")}
          </p>

          {brief.ai ? (
            <div className="rounded-control bg-blue-50 px-4 py-3">
              <p className="font-semibold">{t(`rec_${brief.ai.recommendation}`)}</p>
              <p className="mt-1">{brief.ai.summary}</p>
              <p className="mt-1 text-text-2">{t(`scope_${brief.ai.scopeFit}`)}</p>
              {brief.ai.strengths.length ? (
                <>
                  <p className="mt-3 font-semibold">{t("strengths")}</p>
                  <ul className="mt-1 list-disc pl-5">
                    {brief.ai.strengths.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {brief.ai.concerns.length ? (
                <>
                  <p className="mt-3 font-semibold">{t("concerns")}</p>
                  <ul className="mt-1 list-disc pl-5">
                    {brief.ai.concerns.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : (
            <p className="rounded-control bg-warning-bg px-4 py-3">
              {t(brief.aiNote === "error" ? "aiError" : "aiMock")}
            </p>
          )}

          <ul className="space-y-1.5">
            {brief.checks.map((c) => (
              <li key={c.key} className="flex gap-2">
                <span aria-hidden className={c.ok ? "text-success" : "text-danger"}>
                  {c.ok ? "✓" : "!"}
                </span>
                <span className={c.ok ? "" : "font-semibold"}>{t(`check_${c.key}`, c.values)}</span>
              </li>
            ))}
          </ul>
          {brief.sectionsMissing.length ? (
            <p className="text-text-2">
              {t("missingSections")}:{" "}
              {brief.sectionsMissing.map((k) => (t.has(`sec_${k}`) ? t(`sec_${k}`) : k)).join(", ")}
            </p>
          ) : null}
          {brief.originality.matches.length ? (
            <p className="text-text-2">
              {t("similar")}:{" "}
              {brief.originality.matches.map((m) => `${m.title} (${m.overlap}%)`).join("; ")}
            </p>
          ) : null}

          <div>
            <p className="font-semibold">{t("reviewers")}</p>
            {brief.reviewers.length ? (
              <ul className="mt-1 space-y-1">
                {brief.reviewers.map((r) => (
                  <li key={r.id}>
                    {r.name} —{" "}
                    <span className="text-text-2">
                      {t("reviewerStats", { inCategory: r.inCategory, open: r.open })}
                    </span>
                    {r.conflict ? <span className="ml-2 text-danger">{t("conflict")}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-text-2">{t("noReviewers")}</p>
            )}
          </div>
          <p className="text-xs text-muted">{t("disclaimer")}</p>
        </div>
      )}
    </section>
  );
}
