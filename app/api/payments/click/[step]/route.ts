import { NextResponse, type NextRequest } from "next/server";
import { handleClick, type ClickParams } from "@/lib/payments/click";

/** Click SHOP API: /api/payments/click/prepare and /api/payments/click/complete. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (step !== "prepare" && step !== "complete")
    return new NextResponse("Not found", { status: 404 });
  const form = await req.formData();
  const p: ClickParams = {};
  for (const [k, v] of form.entries()) p[k] = String(v);
  return NextResponse.json(await handleClick(p, step));
}
