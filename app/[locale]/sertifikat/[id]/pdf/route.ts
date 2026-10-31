import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStorage } from "@/lib/storage";

/** Certificate PDF (TZ 14); falls back to the printable page until generated. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ locale: string; id: string }> },
) {
  const { id } = await params;
  const cert = await db.certificate.findUnique({
    where: { id: id.toUpperCase() },
    include: { article: true },
  });
  if (!cert || cert.article.status !== "PUBLISHED")
    return new NextResponse("Not found", { status: 404 });
  if (!cert.pdfUrl)
    return NextResponse.redirect(new URL(req.nextUrl.pathname.replace(/\/pdf$/, ""), req.url));
  const body = await getStorage().get(cert.pdfUrl);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="sertifikat-${cert.id}.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
