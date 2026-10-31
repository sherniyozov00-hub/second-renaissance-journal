import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CertificateCard, TelegramCard } from "@/components/cabinet/cards";
import { requireCabinetUser } from "@/lib/auth/session";
import { getMyCertificates } from "@/lib/queries/cabinet";
import { getSetting } from "@/lib/settings/get";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cabinet" });
  return { title: t("certificates"), robots: { index: false, follow: false } };
}

export default async function CertificatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireCabinetUser(locale, "/kabinet/sertifikatlar");
  const t = await getTranslations("cabinet");
  const [certificates, bot] = await Promise.all([
    getMyCertificates(user),
    getSetting("telegram.botName"),
  ]);

  return (
    <>
      <h1 className="text-[28px] leading-tight md:text-section">{t("certificates")}</h1>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {certificates.length ? (
          certificates.map((c) => <CertificateCard key={c.id} cert={c} />)
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
