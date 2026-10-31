import { NextResponse, type NextRequest } from "next/server";
import { STATUS_LABEL } from "@/components/admin/ui";
import { listAdminArticles, parseAdminFilters, toCsv } from "@/lib/admin/articles";
import { currentUser } from "@/lib/auth/session";
import { pick } from "@/lib/l10n";

/** "Eksport (Excel)": the filtered article table as CSV (opens in Excel). */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user || !user.roles.some((r) => r === "EDITOR" || r === "ADMIN")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const f = parseAdminFilters(Object.fromEntries(req.nextUrl.searchParams));
  const { items } = await listAdminArticles({ ...f, page: 1 }, 10_000);
  const csv = toCsv([
    ["ID", "Sarlavha", "Muallif", "Yo‘nalish", "Son", "To‘lov", "Summa", "Holat", "Yuborilgan"],
    ...items.map((a) => [
      a.number,
      a.titleUz,
      a.authors[0]?.authorProfile?.fullName ?? a.authors[0]?.name ?? "",
      pick(a.category.name, "uz"),
      a.issue ? `${a.issue.year}-${a.issue.number}` : "",
      a.payments[0]?.status ?? "",
      a.payments[0]?.amount ?? "",
      STATUS_LABEL[a.status],
      a.submittedAt?.toISOString().slice(0, 10) ?? "",
    ]),
  ]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="maqolalar-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
