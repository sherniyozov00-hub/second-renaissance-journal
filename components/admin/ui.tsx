import type { ArticleStatus, PaymentStatus } from "@/generated/prisma/client";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

/** Article statuses in the order the panels list them; labels: admin.common.status_*. */
export const STATUSES: ArticleStatus[] = [
  "DRAFT",
  "AWAITING_PAYMENT",
  "UNDER_REVIEW",
  "REVISION_REQUESTED",
  "ACCEPTED",
  "PUBLISHED",
  "REJECTED",
];

const STATUS_CLASS: Record<ArticleStatus, string> = {
  DRAFT: "bg-border text-text-2",
  AWAITING_PAYMENT: "bg-border/70 text-ink",
  UNDER_REVIEW: "bg-info-bg text-blue-800",
  REVISION_REQUESTED: "bg-warning-bg text-warning",
  ACCEPTED: "bg-info-bg text-blue-900",
  PUBLISHED: "bg-success-bg text-success",
  REJECTED: "bg-danger-bg text-danger",
};

const PAYMENT_CLASS: Record<PaymentStatus, string> = {
  PENDING: "text-warning",
  PAID: "text-success",
  CANCELLED: "text-muted",
  REFUNDED: "text-success",
};

export async function StatusBadge({ status }: { status: ArticleStatus }) {
  const t = await getTranslations("admin.common");
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-[13px] font-semibold",
        STATUS_CLASS[status],
      )}
    >
      {t(`status_${status}`)}
    </span>
  );
}

export async function PaymentText({ status }: { status: PaymentStatus | null }) {
  if (!status) return <span className="text-muted">—</span>;
  const t = await getTranslations("admin.common");
  return <span className={cn("font-semibold", PAYMENT_CLASS[status])}>{t(`payment_${status}`)}</span>;
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-sans text-[28px] font-bold text-ink">{title}</h1>
      {children ? <div className="flex flex-wrap gap-3">{children}</div> : null}
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-card border border-border bg-white px-5 py-4">
      <p className="text-[13px] text-text-2">{label}</p>
      <p className="mt-1 font-sans text-[26px] font-bold text-ink">{value}</p>
    </div>
  );
}

export const panel = "rounded-card border border-border bg-white";
export const input =
  "h-11 rounded-control border border-border-strong bg-white px-3 text-[15px] text-ink outline-none focus:border-blue-800";
export const select = cn(input, "bg-blue-50/60");
export const th = "px-4 py-3 text-left text-sm font-semibold text-ink";
export const td = "px-4 py-3 align-middle text-sm";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <span className="mt-1.5 block font-normal">{children}</span>
      {hint ? <span className="mt-1 block text-xs font-normal text-muted">{hint}</span> : null}
    </label>
  );
}
