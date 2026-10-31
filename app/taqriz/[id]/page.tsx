import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import type { AppLocale } from "@/i18n/routing";
import { aiFeatureList } from "@/lib/ai/labels";
import { notFound } from "next/navigation";
import { submitReviewAction } from "@/app/taqriz/actions";
import { Field, input, panel, select } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/styles";
import { requireReviewer } from "@/lib/admin/auth";
import { prepareArticleHtml } from "@/lib/article-html";
import { CRITERIA } from "@/lib/editorial/review";
import { getBlindReview } from "@/lib/editorial/review";
import { WorkflowError } from "@/lib/editorial/workflow";
import { articleAbstract, articleTitle, formatDate, pick } from "@/lib/l10n";
import { getStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ xato?: string }>;
}) {
  const { id } = await params;
  const user = await requireReviewer(`/taqriz/${id}`);
  const { xato } = await searchParams;
  let review;
  try {
    review = await getBlindReview(user, id);
  } catch (err) {
    if (err instanceof WorkflowError) notFound();
    throw err;
  }
  const a = review.article;
  const version = a.versions[0];
  const fileUrl = version?.docxUrl ? await getStorage().signedUrl(version.docxUrl, 600) : null;
  const originality = a.aiChecks.find((c) => c.type === "ORIGINALITY")?.result as
    { originality: number } | undefined;
  const { html } = prepareArticleHtml(version?.htmlBody ?? "");
  const done = Boolean(review.submittedAt);
  const [t, ta, locale] = await Promise.all([
    getTranslations("admin.review"),
    getTranslations("admin.article"),
    getLocale() as Promise<AppLocale>,
  ]);

  return (
    <>
      <Link href="/taqriz" className="text-sm text-blue-800 hover:underline">
        {t("back")}
      </Link>
      <p className="mt-3 text-sm text-text-2">
        #{String(a.number).padStart(4, "0")} · {pick(a.category.name, locale)} · {t("due")}{" "}
        {formatDate(review.dueAt, locale)}
      </p>
      <h1 className="mt-1 font-serif text-[28px] font-bold text-ink">{articleTitle(a, locale)}</h1>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_360px]">
        <article className={cn(panel, "p-6")}>
          <p className="font-serif leading-relaxed">{articleAbstract(a, locale)}</p>
          <p className="mt-3 text-sm text-text-2">{a.keywords.join(", ")}</p>
          <p className="mt-4 flex flex-wrap gap-4 text-sm">
            {fileUrl ? (
              <a href={fileUrl} className="font-semibold text-blue-800 hover:underline">
                {t("manuscript", { version: version!.version })}
              </a>
            ) : null}
            {originality ? (
              <span>
                {t("originality")}: <strong>{originality.originality}%</strong>
              </span>
            ) : null}
            {a.aiFeaturesUsed.length ? (
              <span>
                {t("aiUsed")}: {aiFeatureList(a.aiFeaturesUsed, locale)}
              </span>
            ) : null}
          </p>
          <div className="article-body mt-6" dangerouslySetInnerHTML={{ __html: html }} />
        </article>
        <form action={submitReviewAction} className={cn(panel, "space-y-4 p-5 lg:sticky lg:top-4")}>
          <h2 className="font-sans text-lg font-semibold">{t("review")}</h2>
          {xato ? (
            <p className="rounded-control bg-danger-bg px-3 py-2 text-sm text-danger">
              {t("error")}
            </p>
          ) : null}
          <input type="hidden" name="reviewId" value={review.id} />
          {CRITERIA.map((c) => (
            <Field key={c} label={`${t(`c_${c}`)} (1–5)`}>
              <select
                name={c}
                required
                disabled={done}
                defaultValue={review[c] ?? ""}
                className={cn(select, "w-full")}
              >
                <option value="" disabled>
                  —
                </option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          ))}
          <Field label={t("recommendation")}>
            <select
              name="recommendation"
              required
              disabled={done}
              defaultValue={review.recommendation ?? ""}
              className={cn(select, "w-full")}
            >
              <option value="" disabled>
                —
              </option>
              {(["ACCEPT", "MINOR_REVISION", "MAJOR_REVISION", "REJECT"] as const).map((r) => (
                <option key={r} value={r}>
                  {ta(`rec_${r}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("comment")}>
            <textarea
              name="comment"
              rows={8}
              required
              minLength={20}
              disabled={done}
              defaultValue={review.comment ?? ""}
              className={cn(input, "h-auto w-full py-2")}
            />
          </Field>
          {done ? (
            <p className="text-sm font-semibold text-success">
              {t("submittedOn", { date: formatDate(review.submittedAt, locale) })}
            </p>
          ) : (
            <button className={buttonClass("primary", "md", "w-full")}>{t("send")}</button>
          )}
        </form>
      </div>
    </>
  );
}
