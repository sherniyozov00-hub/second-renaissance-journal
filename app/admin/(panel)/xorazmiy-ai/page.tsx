import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import {
  deleteKnowledgeAction,
  promoteFeedbackAction,
  saveKnowledgeAction,
} from "@/app/admin/ai-actions";
import { Field, PageTitle, StatCard, input, panel, select, td, th } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/styles";
import type { AiKnowledge } from "@/generated/prisma/client";
import { requireEditor } from "@/lib/admin/auth";
import { aiMode } from "@/lib/ai/client";
import { db } from "@/lib/db";
import { formatDate, pick } from "@/lib/l10n";
import { cn } from "@/lib/utils";

export const metadata = { title: "Xorazmiy AI" };

const KINDS = ["STYLE", "GUIDE", "CHECKLIST", "EXAMPLE"] as const;
const TYPES = ["RESEARCH", "REVIEW", "CASE_STUDY", "POPULAR"] as const;

async function KnowledgeForm({
  k,
  categories,
}: {
  k?: AiKnowledge;
  categories: { id: string; name: unknown }[];
}) {
  const [t, tc, locale] = await Promise.all([
    getTranslations("admin.ai"),
    getTranslations("admin.common"),
    getLocale() as Promise<AppLocale>,
  ]);
  return (
    <form action={saveKnowledgeAction} className="space-y-4 p-5">
      {k ? <input type="hidden" name="id" value={k.id} /> : null}
      <div className="grid gap-3 md:grid-cols-4">
        <Field label={t("name")}>
          <input name="title" required defaultValue={k?.title} className={cn(input, "w-full")} />
        </Field>
        <Field label={t("kind")}>
          <select name="kind" defaultValue={k?.kind ?? "GUIDE"} className={cn(select, "w-full")}>
            {KINDS.map((v) => (
              <option key={v} value={v}>
                {t(`kind_${v}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("articleType")}>
          <select
            name="articleType"
            defaultValue={k?.articleType ?? ""}
            className={cn(select, "w-full")}
          >
            <option value="">{tc("all")}</option>
            {TYPES.map((v) => (
              <option key={v} value={v}>
                {t(`type_${v}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("category")}>
          <select
            name="categoryId"
            defaultValue={k?.categoryId ?? ""}
            className={cn(select, "w-full")}
          >
            <option value="">{tc("all")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {pick(c.name, locale)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t("body")} hint={t("bodyHint")}>
        <textarea
          name="body"
          required
          rows={10}
          defaultValue={k?.body}
          className="w-full rounded-control border border-border-strong p-3 font-mono text-[13px] leading-relaxed focus:border-blue-800 focus:outline-none"
        />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" value="1" defaultChecked={k?.active ?? true} />{" "}
          {t("active")}
        </label>
        <button type="submit" className={buttonClass("primary", "md")}>
          {k ? tc("save") : tc("add")}
        </button>
      </div>
    </form>
  );
}

/**
 * Xorazmiy AI (stage 6): cost this month, the knowledge base that teaches
 * the AI each article type, and author feedback that can become examples.
 */
export default async function AiAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ natija?: string }>;
}) {
  await requireEditor("/admin/xorazmiy-ai");
  const { natija } = await searchParams;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [byType, total, knowledge, categories, feedback, votes] = await Promise.all([
    db.aiCheck.groupBy({
      by: ["type"],
      where: { createdAt: { gte: monthStart }, NOT: { model: "summary" } },
      _count: true,
      _sum: { cost: true, tokensIn: true, tokensOut: true },
    }),
    db.aiCheck.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { cost: true } }),
    db.aiKnowledge.findMany({ orderBy: [{ kind: "asc" }, { key: "asc" }] }),
    db.category.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } }),
    db.aiFeedback.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    db.aiFeedback.groupBy({ by: ["feature", "verdict"], _count: true }),
  ]);
  const vote = (feature: string, verdict: string) =>
    votes.find((v) => v.feature === feature && v.verdict === verdict)?._count ?? 0;
  const accepted = vote("edit", "accepted");
  const rejected = vote("edit", "rejected");

  const [t, tc, locale] = await Promise.all([
    getTranslations("admin.ai"),
    getTranslations("admin.common"),
    getLocale() as Promise<AppLocale>,
  ]);
  return (
    <>
      <PageTitle title="Xorazmiy AI" />
      {natija ? (
        <p
          className={cn(
            "mt-4 rounded-control px-4 py-3 text-sm font-semibold",
            natija === "xato" ? "bg-danger-bg text-danger" : "bg-success-bg text-success",
          )}
        >
          {t(
            `res_${["xato", "namuna", "ochirildi"].includes(natija) ? natija : "saqlandi"}` as "res_saqlandi",
          )}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-text-2">
        {t("mode")}: <strong>{(await aiMode()) === "live" ? t("live") : t("mock")}</strong>.{" "}
        {t("modeHint")}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("cost")} value={`$${Number(total._sum.cost ?? 0).toFixed(2)}`} />
        <StatCard label={t("requests")} value={byType.reduce((n, x) => n + x._count, 0)} />
        <StatCard
          label={t("acceptedRate")}
          value={
            accepted + rejected ? `${Math.round((accepted / (accepted + rejected)) * 100)}%` : "—"
          }
        />
        <StatCard label={t("knowledgeCount")} value={knowledge.filter((k) => k.active).length} />
      </div>

      <section className={cn(panel, "mt-6 overflow-x-auto")}>
        <table className="w-full min-w-[560px]">
          <thead className="border-b border-border bg-blue-50/60">
            <tr>
              <th className={th}>{t("colFeature")}</th>
              <th className={th}>{t("colRequests")}</th>
              <th className={th}>{t("colTokens")}</th>
              <th className={th}>{t("colPrice")}</th>
            </tr>
          </thead>
          <tbody>
            {byType.map((r) => (
              <tr key={r.type} className="border-b border-border last:border-0">
                <td className={td}>{t(`f_${r.type}`)}</td>
                <td className={td}>{r._count}</td>
                <td className={td}>
                  {(r._sum.tokensIn ?? 0).toLocaleString(locale)} /{" "}
                  {(r._sum.tokensOut ?? 0).toLocaleString(locale)}
                </td>
                <td className={td}>${Number(r._sum.cost ?? 0).toFixed(4)}</td>
              </tr>
            ))}
            {!byType.length ? (
              <tr>
                <td className={td} colSpan={4}>
                  {t("noRequests")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <h2 className="mt-8 font-sans text-xl font-semibold">{t("kbTitle")}</h2>
      <p className="mt-1 max-w-[760px] text-sm text-text-2">{t("kbLead")}</p>
      <div className="mt-4 space-y-3">
        {knowledge.map((k) => (
          <details key={k.id} className={cn(panel, !k.active && "opacity-60")}>
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-5 py-4">
              <span className="font-semibold">{k.title}</span>
              <span className="text-xs text-text-2">
                {t(`kind_${k.kind}`)} · {k.articleType ? t(`type_${k.articleType}`) : t("allTypes")}{" "}
                · v{k.version}
                {k.active ? "" : t("inactive")}
              </span>
            </summary>
            <div className="border-t border-border">
              <KnowledgeForm k={k} categories={categories} />
              <form action={deleteKnowledgeAction} className="px-5 pb-5">
                <input type="hidden" name="id" value={k.id} />
                <button type="submit" className="text-sm font-semibold text-danger hover:underline">
                  {tc("delete")}
                </button>
              </form>
            </div>
          </details>
        ))}
        <details className={panel}>
          <summary className="cursor-pointer px-5 py-4 font-semibold text-blue-800">
            {t("newEntry")}
          </summary>
          <div className="border-t border-border">
            <KnowledgeForm categories={categories} />
          </div>
        </details>
      </div>

      <h2 className="mt-8 font-sans text-xl font-semibold">{t("feedbackTitle")}</h2>
      <p className="mt-1 text-sm text-text-2">{t("feedbackLead")}</p>
      <section className={cn(panel, "mt-4 overflow-x-auto")}>
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-border bg-blue-50/60">
            <tr>
              <th className={th}>{t("colDate")}</th>
              <th className={th}>{t("colFeature")}</th>
              <th className={th}>{t("colVerdict")}</th>
              <th className={th}>{t("colContent")}</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {feedback.map((f) => {
              const p = (f.payload ?? {}) as Record<string, unknown>;
              const text =
                "original" in p
                  ? `“${p.original}” → “${p.replacement}”`
                  : "q" in p
                    ? String(p.q ?? "")
                    : "text" in p
                      ? String(p.text)
                      : "";
              return (
                <tr key={f.id} className="border-b border-border last:border-0">
                  <td className={td}>{formatDate(f.createdAt, locale)}</td>
                  <td className={td}>{f.feature}</td>
                  <td className={td}>{f.verdict}</td>
                  <td className={cn(td, "max-w-[420px] truncate")}>{text}</td>
                  <td className={td}>
                    {f.promoted ? (
                      <span className="text-xs text-success">{t("isExample")}</span>
                    ) : f.verdict === "up" || f.verdict === "accepted" ? (
                      <form action={promoteFeedbackAction}>
                        <input type="hidden" name="id" value={f.id} />
                        <button
                          type="submit"
                          className="text-sm font-semibold text-blue-800 hover:underline"
                        >
                          {t("promote")}
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {!feedback.length ? (
              <tr>
                <td className={td} colSpan={5}>
                  {t("noFeedback")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
