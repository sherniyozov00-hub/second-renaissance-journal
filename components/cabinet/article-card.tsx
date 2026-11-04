import { getLocale, getTranslations } from "next-intl/server";
import type { ArticleStatus } from "@/generated/prisma/client";
import { buttonClass } from "@/components/ui/styles";
import { getPathname, Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { articleTitle, formatDate, formatNumber, pick } from "@/lib/l10n";
import type { MyArticle } from "@/lib/queries/cabinet";
import { cn } from "@/lib/utils";

const STEPS = ["submitted", "paid", "review", "accepted", "published"] as const;

/** Index of the step in progress (Ekran 7 progress line). */
export function currentStep(status: ArticleStatus): number {
  switch (status) {
    case "DRAFT":
      return 0;
    case "AWAITING_PAYMENT":
      return 1;
    case "UNDER_REVIEW":
    case "REVISION_REQUESTED":
    case "REJECTED":
      return 2;
    case "ACCEPTED":
      return 3;
    case "PUBLISHED":
      return STEPS.length;
  }
}

const BADGE: Record<ArticleStatus, string> = {
  DRAFT: "bg-border text-text-2",
  AWAITING_PAYMENT: "bg-warning-bg text-warning",
  UNDER_REVIEW: "bg-info-bg text-blue-800",
  REVISION_REQUESTED: "bg-warning-bg text-warning",
  ACCEPTED: "bg-info-bg text-blue-800",
  PUBLISHED: "bg-success-bg text-success",
  REJECTED: "bg-danger-bg text-danger",
};

export async function StatusBadge({ status }: { status: ArticleStatus }) {
  const t = await getTranslations("cabinet.status");
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-[13px] font-semibold whitespace-nowrap",
        BADGE[status],
      )}
    >
      {t(status)}
    </span>
  );
}

export async function ArticleStatusCard({ article }: { article: MyArticle }) {
  const t = await getTranslations("cabinet");
  const locale = (await getLocale()) as AppLocale;
  const step = currentStep(article.status);
  const number = `#${String(article.number).padStart(4, "0")}`;
  const published = article.status === "PUBLISHED";
  const revision = article.status === "REVISION_REQUESTED";
  const note = article.editorComments[0];
  const certificate = article.certificates[0];

  const eyebrow = (
    <p className="text-eyebrow font-semibold tracking-[0.06em] text-gold-text">
      <span className="uppercase">{pick(article.category.name, locale)}</span> ·{" "}
      {published && article.issue ? `${article.issue.year}, ${article.issue.number}-son` : number}
    </p>
  );

  if (published) {
    return (
      <article className="flex flex-col gap-4 rounded-card border border-border bg-white p-6 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          {eyebrow}
          <h2 className="mt-1.5 font-serif text-[22px] leading-snug font-bold text-ink">
            <Link href={`/maqola/${article.slug}`} className="hover:text-blue-800">
              {articleTitle(article, locale)}
            </Link>
          </h2>
          <p className="mt-1.5 text-sm text-text-2">
            {t("stats", {
              views: formatNumber(article.views, locale),
              downloads: formatNumber(article.downloads, locale),
            })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={article.status} />
          {certificate ? (
            <a
              href={getPathname({ href: `/sertifikat/${certificate.id}/pdf`, locale })}
              className={buttonClass("secondary", "md")}
            >
              {t("certificatePdf")}
            </a>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "rounded-card border bg-white p-6",
        revision
          ? "border-gold/50"
          : article.status === "REJECTED"
            ? "border-danger/30"
            : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow}
          <h2 className="mt-1.5 font-serif text-[22px] leading-snug font-bold text-ink">
            {articleTitle(article, locale)}
          </h2>
        </div>
        <StatusBadge status={article.status} />
      </div>

      {revision && note ? (
        <>
          <p className="mt-4 rounded-card bg-warning-bg/50 px-4 py-3 text-[15px] leading-relaxed text-ink">
            <strong className="font-semibold">{t("editorNote")}</strong> “{note.body}”
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/xorazmiy-ai" className={buttonClass("primary", "md")}>
              {t("fixWithAi")}
            </Link>
            <Link
              href={{ pathname: "/kabinet/yuborish", query: { maqola: article.id } }}
              className={buttonClass("secondary", "md", "text-ink")}
            >
              {t("uploadVersion")}
            </Link>
          </div>
        </>
      ) : (
        <>
          <ol className="mt-4 grid grid-cols-5 gap-1.5" aria-label={t(`status.${article.status}`)}>
            {STEPS.map((s, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <li key={s} aria-current={current ? "step" : undefined}>
                  <span
                    className={cn(
                      "block h-1 rounded-full",
                      done ? "bg-blue-800" : current ? "bg-gold" : "bg-border",
                    )}
                  />
                  <span
                    className={cn(
                      "mt-2 block text-[13px]",
                      current ? "font-semibold text-blue-800" : "text-text-2",
                    )}
                  >
                    {t(`steps.${s}`)}
                  </span>
                </li>
              );
            })}
          </ol>
          {article.status === "DRAFT" ? (
            <Link
              href={{ pathname: "/kabinet/yuborish", query: { maqola: article.id } }}
              className={buttonClass("primary", "md", "mt-4")}
            >
              {t("continueDraft")}
            </Link>
          ) : article.status === "AWAITING_PAYMENT" ? (
            <Link
              href={{ pathname: "/kabinet/yuborish", query: { maqola: article.id } }}
              className={buttonClass("primary", "md", "mt-4")}
            >
              {t("payNow")}
            </Link>
          ) : article.status === "UNDER_REVIEW" ? (
            <p className="mt-3 text-sm text-text-2">
              {article.reviews[0]?.dueAt
                ? t("expected", { date: formatDate(article.reviews[0].dueAt, locale) })
                : t("underReviewNext")}
            </p>
          ) : article.status === "ACCEPTED" ? (
            <p className="mt-3 text-sm text-text-2">{t("acceptedNext")}</p>
          ) : null}
        </>
      )}
    </article>
  );
}
