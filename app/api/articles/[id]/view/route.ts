import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Increments the view counter of a published article (called once per session). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await db.article.updateMany({
    where: { id, status: "PUBLISHED" },
    data: { views: { increment: 1 } },
  });
  return NextResponse.json({ ok: result.count === 1 }, { status: result.count === 1 ? 200 : 404 });
}
