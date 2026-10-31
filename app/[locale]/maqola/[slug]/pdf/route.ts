import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStorage } from "@/lib/storage";

/**
 * Article PDF (TZ 9.5): an open, text-based file at a stable URL. Until the
 * worker has generated it, the print view is shown instead.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ locale: string; slug: string }> },
) {
  const { slug } = await params;
  const article = await db.article.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      id: true,
      versions: { orderBy: { version: "desc" }, take: 1, select: { pdfUrl: true } },
    },
  });
  if (!article) return new NextResponse("Not found", { status: 404 });
  const key = article.versions[0]?.pdfUrl;
  if (!key)
    return NextResponse.redirect(new URL(req.nextUrl.pathname.replace(/\/pdf$/, "/chop"), req.url));

  const body = await getStorage().get(key);
  await db.article.update({ where: { id: article.id }, data: { downloads: { increment: 1 } } });
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slug}.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
