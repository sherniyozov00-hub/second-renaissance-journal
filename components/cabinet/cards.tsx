import { getLocale, getTranslations } from "next-intl/server";
import { connectTelegramAction } from "@/app/[locale]/kabinet/actions";
import { LogoMark } from "@/components/brand/logo";
import { buttonClass, cardClass } from "@/components/ui/styles";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { qrSvg } from "@/lib/qr";
import { absoluteUrl } from "@/lib/seo";
import { isPlaceholder } from "@/lib/settings/registry";
import { cn } from "@/lib/utils";

type Cert = {
  id: string;
  authorName: string;
  article: { issue: { year: number; number: number } | null };
};

/** "Nashr sertifikati" card with the verification QR code (Ekran 7). */
export async function CertificateCard({ cert }: { cert: Cert }) {
  const t = await getTranslations("cabinet");
  const locale = (await getLocale()) as AppLocale;
  const url = absoluteUrl(`/sertifikat/${cert.id}`, locale);
  const svg = await qrSvg(url);
  const issue = cert.article.issue
    ? `${cert.article.issue.year}, ${cert.article.issue.number}-son`
    : "";

  return (
    <article className="overflow-hidden rounded-card border border-border bg-white">
      <div className="flex flex-col items-center bg-gold/10 px-6 py-7 text-center">
        <LogoMark variant="footer" className="size-7" />
        <h3 className="mt-3 font-serif text-lg font-semibold text-ink">{t("certTitle")}</h3>
        <p className="mt-1 text-sm text-text-2">
          {cert.authorName}
          {issue ? ` · ${issue}` : ""}
        </p>
        <span
          className="mt-3 block size-16 border border-gold/40 bg-white p-1.5"
          role="img"
          aria-label={url}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      <div className="flex items-center justify-between bg-white px-4 py-3 text-sm">
        <span className="text-text-2">{t("certId", { id: cert.id })}</span>
        {/* Plain link: the PDF is a file, not a page. */}
        <a
          href={getPathname({ href: `/sertifikat/${cert.id}/pdf`, locale })}
          className="font-semibold text-blue-800 hover:underline"
        >
          {t("download")}
        </a>
      </div>
    </article>
  );
}

export async function TelegramCard({
  botName,
  connected,
}: {
  botName: string;
  connected: boolean;
}) {
  const t = await getTranslations("cabinet");
  const unavailable = isPlaceholder(botName) || !botName;
  return (
    <article className={cn(cardClass, "flex flex-col justify-center p-6")}>
      <h3 className="font-sans text-lg font-semibold text-ink">{t("telegramTitle")}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-text-2">{t("telegramText")}</p>
      {connected ? (
        <p className="mt-4 text-sm font-semibold text-success">{t("telegramConnected")}</p>
      ) : (
        <form action={connectTelegramAction} className="mt-4">
          <button
            type="submit"
            disabled={unavailable}
            title={unavailable ? botName : undefined}
            className={buttonClass(
              "outline",
              "md",
              "disabled:cursor-not-allowed disabled:opacity-70",
            )}
          >
            {t("telegramConnect", { bot: botName.replace(/^@/, "") })}
          </button>
        </form>
      )}
    </article>
  );
}
