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

const KIND_LABEL = {
  STYLE: "Uslub va qoidalar",
  GUIDE: "Maqola turi qo‘llanmasi",
  CHECKLIST: "Tekshiruv ro‘yxati",
  EXAMPLE: "Namuna",
} as const;
const TYPE_LABEL = {
  RESEARCH: "Tadqiqot",
  REVIEW: "Sharh",
  CASE_STUDY: "Keys-stadi",
  POPULAR: "Ilmiy-ommabop",
} as const;
const FEATURE_LABEL: Record<string, string> = {
  FACTCHECK: "Fakt tekshiruvi",
  SOURCES: "Manbalar",
  EDIT: "Tahrir",
  ORIGINALITY: "Originallik",
  PLAN: "Reja",
  ASSIST: "Yozishga yordam",
  CITATIONS: "Iqtiboslar",
  TRANSLATE: "Tarjima",
  CHAT: "Chat",
};

function KnowledgeForm({
  k,
  categories,
}: {
  k?: AiKnowledge;
  categories: { id: string; name: unknown }[];
}) {
  return (
    <form action={saveKnowledgeAction} className="space-y-4 p-5">
      {k ? <input type="hidden" name="id" value={k.id} /> : null}
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Nomi">
          <input name="title" required defaultValue={k?.title} className={cn(input, "w-full")} />
        </Field>
        <Field label="Turi">
          <select name="kind" defaultValue={k?.kind ?? "GUIDE"} className={cn(select, "w-full")}>
            {Object.entries(KIND_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Maqola turi">
          <select
            name="articleType"
            defaultValue={k?.articleType ?? ""}
            className={cn(select, "w-full")}
          >
            <option value="">Barchasi</option>
            {Object.entries(TYPE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Yo‘nalish">
          <select
            name="categoryId"
            defaultValue={k?.categoryId ?? ""}
            className={cn(select, "w-full")}
          >
            <option value="">Barchasi</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {pick(c.name, "uz")}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field
        label="Matn (Markdown)"
        hint="AI har so‘rovda shu matnni o‘qiydi. Qisqa, aniq qoidalar va namunalar yozing."
      >
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
          <input type="checkbox" name="active" value="1" defaultChecked={k?.active ?? true} /> Faol
        </label>
        <button type="submit" className={buttonClass("primary", "md")}>
          {k ? "Saqlash" : "Qo‘shish"}
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
          {natija === "xato"
            ? "Saqlanmadi: nomi va matni majburiy."
            : natija === "namuna"
              ? "Javob namunalar bazasiga qo‘shildi."
              : natija === "ochirildi"
                ? "O‘chirildi."
                : "Saqlandi. AI bir daqiqa ichida yangi bilimdan foydalanadi."}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-text-2">
        Rejim:{" "}
        <strong>
          {aiMode() === "live" ? "Claude API ulangan" : "sinov (ANTHROPIC_API_KEY yo‘q)"}
        </strong>
        . Model va limitlar — Sozlamalar → ai.*.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="AI xarajati (oy)" value={`$${Number(total._sum.cost ?? 0).toFixed(2)}`} />
        <StatCard label="So‘rovlar (oy)" value={byType.reduce((n, x) => n + x._count, 0)} />
        <StatCard
          label="Tahrir qabul qilindi"
          value={
            accepted + rejected ? `${Math.round((accepted / (accepted + rejected)) * 100)}%` : "—"
          }
        />
        <StatCard label="Bilim bazasi" value={knowledge.filter((k) => k.active).length} />
      </div>

      <section className={cn(panel, "mt-6 overflow-x-auto")}>
        <table className="w-full min-w-[560px]">
          <thead className="border-b border-border bg-blue-50/60">
            <tr>
              <th className={th}>Funksiya</th>
              <th className={th}>So‘rovlar</th>
              <th className={th}>Tokenlar (kirish / chiqish)</th>
              <th className={th}>Narx</th>
            </tr>
          </thead>
          <tbody>
            {byType.map((r) => (
              <tr key={r.type} className="border-b border-border last:border-0">
                <td className={td}>{FEATURE_LABEL[r.type] ?? r.type}</td>
                <td className={td}>{r._count}</td>
                <td className={td}>
                  {(r._sum.tokensIn ?? 0).toLocaleString("ru-RU")} /{" "}
                  {(r._sum.tokensOut ?? 0).toLocaleString("ru-RU")}
                </td>
                <td className={td}>${Number(r._sum.cost ?? 0).toFixed(4)}</td>
              </tr>
            ))}
            {!byType.length ? (
              <tr>
                <td className={td} colSpan={4}>
                  Shu oy so‘rov bo‘lmagan.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <h2 className="mt-8 font-sans text-xl font-semibold">Bilim bazasi — AI’ni o‘qitish</h2>
      <p className="mt-1 max-w-[760px] text-sm text-text-2">
        Har bir so‘rovda AI shu yozuvlarni (maqola turi va yo‘nalishiga mosini) hamda jurnalda nashr
        qilingan eng ko‘p o‘qilgan maqolalar tuzilmasini o‘qiydi. Yangi qoida yoki namuna
        qo‘shsangiz, AI darhol unga amal qiladi. Sifatni tekshirish: <code>npm run ai:eval</code>.
      </p>
      <div className="mt-4 space-y-3">
        {knowledge.map((k) => (
          <details key={k.id} className={cn(panel, !k.active && "opacity-60")}>
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-5 py-4">
              <span className="font-semibold">{k.title}</span>
              <span className="text-xs text-text-2">
                {KIND_LABEL[k.kind]} · {k.articleType ? TYPE_LABEL[k.articleType] : "barcha turlar"}{" "}
                · v{k.version}
                {k.active ? "" : " · nofaol"}
              </span>
            </summary>
            <div className="border-t border-border">
              <KnowledgeForm k={k} categories={categories} />
              <form action={deleteKnowledgeAction} className="px-5 pb-5">
                <input type="hidden" name="id" value={k.id} />
                <button type="submit" className="text-sm font-semibold text-danger hover:underline">
                  O‘chirish
                </button>
              </form>
            </div>
          </details>
        ))}
        <details className={panel}>
          <summary className="cursor-pointer px-5 py-4 font-semibold text-blue-800">
            + Yangi yozuv
          </summary>
          <div className="border-t border-border">
            <KnowledgeForm categories={categories} />
          </div>
        </details>
      </div>

      <h2 className="mt-8 font-sans text-xl font-semibold">Mualliflar fikri</h2>
      <p className="mt-1 text-sm text-text-2">
        Qabul qilingan tahrirlar va “foydali” deb belgilangan javoblarni namunaga aylantiring — AI
        shunday javob berishni o‘rganadi.
      </p>
      <section className={cn(panel, "mt-4 overflow-x-auto")}>
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-border bg-blue-50/60">
            <tr>
              <th className={th}>Sana</th>
              <th className={th}>Funksiya</th>
              <th className={th}>Baho</th>
              <th className={th}>Mazmun</th>
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
                  <td className={td}>{formatDate(f.createdAt, "uz")}</td>
                  <td className={td}>{f.feature}</td>
                  <td className={td}>{f.verdict}</td>
                  <td className={cn(td, "max-w-[420px] truncate")}>{text}</td>
                  <td className={td}>
                    {f.promoted ? (
                      <span className="text-xs text-success">namuna</span>
                    ) : f.verdict === "up" || f.verdict === "accepted" ? (
                      <form action={promoteFeedbackAction}>
                        <input type="hidden" name="id" value={f.id} />
                        <button
                          type="submit"
                          className="text-sm font-semibold text-blue-800 hover:underline"
                        >
                          Namunaga aylantirish
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
                  Hali fikr yo‘q.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
