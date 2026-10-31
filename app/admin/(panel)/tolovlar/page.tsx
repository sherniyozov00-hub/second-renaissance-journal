import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { refundAction, savePromoAction, togglePromoAction } from "@/app/admin/actions";
import { Field, PageTitle, PaymentText, input, panel, td, th } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/styles";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/l10n";
import { paymentsMode } from "@/lib/payments/service";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  return { title: (await getTranslations("admin.payments"))("title") };
}

const RESULTS = new Set(["qaytarildi", "promokod", "xato-invalid", "xato-bad_status"]);

export default async function PaymentsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ natija?: string; holat?: string }>;
}) {
  await requireAdmin("/admin/tolovlar");
  const { natija, holat } = await searchParams;
  const [payments, promos] = await Promise.all([
    db.payment.findMany({
      where: holat ? { status: holat as "PAID" } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        article: { select: { number: true, titleUz: true } },
        user: { select: { name: true, phone: true } },
        promoCode: { select: { code: true } },
      },
    }),
    db.promoCode.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const [t, tc, locale] = await Promise.all([
    getTranslations("admin.payments"),
    getTranslations("admin.common"),
    getLocale() as Promise<AppLocale>,
  ]);
  return (
    <>
      <PageTitle title={t("title")}>
        <span className="rounded-full bg-warning-bg px-3 py-1 text-sm font-semibold text-warning">
          {t("mode", { mode: paymentsMode() })}
        </span>
      </PageTitle>
      {natija && RESULTS.has(natija) ? (
        <p
          className={cn(
            "mt-4 rounded-control px-4 py-3 text-sm font-semibold",
            natija.startsWith("xato") ? "bg-danger-bg text-danger" : "bg-success-bg text-success",
          )}
        >
          {t(`res_${natija}`)}
        </p>
      ) : null}
      <section className={cn(panel, "mt-5 overflow-x-auto")}>
        <table className="w-full min-w-[980px]">
          <thead className="border-b border-border bg-blue-50/40">
            <tr>
              {[
                t("colDate"),
                t("colUser"),
                t("colArticle"),
                t("colProvider"),
                t("colAmount"),
                t("colStatus"),
                t("colRefund"),
              ].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className={cn(td, "whitespace-nowrap")}>
                  {formatDate(p.paidAt ?? p.createdAt, locale)}
                </td>
                <td className={td}>{p.user.name ?? p.user.phone}</td>
                <td className={td}>
                  {p.article
                    ? `#${String(p.article.number).padStart(4, "0")}`
                    : p.purpose === "AI_PACKAGE"
                      ? t("aiPackage")
                      : "—"}
                </td>
                <td className={td}>
                  {p.provider}
                  {p.promoCode ? ` · ${p.promoCode.code}` : ""}
                </td>
                <td className={cn(td, "whitespace-nowrap")}>
                  {formatNumber(p.amount, locale)} {tc("som")}
                </td>
                <td className={td}>
                  <PaymentText status={p.status} />
                  {p.refundReason ? (
                    <span className="block text-xs text-muted">{p.refundReason}</span>
                  ) : null}
                </td>
                <td className={td}>
                  {p.status === "PAID" ? (
                    <form action={refundAction} className="flex gap-2">
                      <input type="hidden" name="paymentId" value={p.id} />
                      <input
                        name="reason"
                        required
                        minLength={5}
                        placeholder={t("reason")}
                        aria-label={t("refundReason")}
                        className={cn(input, "h-9 w-40 text-sm")}
                      />
                      <button className="text-sm font-semibold text-danger hover:underline">
                        {t("refund")}
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <h2 className="mt-10 font-sans text-xl font-bold">{t("promos")}</h2>
      <div className="mt-4 grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <section className={cn(panel, "overflow-x-auto")}>
          <table className="w-full">
            <thead className="border-b border-border bg-blue-50/40">
              <tr>
                {[t("colCode"), t("colDiscount"), t("colUsed"), t("colValid"), t("colStatus")].map(
                  (h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className={cn(td, "font-mono font-semibold")}>{p.code}</td>
                  <td className={td}>
                    {p.discountPercent
                      ? `${p.discountPercent}%`
                      : `${formatNumber(p.discountAmount ?? 0, locale)} ${tc("som")}`}
                  </td>
                  <td className={td}>
                    {p.used}
                    {p.usageLimit ? ` / ${p.usageLimit}` : ""}
                  </td>
                  <td className={td}>{formatDate(p.validUntil, locale)}</td>
                  <td className={td}>
                    <form action={togglePromoAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        className={cn(
                          "font-semibold hover:underline",
                          p.isActive ? "text-success" : "text-muted",
                        )}
                      >
                        {p.isActive ? t("active") : t("inactive")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <form action={savePromoAction} className={cn(panel, "space-y-3 p-5")}>
          <h3 className="font-sans font-semibold">{t("newPromo")}</h3>
          <Field label={t("colCode")}>
            <input name="code" required className={cn(input, "w-full uppercase")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("percent")}>
              <input
                name="percent"
                type="number"
                min={1}
                max={100}
                className={cn(input, "w-full")}
              />
            </Field>
            <Field label={t("orAmount")}>
              <input name="amount" type="number" min={1} className={cn(input, "w-full")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("limit")}>
              <input name="limit" type="number" min={1} className={cn(input, "w-full")} />
            </Field>
            <Field label={t("colValid")}>
              <input name="validUntil" type="date" className={cn(input, "w-full")} />
            </Field>
          </div>
          <button className={buttonClass("primary", "md", "w-full")}>{tc("save")}</button>
        </form>
      </div>
    </>
  );
}
