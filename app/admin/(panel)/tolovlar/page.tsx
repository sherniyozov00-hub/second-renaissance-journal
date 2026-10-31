import { refundAction, savePromoAction, togglePromoAction } from "@/app/admin/actions";
import { Field, PageTitle, PaymentText, input, panel, td, th } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/styles";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/l10n";
import { paymentsMode } from "@/lib/payments/service";
import { cn } from "@/lib/utils";

export const metadata = { title: "To‘lovlar" };

const RESULT: Record<string, string> = {
  qaytarildi: "To‘lov qaytarildi va AuditLog’ga yozildi.",
  promokod: "Promokod saqlandi.",
  "xato-invalid": "Ma’lumot noto‘g‘ri (sabab kamida 5 belgi; promokod foiz yoki summa bilan).",
  "xato-bad_status": "Faqat to‘langan to‘lovni qaytarish mumkin.",
};

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
  return (
    <>
      <PageTitle title="To‘lovlar">
        <span className="rounded-full bg-warning-bg px-3 py-1 text-sm font-semibold text-warning">
          Rejim: {paymentsMode()}
        </span>
      </PageTitle>
      {natija && RESULT[natija] ? (
        <p
          className={cn(
            "mt-4 rounded-control px-4 py-3 text-sm font-semibold",
            natija.startsWith("xato") ? "bg-danger-bg text-danger" : "bg-success-bg text-success",
          )}
        >
          {RESULT[natija]}
        </p>
      ) : null}
      <section className={cn(panel, "mt-5 overflow-x-auto")}>
        <table className="w-full min-w-[980px]">
          <thead className="border-b border-border bg-blue-50/40">
            <tr>
              {["Sana", "Foydalanuvchi", "Maqola", "Provayder", "Summa", "Holat", "Qaytarish"].map(
                (h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className={cn(td, "whitespace-nowrap")}>
                  {formatDate(p.paidAt ?? p.createdAt, "uz")}
                </td>
                <td className={td}>{p.user.name ?? p.user.phone}</td>
                <td className={td}>
                  {p.article ? `#${String(p.article.number).padStart(4, "0")}` : "—"}
                </td>
                <td className={td}>
                  {p.provider}
                  {p.promoCode ? ` · ${p.promoCode.code}` : ""}
                </td>
                <td className={cn(td, "whitespace-nowrap")}>{formatNumber(p.amount, "uz")} so‘m</td>
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
                        placeholder="Sabab"
                        aria-label="Qaytarish sababi"
                        className={cn(input, "h-9 w-40 text-sm")}
                      />
                      <button className="text-sm font-semibold text-danger hover:underline">
                        Qaytarish
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <h2 className="mt-10 font-sans text-xl font-bold">Promokodlar</h2>
      <div className="mt-4 grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <section className={cn(panel, "overflow-x-auto")}>
          <table className="w-full">
            <thead className="border-b border-border bg-blue-50/40">
              <tr>
                {["Kod", "Chegirma", "Ishlatilgan", "Muddat", "Holat"].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className={cn(td, "font-mono font-semibold")}>{p.code}</td>
                  <td className={td}>
                    {p.discountPercent
                      ? `${p.discountPercent}%`
                      : `${formatNumber(p.discountAmount ?? 0, "uz")} so‘m`}
                  </td>
                  <td className={td}>
                    {p.used}
                    {p.usageLimit ? ` / ${p.usageLimit}` : ""}
                  </td>
                  <td className={td}>{formatDate(p.validUntil, "uz")}</td>
                  <td className={td}>
                    <form action={togglePromoAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        className={cn(
                          "font-semibold hover:underline",
                          p.isActive ? "text-success" : "text-muted",
                        )}
                      >
                        {p.isActive ? "faol" : "o‘chirilgan"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <form action={savePromoAction} className={cn(panel, "space-y-3 p-5")}>
          <h3 className="font-sans font-semibold">Yangi promokod</h3>
          <Field label="Kod">
            <input name="code" required className={cn(input, "w-full uppercase")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Foiz">
              <input
                name="percent"
                type="number"
                min={1}
                max={100}
                className={cn(input, "w-full")}
              />
            </Field>
            <Field label="yoki summa">
              <input name="amount" type="number" min={1} className={cn(input, "w-full")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Limit">
              <input name="limit" type="number" min={1} className={cn(input, "w-full")} />
            </Field>
            <Field label="Muddat">
              <input name="validUntil" type="date" className={cn(input, "w-full")} />
            </Field>
          </div>
          <button className={buttonClass("primary", "md", "w-full")}>Saqlash</button>
        </form>
      </div>
    </>
  );
}
