import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArticleStatusCard } from "@/components/cabinet/article-card";
import { CertificateCard, TelegramCard } from "@/components/cabinet/cards";
import { buttonClass } from "@/components/ui/styles";
import { Link } from "@/i18n/navigation";
import { requireCabinetUser } from "@/lib/auth/session";
import { getMyArticles, getMyCertificates } from "@/lib/queries/cabinet";
import { getSetting } from "@/lib/settings/get";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cabinet" });
  return { title: t("myArticles"), robots: { index: false, follow: false } };
}

export default async function CabinetPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireCabinetUser(locale, "/kabinet");
  const t = await getTranslations("cabinet");
  const [articles, certificates, bot] = await Promise.all([
    getMyArticles(user),
    getMyCertificates(user),
    getSetting("telegram.botName"),
  ]);

  return (
    <>
      <h1 className="text-[28px] leading-tight md:text-section">{t("myArticles")}</h1>
      {articles.length ? (
        <div className="mt-5 space-y-4">
          {articles.map((a) => (
            <ArticleStatusCard key={a.id} article={a} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-card border border-border bg-white p-6">
          <p className="text-text-2">{t("noArticles")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/kabinet/yuborish" className={buttonClass("primary", "md")}>
              {t("newArticle")}
            </Link>
            <Link href="/akademiya" className={buttonClass("secondary", "md")}>
              {t("lessons")}
            </Link>
          </div>
        </div>
      )}

      <h2 className="mt-12 text-2xl md:text-[28px]">{t("certificates")}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {certificates[0] ? (
          <CertificateCard cert={certificates[0]} />
        ) : (
          <p className="rounded-card border border-border bg-white p-6 text-text-2">
            {t("noCertificates")}
          </p>
        )}
        <TelegramCard botName={String(bot)} connected={Boolean(user.telegramChatId)} />
      </div>
    </>
  );
}
