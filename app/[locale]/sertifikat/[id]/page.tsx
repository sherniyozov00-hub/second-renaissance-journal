import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { PrintButton } from "@/components/article/print-button";
import { PageShell } from "@/components/layout/page-shell";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { articleTitle, formatDate } from "@/lib/l10n";
import { qrSvg } from "@/lib/qr";
import { absoluteUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

type Props = { params: Promise<{ locale: string; id: string }> };

function findCertificate(id: string) {
  return db.certificate.findUnique({
    where: { id: id.toUpperCase() },
    include: { article: { include: { issue: true } } },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "certificate" });
  return { title: t("title", { id: id.toUpperCase() }), robots: { index: false, follow: false } };
}

/** Public verification page behind the certificate QR code (TZ 14). */
export default async function CertificatePage({ params }: Props) {
  const { locale: raw, id } = await params;
  setRequestLocale(raw);
  const locale = raw as AppLocale;
  const cert = await findCertificate(id);
  if (!cert || cert.article.status !== "PUBLISHED") notFound();
  const t = await getTranslations("certificate");
  const url = absoluteUrl(`/sertifikat/${cert.id}`, locale);
  const svg = await qrSvg(url);
  const issue = cert.article.issue;

  return (
    <PageShell>
      <div className="bg-blue-50 print:bg-white">
        <div className="container-site py-10 md:py-14">
          <p className="mx-auto flex max-w-[760px] items-center gap-2 rounded-card bg-success-bg px-4 py-3 text-sm font-semibold text-success print:hidden">
            <CheckCircle2 className="size-5" aria-hidden /> {t("valid")}
          </p>
          <article className="mx-auto mt-6 max-w-[760px] rounded-card border-2 border-gold/50 bg-white p-8 text-center md:p-12">
            <LogoMark variant="footer" className="mx-auto size-12" />
            <p className="eyebrow mt-4">{siteConfig.name}</p>
            <h1 className="mt-3 text-[30px] md:text-[40px]">{t("heading")}</h1>
            <p className="mt-6 text-text-2">{t("certifies")}</p>
            <p className="mt-2 font-serif text-2xl font-bold text-ink">{cert.authorName}</p>
            <p className="mt-4 text-text-2">{t("published")}</p>
            <p className="mx-auto mt-2 max-w-[560px] font-serif text-xl leading-snug text-ink">
              <Link href={`/maqola/${cert.article.slug}`} className="hover:text-blue-800">
                «{articleTitle(cert.article, locale)}»
              </Link>
            </p>
            <p className="mt-4 text-sm text-text-2">
              {issue ? t("issue", { year: issue.year, number: issue.number }) : null}
              {issue ? " · " : null}
              {formatDate(cert.article.publishedAt ?? cert.issuedAt, locale)}
            </p>
            <div className="mt-8 flex items-end justify-between gap-6 text-left">
              <div className="text-sm text-text-2">
                <p>{t("id", { id: cert.id })}</p>
                <p className="mt-1 break-all">{url}</p>
              </div>
              <span
                className="block size-24 shrink-0"
                role="img"
                aria-label={url}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
          </article>
          <div className="mx-auto mt-6 flex max-w-[760px] justify-end print:hidden">
            <PrintButton />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
