import { NextResponse, type NextRequest } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { listAdminArticles, parseAdminFilters, toCsv } from "@/lib/admin/articles";
import { currentUser } from "@/lib/auth/session";
import { articleTitle, pick } from "@/lib/l10n";

/** "Eksport (Excel)": the filtered article table as CSV (opens in Excel). */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user || !user.roles.some((r) => r === "EDITOR" || r === "ADMIN")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const f = parseAdminFilters(Object.fromEntries(req.nextUrl.searchParams));
  const { items } = await listAdminArticles({ ...f, page: 1 }, 10_000);
  const [t, tc, te, locale] = await Promise.all([
    getTranslations("admin.articles"),
    getTranslations("admin.common"),
    getTranslations("admin.export"),
    getLocale() as Promise<AppLocale>,
  ]);
  const csv = toCsv([
    [
      "ID",
      t("colTitle"),
      t("colAuthor"),
      t("category"),
      t("issue"),
      t("colPayment"),
      te("amount"),
      t("status"),
      te("submitted"),
    ],
    ...items.map((a) => [
      a.number,
      articleTitle(a, locale),
      a.authors[0]?.authorProfile?.fullName ?? a.authors[0]?.name ?? "",
      pick(a.category.name, locale),
      a.issue ? `${a.issue.year}-${a.issue.number}` : "",
      a.payments[0] ? tc(`payment_${a.payments[0].status}`) : "",
      a.payments[0]?.amount ?? "",
      tc(`status_${a.status}`),
      a.submittedAt?.toISOString().slice(0, 10) ?? "",
    ]),
  ]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${te("file")}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
