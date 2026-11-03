import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RevisionUpload } from "@/components/submit/revision-upload";
import { SubmissionForm, type SubmissionInitial } from "@/components/submit/submission-form";
import type { AppLocale } from "@/i18n/routing";
import { requireCabinetUser } from "@/lib/auth/session";
import { pick } from "@/lib/l10n";
import { availableProviders } from "@/lib/payments/providers";
import { paymentsMode } from "@/lib/payments/service";
import { getCategories } from "@/lib/queries/catalog";
import { getPricing, loadSubmission } from "@/lib/submission/service";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ maqola?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "submit" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Submission form (Ekran 6). Also used to upload a revision (TZ 7). */
export default async function SubmitPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireCabinetUser(locale, "/kabinet/yuborish");
  const { maqola } = await searchParams;
  const t = await getTranslations("submit");
  const [article, categories, { pricing }] = await Promise.all([
    loadSubmission(user, maqola ?? null),
    getCategories(),
    getPricing({ fastTrack: false, promoCode: null }),
  ]);

  if (article?.status === "REVISION_REQUESTED") {
    return (
      <>
        <h1 className="text-[28px] leading-tight md:text-section">{t("revisionTitle")}</h1>
        <p className="mt-2 text-text-2">{t("revisionLead")}</p>
        <p className="mt-4 font-serif text-xl font-bold text-ink">{article.titleUz}</p>
        <RevisionUpload articleId={article.id} />
      </>
    );
  }

  const authors = article?.authors.length
    ? await Promise.all(
        article.authors.map(async (a) => {
          if (!a.authorProfileId)
            return { name: a.name ?? "", affiliation: a.affiliation ?? "", orcid: a.orcid ?? "" };
          const p = user.profile;
          return {
            name: p?.fullName ?? "",
            affiliation: p?.affiliation ?? "",
            orcid: p?.orcid ?? "",
          };
        }),
      )
    : user.profile
      ? [
          {
            name: user.profile.fullName,
            affiliation: user.profile.affiliation ?? "",
            orcid: user.profile.orcid ?? "",
          },
        ]
      : [{ name: user.name ?? "", affiliation: "", orcid: "" }];

  const initial: SubmissionInitial = {
    articleId: article?.id ?? null,
    titleUz: article?.titleUz ?? "",
    titleEn: article?.titleEn ?? "",
    titleRu: article?.titleRu ?? "",
    categoryId: article?.categoryId ?? categories[0]?.id ?? "",
    type: article?.type ?? "RESEARCH",
    language: article?.language ?? "uz",
    abstractUz: article?.abstractUz ?? "",
    abstractEn: article?.abstractEn ?? "",
    keywords: article?.keywords.join(", ") ?? "",
    authors: authors.map((a) => ({ ...a, orcid: /^\d{4}-/.test(a.orcid) ? a.orcid : "" })),
    corresponding: Math.max(0, article?.authors.findIndex((a) => a.isCorresponding) ?? 0),
    file: article?.versions[0]?.docxUrl
      ? { name: article.versions[0].note?.split(" · ")[0] ?? "maqola.docx" }
      : null,
  };

  return (
    <>
      <h1 className="text-[28px] leading-tight md:text-section">{t("title")}</h1>
      <p className="mt-2 text-text-2">{t("lead")}</p>
      <div className="mt-5">
        <SubmissionForm
          initial={initial}
          categories={categories.map((c) => ({
            id: c.id,
            name: pick(c.name, locale as AppLocale),
          }))}
          pricing={pricing}
          sandbox={paymentsMode() === "sandbox"}
          providers={await availableProviders()}
        />
      </div>
    </>
  );
}
