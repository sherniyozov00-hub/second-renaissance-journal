"use client";

import { PrecheckFacts } from "@/components/ai/fact-check-box";
import { templateHref } from "@/lib/academy/template-href";
import { ArrowDown, ArrowUp, FileText, Upload, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  payAction,
  precheckAction,
  priceAction,
  saveDraftAction,
  uploadAction,
  type UploadState,
} from "@/app/[locale]/kabinet/(submit)/yuborish/actions";
import { buttonClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import type { Precheck, Pricing, SubmitIssue } from "@/lib/submission/service";
import { cn } from "@/lib/utils";

const FORM_ID = "submission";
const INPUT =
  "mt-1.5 h-11 w-full rounded-control border border-border-strong bg-white px-3 text-[15px] text-ink outline-none placeholder:text-muted focus:border-blue-800";
const SELECT = cn(INPUT, "bg-blue-50/40");
const CARD = "rounded-card border border-border bg-white p-5 md:p-6";
const LABEL = "block text-sm font-semibold text-ink";

type Author = { name: string; affiliation: string; orcid: string };

export type SubmissionInitial = {
  articleId: string | null;
  titleUz: string;
  titleEn: string;
  titleRu: string;
  categoryId: string;
  type: string;
  language: string;
  abstractUz: string;
  abstractEn: string;
  keywords: string;
  authors: Author[];
  corresponding: number;
  file: { name: string } | null;
};

const countWords = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

export function SubmissionForm({
  initial,
  categories,
  pricing: initialPricing,
  sandbox,
  providers,
}: {
  initial: SubmissionInitial;
  categories: { id: string; name: string }[];
  pricing: Pricing | null;
  sandbox: boolean;
  /** Payment methods that work right now (lib/payments/providers.ts). */
  providers: ("CLICK_QR" | "CLICK" | "PAYME" | "UZUM" | "CARD")[];
}) {
  const t = useTranslations("submit");
  const locale = useLocale();
  const ta = useTranslations("article.types");
  const [articleId, setArticleId] = useState(initial.articleId);
  const [authors, setAuthors] = useState<Author[]>(
    initial.authors.length ? initial.authors : [{ name: "", affiliation: "", orcid: "" }],
  );
  const [corresponding, setCorresponding] = useState(initial.corresponding);
  const [abstract, setAbstract] = useState(initial.abstractUz);
  const [abstractEn, setAbstractEn] = useState(initial.abstractEn);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    initial.articleId ? "saved" : "idle",
  );
  const dirty = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [file, setFile] = useState(initial.file);
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [uploading, startUpload] = useTransition();
  const [check, setCheck] = useState<Precheck | null>(null);
  const [checking, startCheck] = useTransition();

  const [pricing, setPricing] = useState(initialPricing);
  const [fastTrack, setFastTrack] = useState(false);
  const [promo, setPromo] = useState("");
  const [promoError, setPromoError] = useState(false);
  const [issues, setIssues] = useState<SubmitIssue[]>([]);
  const [paying, startPay] = useTransition();

  // ── Autosave ─────────────────────────────────────────────────────────────
  // Saves run one at a time and always use the latest id: two saves started
  // together (a blur and the upload, say) must not create the draft twice.
  const idRef = useRef(initial.articleId);
  const inflight = useRef<Promise<string | null> | null>(null);
  const save = useCallback(async (): Promise<string | null> => {
    while (inflight.current) await inflight.current;
    const run = (async () => {
      if (!formRef.current) return idRef.current;
      const data = new FormData(formRef.current);
      data.set("articleId", idRef.current ?? "");
      if (!idRef.current && !String(data.get("titleUz") ?? "").trim()) return null;
      setSaveState("saving");
      const res = await saveDraftAction(data);
      dirty.current = false;
      if ("id" in res) {
        setSaveState("saved");
        if (res.id !== idRef.current) {
          idRef.current = res.id;
          setArticleId(res.id);
          const url = new URL(window.location.href);
          url.searchParams.set("maqola", res.id);
          window.history.replaceState(null, "", url);
        }
        return res.id;
      }
      setSaveState("idle");
      return null;
    })();
    inflight.current = run;
    try {
      return await run;
    } finally {
      if (inflight.current === run) inflight.current = null;
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => dirty.current && void save(), 10_000);
    return () => clearInterval(timer);
  }, [save]);

  const onChange = () => {
    dirty.current = true;
  };
  const onBlur = () => dirty.current && void save();

  // ── Upload and pre-check ─────────────────────────────────────────────────
  function sendFile(f: File | undefined) {
    if (!f) return;
    startUpload(async () => {
      const id = articleId ?? (await save());
      if (!id) {
        setUpload({ ok: false, error: "save_first" });
        return;
      }
      const data = new FormData();
      data.set("articleId", id);
      data.set("file", f);
      const res = await uploadAction(data);
      setUpload(res);
      if (res.ok) {
        setFile({ name: res.name });
        startCheck(async () => setCheck(await precheckAction(id)));
      }
    });
  }

  useEffect(() => {
    if (initial.articleId && initial.file)
      startCheck(async () => setCheck(await precheckAction(initial.articleId!)));
  }, [initial.articleId, initial.file]);

  // ── Pricing and payment ──────────────────────────────────────────────────
  function refreshPrice(nextFast: boolean, code: string) {
    void priceAction(nextFast, code).then((r) => {
      setPricing(r.pricing);
      setPromoError(r.promoError);
    });
  }

  function pay(data: FormData) {
    startPay(async () => {
      const id = (await save()) ?? articleId;
      if (!id) {
        setIssues(["titleUz"]);
        return;
      }
      data.set("articleId", id);
      const res = await payAction(data);
      if ("redirect" in res) window.location.assign(res.redirect);
      else setIssues(res.issues);
    });
  }

  // ── Step indicator (Ekran 6) ─────────────────────────────────────────────
  const step1 = Boolean(articleId) && countWords(abstract) >= 150;
  const step2 = authors.some((a) => a.name.trim());
  const done = [step1, step2, Boolean(file), Boolean(check)];
  const current = done.findIndex((d) => !d);
  const stepIndex = current === -1 ? 4 : current;

  // Same output on server and in every browser: "50 000".
  const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  const abstractWords = countWords(abstract);
  const precheckIssues = check ? listPrecheckIssues(check, t) : [];

  return (
    <div>
      <ol className="grid grid-cols-3 gap-2 md:grid-cols-6" aria-label={t("title")}>
        {(["1", "2", "3", "4", "5", "6"] as const).map((s, i) => (
          <li
            key={s}
            aria-current={i === stepIndex ? "step" : undefined}
            className={cn(
              "rounded-control border px-3 py-2 text-[13px] font-semibold",
              i < stepIndex
                ? "border-blue-800 bg-blue-800 text-white"
                : i === stepIndex
                  ? "border-gold bg-gold text-blue-900"
                  : "border-border-strong bg-white text-ink",
            )}
          >
            {t(`steps.${s}`)}
          </li>
        ))}
      </ol>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <form
            id={FORM_ID}
            ref={formRef}
            onChange={onChange}
            onBlur={onBlur}
            onSubmit={(e) => e.preventDefault()}
            className="space-y-5"
          >
            <input type="hidden" name="articleId" value={articleId ?? ""} />

            <section className={CARD} aria-labelledby="s1">
              <h2 id="s1" className="font-sans text-lg font-semibold text-ink">
                {t("s1")}
              </h2>
              <div className="mt-4 space-y-4">
                <label className={LABEL}>
                  {t("titleUz")}
                  <input
                    name="titleUz"
                    defaultValue={initial.titleUz}
                    required
                    maxLength={400}
                    className={INPUT}
                  />
                </label>
                <label className={LABEL}>
                  {t("titleEn")}
                  <input
                    name="titleEn"
                    defaultValue={initial.titleEn}
                    placeholder={t("titleEnPlaceholder")}
                    maxLength={400}
                    className={INPUT}
                    lang="en"
                  />
                </label>
                <label className={LABEL}>
                  {t("titleRu")}
                  <input
                    name="titleRu"
                    defaultValue={initial.titleRu}
                    maxLength={400}
                    className={INPUT}
                    lang="ru"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className={LABEL}>
                    {t("category")}
                    <select name="categoryId" defaultValue={initial.categoryId} className={SELECT}>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={LABEL}>
                    {t("type")}
                    <select name="type" defaultValue={initial.type} className={SELECT}>
                      {(["RESEARCH", "REVIEW", "CASE_STUDY", "POPULAR"] as const).map((x) => (
                        <option key={x} value={x}>
                          {ta(x)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={LABEL}>
                    {t("language")}
                    <select name="language" defaultValue={initial.language} className={SELECT}>
                      <option value="uz">O‘zbekcha</option>
                      <option value="ru">Русский</option>
                      <option value="en">English</option>
                    </select>
                  </label>
                </div>
                <label className={LABEL}>
                  {t("abstract")}
                  <span className="block text-xs font-normal text-muted">{t("abstractHint")}</span>
                  <textarea
                    name="abstractUz"
                    value={abstract}
                    onChange={(e) => setAbstract(e.target.value)}
                    rows={5}
                    className={cn(INPUT, "h-auto py-2")}
                  />
                  <WordCount count={abstractWords} label={t("words", { count: abstractWords })} />
                </label>
                <label className={LABEL}>
                  {t("abstractEn")}
                  <span className="block text-xs font-normal text-muted">
                    {t("abstractEnHint")}
                  </span>
                  <textarea
                    name="abstractEn"
                    value={abstractEn}
                    onChange={(e) => setAbstractEn(e.target.value)}
                    rows={4}
                    lang="en"
                    className={cn(INPUT, "h-auto py-2")}
                  />
                  <WordCount
                    count={countWords(abstractEn)}
                    label={t("words", { count: countWords(abstractEn) })}
                  />
                </label>
                <label className={LABEL}>
                  {t("keywords")}
                  <span className="block text-xs font-normal text-muted">{t("keywordsHint")}</span>
                  <input name="keywords" defaultValue={initial.keywords} className={INPUT} />
                </label>
              </div>
            </section>

            <section className={CARD} aria-labelledby="s2">
              <h2 id="s2" className="font-sans text-lg font-semibold text-ink">
                {t("s2")}
              </h2>
              <ol className="mt-4 space-y-3">
                {authors.map((a, i) => (
                  <li key={i} className="rounded-card border border-border p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className={LABEL}>
                        {t("authorName")}
                        <input
                          name="authorName"
                          value={a.name}
                          onChange={(e) =>
                            setAuthors((xs) =>
                              xs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                            )
                          }
                          className={INPUT}
                        />
                      </label>
                      <label className={LABEL}>
                        {t("authorAffiliation")}
                        <input
                          name="authorAffiliation"
                          value={a.affiliation}
                          placeholder={t("authorAffiliationPlaceholder")}
                          onChange={(e) =>
                            setAuthors((xs) =>
                              xs.map((x, j) =>
                                j === i ? { ...x, affiliation: e.target.value } : x,
                              ),
                            )
                          }
                          className={INPUT}
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <label className={cn(LABEL, "min-w-[200px] flex-1")}>
                        {t("authorOrcid")}
                        <input
                          name="authorOrcid"
                          value={a.orcid}
                          placeholder="0000-0000-0000-0000"
                          onChange={(e) =>
                            setAuthors((xs) =>
                              xs.map((x, j) => (j === i ? { ...x, orcid: e.target.value } : x)),
                            )
                          }
                          className={INPUT}
                        />
                      </label>
                      <label
                        className={cn(
                          "flex h-11 cursor-pointer items-center gap-2 rounded-control px-3 text-sm font-semibold",
                          corresponding === i ? "bg-info-bg text-blue-800" : "text-text-2",
                        )}
                      >
                        <input
                          type="radio"
                          name="corresponding"
                          value={i}
                          checked={corresponding === i}
                          onChange={() => setCorresponding(i)}
                          className="accent-blue-800"
                        />
                        {t("corresponding")}
                      </label>
                      <div className="flex gap-1">
                        <IconButton
                          label={t("moveUp")}
                          disabled={i === 0}
                          onClick={() => setAuthors((xs) => move(xs, i, -1))}
                        >
                          <ArrowUp className="size-4" />
                        </IconButton>
                        <IconButton
                          label={t("moveDown")}
                          disabled={i === authors.length - 1}
                          onClick={() => setAuthors((xs) => move(xs, i, 1))}
                        >
                          <ArrowDown className="size-4" />
                        </IconButton>
                        {authors.length > 1 ? (
                          <IconButton
                            label={t("removeAuthor")}
                            onClick={() => setAuthors((xs) => xs.filter((_, j) => j !== i))}
                          >
                            <X className="size-4" />
                          </IconButton>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() =>
                  setAuthors((xs) => [...xs, { name: "", affiliation: "", orcid: "" }])
                }
                className="mt-3 inline-flex min-h-10 items-center rounded-control border border-dashed border-blue-800 px-3 text-sm font-semibold text-blue-800"
              >
                {t("addAuthor")}
              </button>
            </section>
          </form>

          <section className={CARD} aria-labelledby="s3">
            <h2 id="s3" className="font-sans text-lg font-semibold text-ink">
              {t("s3")}
            </h2>
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                sendFile(e.dataTransfer.files[0]);
              }}
              className="mt-4 flex cursor-pointer flex-col items-center rounded-card border-2 border-dashed border-border-strong px-4 py-8 text-center hover:border-blue-800"
            >
              <Upload className="size-6 text-blue-800" aria-hidden />
              <span className="mt-2 font-semibold text-ink">
                {uploading ? t("uploading") : t("dropTitle")}
              </span>
              <span className="mt-1 text-sm text-text-2">
                {t.rich("dropHint", {
                  template: (c) => (
                    <a
                      href={templateHref(locale)}
                      className="text-blue-800 underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c}
                    </a>
                  ),
                })}
              </span>
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                onChange={(e) => sendFile(e.target.files?.[0])}
              />
            </label>
            {file ? (
              <p className="mt-3 flex items-center gap-2 rounded-control border border-border px-3 py-2 text-sm text-ink">
                <FileText className="size-4 text-text-2" aria-hidden />
                <span className="flex-1 truncate">
                  {file.name}
                  {upload?.ok
                    ? ` · ${upload.sizeKb >= 1024 ? `${(upload.sizeKb / 1024).toFixed(1)} MB` : `${upload.sizeKb} KB`}`
                    : ""}
                </span>
                <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-semibold text-success">
                  {t("uploaded")}
                </span>
              </p>
            ) : null}
            {upload && !upload.ok ? (
              <p
                role="alert"
                className="mt-3 rounded-control bg-danger-bg px-3 py-2 text-sm text-danger"
              >
                {t(`fileErrors.${upload.error}`)}
              </p>
            ) : null}
          </section>

          <section className={CARD} aria-labelledby="s4" aria-busy={checking}>
            <div className="flex items-center justify-between gap-3">
              <h2 id="s4" className="font-sans text-lg font-semibold text-ink">
                {t("s4")}
              </h2>
              {check ? (
                <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-semibold text-success">
                  {t("ready")}
                </span>
              ) : checking ? (
                <span className="text-sm text-muted">{t("checking")}</span>
              ) : null}
            </div>
            {check ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Metric
                    label={t("originality")}
                    value={`${check.originality.originality}%`}
                    tone={
                      check.requirements.minOriginality &&
                      check.originality.originality < check.requirements.minOriginality
                        ? "warn"
                        : "ok"
                    }
                  />
                  <div className="rounded-control border border-border p-3">
                    <p className="mb-1.5 text-xs text-text-2">{t("facts")}</p>
                    {articleId ? <PrecheckFacts articleId={articleId} /> : null}
                  </div>
                  <Metric
                    label={t("citations")}
                    value="APA 7"
                    note={
                      check.template.references < check.requirements.minReferences
                        ? t("citationsShort", {
                            missing: check.requirements.minReferences - check.template.references,
                          })
                        : undefined
                    }
                    tone={
                      check.template.references < check.requirements.minReferences ? "warn" : "ok"
                    }
                  />
                  <Metric
                    label={t("template")}
                    value={
                      Object.values(check.template.sections).every(Boolean)
                        ? t("templateOk")
                        : t("templateMissing", {
                            count: Object.values(check.template.sections).filter((v) => !v).length,
                          })
                    }
                    tone={Object.values(check.template.sections).every(Boolean) ? "ok" : "warn"}
                  />
                </div>
                <p
                  className={cn(
                    "mt-4 flex flex-wrap items-center justify-between gap-3 rounded-control px-4 py-3 text-sm",
                    precheckIssues.length ? "bg-warning-bg text-ink" : "bg-success-bg text-success",
                  )}
                >
                  <span>
                    {precheckIssues.length
                      ? t("precheckWarn", { list: precheckIssues.join("; ") })
                      : t("precheckOk")}
                  </span>
                  {precheckIssues.length ? (
                    <Link
                      href="/xorazmiy-ai"
                      className="font-semibold text-blue-800 hover:underline"
                    >
                      {t("fixInAi")} →
                    </Link>
                  ) : null}
                </p>
              </>
            ) : null}
          </section>

          <section className={cn(CARD, "space-y-3")}>
            <label className="flex items-start gap-3 text-sm text-ink">
              <input
                type="checkbox"
                form="pay"
                name="consentOriginal"
                value="1"
                className="mt-0.5 size-[18px] accent-blue-800"
              />
              {t("consentOriginal")}
            </label>
            <label className="flex items-start gap-3 text-sm text-ink">
              <input
                type="checkbox"
                form="pay"
                name="consentOffer"
                value="1"
                className="mt-0.5 size-[18px] accent-blue-800"
              />
              <span>
                {t.rich("consentOffer", {
                  offer: (c) => (
                    <Link href="/oferta" target="_blank" className="text-blue-800 underline">
                      {c}
                    </Link>
                  ),
                  policy: (c) => (
                    <Link
                      href="/nashr-siyosati"
                      target="_blank"
                      className="text-blue-800 underline"
                    >
                      {c}
                    </Link>
                  ),
                })}
              </span>
            </label>
          </section>
        </div>

        <aside className="lg:sticky lg:top-4">
          <form id="pay" action={pay} className={CARD} aria-labelledby="s5">
            <h2 id="s5" className="font-sans text-lg font-semibold text-ink">
              {t("s5")}
            </h2>
            {pricing ? (
              <>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-2">{t("priceLine")}</dt>
                    <dd className="font-semibold text-ink">{fmt(pricing.base)} so‘m</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-2">{t("certificateLine")}</dt>
                    <dd className="font-semibold text-success">{t("included")}</dd>
                  </div>
                  {pricing.fastTrackPrice ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt>
                        <label className="flex items-center gap-2 text-text-2">
                          <input
                            type="checkbox"
                            name="fastTrack"
                            value="1"
                            checked={fastTrack}
                            onChange={(e) => {
                              setFastTrack(e.target.checked);
                              refreshPrice(e.target.checked, promo);
                            }}
                            className="size-4 accent-blue-800"
                          />
                          {t("fastTrack")}
                        </label>
                      </dt>
                      <dd className="text-ink">+{fmt(pricing.fastTrackPrice)}</dd>
                    </div>
                  ) : null}
                </dl>
                <label className="mt-4 block text-sm font-semibold text-ink">
                  {t("promo")}
                  <span className="mt-1.5 flex gap-2">
                    <input
                      name="promo"
                      value={promo}
                      onChange={(e) => setPromo(e.target.value.toUpperCase())}
                      className={cn(INPUT, "mt-0")}
                    />
                    <button
                      type="button"
                      onClick={() => refreshPrice(fastTrack, promo)}
                      className={buttonClass("secondary", "md", "shrink-0 text-ink")}
                    >
                      {t("apply")}
                    </button>
                  </span>
                </label>
                {promoError ? (
                  <p className="mt-1 text-sm text-danger">{t("submitErrors.promo")}</p>
                ) : null}
                {pricing.discount ? (
                  <p className="mt-1 text-sm text-success">
                    {t("promoApplied", { amount: fmt(pricing.discount) })}
                  </p>
                ) : null}
                <p className="mt-4 flex justify-between border-t border-border pt-3 text-base font-semibold text-ink">
                  <span>{t("total")}</span>
                  <span>{fmt(pricing.total)} so‘m</span>
                </p>

                <fieldset className="mt-4">
                  <legend className="text-sm font-semibold text-ink">{t("method")}</legend>
                  <div className="mt-2 space-y-2">
                    {!providers.length ? (
                      <p className="text-sm text-text-2">{t("qr.none")}</p>
                    ) : null}
                    {providers.map((m, i) => (
                      <label
                        key={m}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-border-strong px-3 text-sm font-semibold text-ink has-checked:border-blue-800 has-checked:ring-1 has-checked:ring-blue-800"
                      >
                        <input
                          type="radio"
                          name="provider"
                          value={m}
                          defaultChecked={i === 0}
                          className="accent-blue-800"
                        />
                        {t(`methods.${m}`)}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {issues.length ? (
                  <p
                    role="alert"
                    className="mt-4 rounded-control bg-danger-bg px-3 py-2 text-sm text-danger"
                  >
                    {t("fixBeforePay", {
                      list: issues.map((i) => t(`submitErrors.${i}`)).join(", "),
                    })}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={paying}
                  className={buttonClass("primary", "lg", "mt-4 w-full")}
                >
                  {t("pay", { amount: fmt(pricing.total) })}
                </button>
                <p className="mt-3 text-xs leading-relaxed text-text-2">{t("payNote")}</p>
                {sandbox ? (
                  <p className="mt-2 text-xs font-semibold text-warning">{t("sandboxNote")}</p>
                ) : null}
                {pricing.demo ? <p className="mt-1 text-xs text-muted">{t("demoPrice")}</p> : null}
              </>
            ) : (
              <p className="mt-4 text-sm text-text-2">{t("noPrice")}</p>
            )}
          </form>
          <p className="mt-3 text-center text-xs text-muted" aria-live="polite">
            {saveState === "saving" ? t("saving") : saveState === "saved" ? t("saved") : ""}
          </p>
        </aside>
      </div>
    </div>
  );
}

function move<T>(xs: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= xs.length) return xs;
  const copy = [...xs];
  [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  return copy;
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-control border border-border-strong text-text-2 hover:bg-blue-50 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function WordCount({ count, label }: { count: number; label: string }) {
  const ok = count >= 150 && count <= 250;
  return (
    <span
      className={cn(
        "mt-1 block text-right text-xs font-normal",
        count === 0 ? "text-muted" : ok ? "text-success" : "text-warning",
      )}
    >
      {label}
    </span>
  );
}

function Metric({
  label,
  value,
  note,
  tone,
  noteTone = "danger",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "ok" | "warn";
  noteTone?: "danger" | "muted";
}) {
  return (
    <div className="rounded-control border border-border p-3">
      <p className="text-xs text-text-2">{label}</p>
      <p
        className={cn(
          "mt-1 font-serif text-xl font-bold",
          tone === "warn" ? "text-warning" : tone === "ok" ? "text-success" : "text-ink",
        )}
      >
        {value}
        {note ? (
          <span
            className={cn(
              "ml-1 font-sans text-xs font-semibold",
              noteTone === "muted" ? "text-muted" : "text-danger",
            )}
          >
            {note}
          </span>
        ) : null}
      </p>
    </div>
  );
}

type T = ReturnType<typeof useTranslations<"submit">>;

/** Human-readable pre-check warnings (TZ 7.4: warnings only). */
function listPrecheckIssues(c: Precheck, t: T): string[] {
  const out: string[] = [];
  const r = c.requirements;
  if (c.template.words < r.minWords || c.template.words > r.maxWords) {
    out.push(t("issues.words", { words: c.template.words, min: r.minWords, max: r.maxWords }));
  }
  const missing = Object.entries(c.template.sections)
    .filter(([, ok]) => !ok)
    .map(([k]) => t(`sectionNames.${k}` as "sectionNames.introduction"));
  if (missing.length) out.push(t("issues.sections", { list: missing.join(", ") }));
  if (c.template.references < r.minReferences)
    out.push(t("issues.references", { count: c.template.references, min: r.minReferences }));
  const noYear = c.template.references - c.template.referencesWithYear;
  if (noYear > 0) out.push(t("issues.apa", { count: noYear }));
  if (r.minOriginality && c.originality.originality < r.minOriginality) {
    out.push(t("issues.originality", { value: c.originality.originality, min: r.minOriginality }));
  }
  return out;
}
