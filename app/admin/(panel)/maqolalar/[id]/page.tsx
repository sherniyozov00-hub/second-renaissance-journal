import Link from "next/link";
import { aiFeatureList } from "@/lib/ai/labels";
import { notFound } from "next/navigation";
import {
  acceptAction,
  assignReviewerAction,
  commentAction,
  publicationDetailsAction,
  publishAction,
  rejectAction,
  revisionAction,
} from "@/app/admin/actions";
import { Field, PaymentText, StatusBadge, input, panel, select } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/styles";
import { requireEditor } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { formatDate, formatNumber, pick } from "@/lib/l10n";
import { getStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";

const RESULT: Record<string, string> = {
  taqrizchi: "Taqrizchi biriktirildi.",
  tuzatish: "Maqola muallifga tuzatishga qaytarildi.",
  qabul: "Maqola qabul qilindi.",
  rad: "Maqola rad etildi.",
  izoh: "Izoh qo‘shildi.",
  saqlandi: "Nashr ma’lumotlari saqlandi.",
  nashr: "Maqola nashr qilindi. PDF va sertifikatlar fon rejimida tayyorlanmoqda.",
  "xato-bad_status": "Bu amal maqolaning hozirgi holatida mumkin emas.",
  "xato-invalid": "Ma’lumotlar to‘liq emas yoki noto‘g‘ri (izoh/sabab, DOI, sahifalar, son).",
  "xato-forbidden": "Ruxsat yo‘q.",
  "xato-not_found": "Topilmadi.",
};

/** "YYYY-MM-DD" n days from now — default review deadline. */
function dateInDays(days: number) {
  return new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
}

const REC: Record<string, string> = {
  ACCEPT: "Qabul qilish",
  MINOR_REVISION: "Kichik tuzatish",
  MAJOR_REVISION: "Katta tuzatish",
  REJECT: "Rad etish",
};

export default async function AdminArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ natija?: string }>;
}) {
  const { id } = await params;
  await requireEditor(`/admin/maqolalar/${id}`);
  const { natija } = await searchParams;
  const article = await db.article.findUnique({
    where: { id },
    include: {
      category: true,
      issue: true,
      submitter: { select: { name: true, phone: true, email: true } },
      authors: { orderBy: { order: "asc" }, include: { authorProfile: true } },
      versions: { orderBy: { version: "desc" } },
      reviews: {
        orderBy: { createdAt: "asc" },
        include: { reviewer: { select: { name: true, phone: true } } },
      },
      editorComments: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      },
      payments: { orderBy: { createdAt: "desc" } },
      aiChecks: { orderBy: { createdAt: "desc" }, take: 3 },
      certificates: true,
    },
  });
  if (!article) notFound();

  const [reviewers, issues, history] = await Promise.all([
    db.user.findMany({
      where: {
        roles: { has: "REVIEWER" },
        isBlocked: false,
        id: { not: article.submitterId ?? "" },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        _count: { select: { reviews: { where: { submittedAt: null } } } },
      },
      orderBy: { name: "asc" },
    }),
    db.issue.findMany({ orderBy: [{ year: "desc" }, { number: "desc" }] }),
    db.auditLog.findMany({
      where: { entityId: article.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { name: true } } },
    }),
  ]);
  const files = await Promise.all(
    article.versions.map(async (v) => ({
      ...v,
      url: v.docxUrl ? await getStorage().signedUrl(v.docxUrl, 600) : null,
    })),
  );
  const originality = article.aiChecks.find((c) => c.type === "ORIGINALITY")?.result as
    { originality: number; matches: { title: string; overlap: number }[] } | undefined;
  const s = article.status;
  const defaultDue = dateInDays(14);

  return (
    <>
      <Link href="/admin/maqolalar" className="text-sm text-blue-800 hover:underline">
        ← Maqolalar
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-text-2">
            #{String(article.number).padStart(4, "0")} · {pick(article.category.name, "uz")}
          </p>
          <h1 className="mt-1 max-w-[860px] font-serif text-[28px] leading-tight font-bold text-ink">
            {article.titleUz}
          </h1>
          {article.titleEn ? <p className="mt-1 text-text-2">{article.titleEn}</p> : null}
        </div>
        <StatusBadge status={s} />
      </div>
      {natija && RESULT[natija] ? (
        <p
          role="status"
          className={cn(
            "mt-4 rounded-control px-4 py-3 text-sm font-semibold",
            natija.startsWith("xato") ? "bg-danger-bg text-danger" : "bg-success-bg text-success",
          )}
        >
          {RESULT[natija]}
        </p>
      ) : null}

      <div className="mt-6 grid items-start gap-5 xl:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          <section className={cn(panel, "p-5")}>
            <h2 className="font-sans text-lg font-semibold">Mualliflar</h2>
            <ol className="mt-3 space-y-1 text-sm">
              {article.authors.map((a) => (
                <li key={a.id}>
                  <strong>{a.authorProfile?.fullName ?? a.name}</strong>
                  {a.isCorresponding ? " (mas’ul)" : ""} ·{" "}
                  {a.authorProfile?.affiliation ?? a.affiliation ?? "—"}
                  {(a.authorProfile?.orcid ?? a.orcid)
                    ? ` · ORCID ${a.authorProfile?.orcid ?? a.orcid}`
                    : ""}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-sm text-text-2">
              Yuboruvchi: {article.submitter?.name ?? "—"} · {article.submitter?.phone ?? ""}{" "}
              {article.submitter?.email ?? ""}
            </p>
          </section>

          <section className={cn(panel, "p-5")}>
            <h2 className="font-sans text-lg font-semibold">Annotatsiya va kalit so‘zlar</h2>
            <p className="mt-3 font-serif leading-relaxed text-ink">{article.abstractUz}</p>
            {article.abstractEn ? (
              <p className="mt-3 font-serif leading-relaxed text-text-2" lang="en">
                {article.abstractEn}
              </p>
            ) : null}
            <p className="mt-3 text-sm text-text-2">{article.keywords.join(", ")}</p>
          </section>

          <section className={cn(panel, "p-5")}>
            <h2 className="font-sans text-lg font-semibold">Fayllar (versiyalar)</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {files.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold">v{v.version}</span>
                  <span className="text-text-2">{v.note}</span>
                  <span className="text-muted">{formatDate(v.createdAt, "uz")}</span>
                  {v.url ? (
                    <a href={v.url} className="text-blue-800 hover:underline">
                      .docx yuklab olish
                    </a>
                  ) : null}
                </li>
              ))}
              {!files.length ? <li className="text-text-2">Fayl yo‘q.</li> : null}
            </ul>
            {originality ? (
              <p className="mt-4 rounded-control bg-blue-50 px-4 py-3 text-sm">
                Originallik: <strong>{originality.originality}%</strong>
                {originality.matches.length
                  ? ` · o‘xshashlar: ${originality.matches.map((m) => `${m.title} (${m.overlap}%)`).join("; ")}`
                  : ""}
              </p>
            ) : null}
            {article.aiFeaturesUsed.length ? (
              <p className="mt-2 text-sm text-text-2">
                Xorazmiy AI ishlatilgan: {aiFeatureList(article.aiFeaturesUsed)}
              </p>
            ) : null}
          </section>

          <section className={cn(panel, "p-5")}>
            <h2 className="font-sans text-lg font-semibold">Taqrizlar</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {article.reviews.map((r) => (
                <li key={r.id} className="rounded-control border border-border p-3">
                  <p>
                    <strong>{r.reviewer.name ?? r.reviewer.phone}</strong> · muddat{" "}
                    {formatDate(r.dueAt, "uz")} ·{" "}
                    {r.submittedAt
                      ? `topshirildi ${formatDate(r.submittedAt, "uz")}`
                      : "kutilmoqda"}
                  </p>
                  {r.submittedAt ? (
                    <>
                      <p className="mt-1">
                        Dolzarblik {r.scoreRelevance} · Metodologiya {r.scoreMethodology} ·
                        Natijalar {r.scoreResults} · Til {r.scoreLanguage} ·{" "}
                        <strong>{r.recommendation ? REC[r.recommendation] : ""}</strong>
                      </p>
                      <p className="mt-1 whitespace-pre-line text-text-2">{r.comment}</p>
                    </>
                  ) : null}
                </li>
              ))}
              {!article.reviews.length ? (
                <li className="text-text-2">Taqrizchi biriktirilmagan.</li>
              ) : null}
            </ul>
          </section>

          <section className={cn(panel, "p-5")}>
            <h2 className="font-sans text-lg font-semibold">Izohlar</h2>
            <form action={commentAction} className="mt-3 space-y-2">
              <input type="hidden" name="articleId" value={article.id} />
              <textarea
                name="body"
                rows={3}
                required
                className={cn(input, "h-auto w-full py-2")}
                aria-label="Izoh"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="visible"
                    defaultChecked
                    className="accent-blue-800"
                  />{" "}
                  Muallifga ko‘rinadi
                </label>
                <button className={buttonClass("secondary", "sm", "text-ink")}>
                  Izoh qo‘shish
                </button>
              </div>
            </form>
            <ul className="mt-4 space-y-2 text-sm">
              {article.editorComments.map((c) => (
                <li key={c.id} className="rounded-control bg-blue-50/60 px-3 py-2">
                  <span className="text-muted">
                    {c.author.name} · {formatDate(c.createdAt, "uz")}{" "}
                    {c.visibleToAuthor ? "· muallifga" : "· ichki"}
                  </span>
                  <p className="mt-1 whitespace-pre-line">{c.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className={cn(panel, "p-5")}>
            <h2 className="font-sans text-lg font-semibold">Tarix (AuditLog)</h2>
            <ul className="mt-3 space-y-1 text-sm text-text-2">
              {history.map((h) => (
                <li key={h.id}>
                  {formatDate(h.createdAt, "uz")} · {h.actor?.name ?? "tizim"} · {h.action}
                  {h.after && typeof h.after === "object" && "status" in h.after
                    ? ` → ${String(h.after.status)}`
                    : ""}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-5">
          <section className={cn(panel, "p-5")}>
            <h2 className="font-sans text-lg font-semibold">To‘lov</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {article.payments.map((p) => (
                <li key={p.id}>
                  <PaymentText status={p.status} /> · {formatNumber(p.amount, "uz")} so‘m ·{" "}
                  {p.provider}
                  {p.fastTrack ? " · tezlashtirilgan" : ""}
                </li>
              ))}
              {!article.payments.length ? <li className="text-text-2">To‘lov yo‘q.</li> : null}
            </ul>
          </section>

          {s === "UNDER_REVIEW" ? (
            <section className={cn(panel, "space-y-3 p-5")}>
              <h2 className="font-sans text-lg font-semibold">Taqrizchi biriktirish</h2>
              <form action={assignReviewerAction} className="space-y-3">
                <input type="hidden" name="articleId" value={article.id} />
                <Field label="Taqrizchi">
                  <select name="reviewerId" required className={cn(select, "w-full")}>
                    {reviewers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name ?? r.phone} · ochiq taqrizlar: {r._count.reviews}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Muddat">
                  <input
                    type="date"
                    name="dueAt"
                    defaultValue={defaultDue}
                    className={cn(input, "w-full")}
                  />
                </Field>
                <button
                  className={buttonClass("primary", "md", "w-full")}
                  disabled={!reviewers.length}
                >
                  Biriktirish
                </button>
              </form>
            </section>
          ) : null}

          {s === "UNDER_REVIEW" || s === "ACCEPTED" ? (
            <section className={cn(panel, "space-y-3 p-5")}>
              <h2 className="font-sans text-lg font-semibold">Qaror</h2>
              {s === "UNDER_REVIEW" ? (
                <form action={acceptAction}>
                  <input type="hidden" name="articleId" value={article.id} />
                  <button className={buttonClass("primary", "md", "w-full")}>Qabul qilish</button>
                </form>
              ) : null}
              <form action={revisionAction} className="space-y-2">
                <input type="hidden" name="articleId" value={article.id} />
                <textarea
                  name="note"
                  rows={3}
                  required
                  minLength={5}
                  placeholder="Muallifga izoh (majburiy)"
                  className={cn(input, "h-auto w-full py-2")}
                />
                <button className={buttonClass("secondary", "md", "w-full text-warning")}>
                  Tuzatishga qaytarish
                </button>
              </form>
            </section>
          ) : null}

          {s === "ACCEPTED" ? (
            <section className={cn(panel, "space-y-3 p-5")}>
              <h2 className="font-sans text-lg font-semibold">Nashr</h2>
              <form action={publicationDetailsAction} className="space-y-3">
                <input type="hidden" name="articleId" value={article.id} />
                <Field label="Jurnal soni">
                  <select
                    name="issueId"
                    defaultValue={article.issueId ?? ""}
                    className={cn(select, "w-full")}
                  >
                    <option value="">—</option>
                    {issues.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.year} · {i.number}-son {i.status === "DRAFT" ? "(qoralama)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Bet (dan)">
                    <input
                      name="pageStart"
                      type="number"
                      min={1}
                      defaultValue={article.pageStart ?? ""}
                      className={cn(input, "w-full")}
                    />
                  </Field>
                  <Field label="Bet (gacha)">
                    <input
                      name="pageEnd"
                      type="number"
                      min={1}
                      defaultValue={article.pageEnd ?? ""}
                      className={cn(input, "w-full")}
                    />
                  </Field>
                </div>
                <Field label="DOI" hint="Masalan: 10.12345/srj.2026.1.3">
                  <input
                    name="doi"
                    defaultValue={article.doi ?? ""}
                    className={cn(input, "w-full")}
                  />
                </Field>
                <button className={buttonClass("secondary", "md", "w-full text-ink")}>
                  Saqlash
                </button>
              </form>
              <a
                href={`/admin/maqolalar/${article.id}/korinish`}
                target="_blank"
                className="block text-center text-sm text-blue-800 hover:underline"
              >
                Nashrdan oldin ko‘rib chiqish ↗
              </a>
              <form action={publishAction}>
                <input type="hidden" name="articleId" value={article.id} />
                <button
                  className={buttonClass("primary", "lg", "w-full")}
                  disabled={!article.issueId}
                >
                  Nashr qilish
                </button>
              </form>
              {!article.issueId ? (
                <p className="text-xs text-muted">Avval jurnal sonini tanlab saqlang.</p>
              ) : null}
            </section>
          ) : null}

          {s === "PUBLISHED" ? (
            <section className={cn(panel, "space-y-2 p-5 text-sm")}>
              <h2 className="font-sans text-lg font-semibold">Nashr qilingan</h2>
              <p>
                <a
                  href={`/maqola/${article.slug}`}
                  className="text-blue-800 hover:underline"
                  target="_blank"
                >
                  /maqola/{article.slug}
                </a>
              </p>
              <p>PDF: {article.versions[0]?.pdfUrl ? "tayyor" : "tayyorlanmoqda"}</p>
              <p>
                Sertifikatlar:{" "}
                {article.certificates.map((c) => `${c.id}${c.pdfUrl ? " (PDF)" : ""}`).join(", ")}
              </p>
            </section>
          ) : null}

          {s !== "PUBLISHED" && s !== "REJECTED" && s !== "DRAFT" ? (
            <section className={cn(panel, "space-y-2 p-5")}>
              <h2 className="font-sans text-lg font-semibold">Rad etish</h2>
              <form action={rejectAction} className="space-y-2">
                <input type="hidden" name="articleId" value={article.id} />
                <textarea
                  name="reason"
                  rows={2}
                  required
                  minLength={5}
                  placeholder="Sabab (muallifga yuboriladi)"
                  className={cn(input, "h-auto w-full py-2")}
                />
                <button className={buttonClass("secondary", "md", "w-full text-danger")}>
                  Rad etish
                </button>
              </form>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
