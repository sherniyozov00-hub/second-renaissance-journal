import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { requireCabinetUser } from "@/lib/auth/session";
import { formatDate, formatNumber } from "@/lib/l10n";
import { getMyPayments } from "@/lib/queries/cabinet";
import { cn } from "@/lib/utils";

const PROVIDER = {
  CLICK: "Click",
  PAYME: "Payme",
  UZUM: "Uzum Bank",
  CARD: "Uzcard / Humo / Visa",
} as const;
const STATUS_CLASS = {
  PENDING: "bg-warning-bg text-warning",
  PAID: "bg-success-bg text-success",
  CANCELLED: "bg-border text-text-2",
  REFUNDED: "bg-info-bg text-blue-800",
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cabinet" });
  return { title: t("payments"), robots: { index: false, follow: false } };
}

export default async function PaymentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale as AppLocale;
  const user = await requireCabinetUser(locale, "/kabinet/tolovlar");
  const t = await getTranslations();
  const payments = await getMyPayments(user.id);

  return (
    <>
      <h1 className="text-[28px] leading-tight md:text-section">{t("cabinet.payments")}</h1>
      {payments.length ? (
        <div className="mt-5 overflow-x-auto rounded-card border border-border bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-text-2">
              <tr>
                {["date", "article", "method", "amount", "statusCol", "receipt"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 font-semibold">
                    {t(`cabinet.${h}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-text-2">
                    {formatDate(p.paidAt ?? p.createdAt, l)}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {p.article
                      ? `#${String(p.article.number).padStart(4, "0")} ${p.article.titleUz}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{PROVIDER[p.provider]}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatNumber(p.amount, l)} {t("common.som")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        STATUS_CLASS[p.status],
                      )}
                    >
                      {t(`cabinet.paymentStatus.${p.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.fiscalReceiptUrl ? (
                      <a
                        href={p.fiscalReceiptUrl}
                        className="text-blue-800 hover:underline"
                        rel="noopener"
                        target="_blank"
                      >
                        {t("cabinet.receipt")}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-5 rounded-card border border-border bg-white p-6 text-text-2">
          {t("cabinet.paymentsEmpty")}
        </p>
      )}
      <p className="mt-4 text-sm text-muted">
        <Link href="/narxlar" className="text-blue-800 hover:underline">
          {t("footer.prices")}
        </Link>
      </p>
    </>
  );
}
