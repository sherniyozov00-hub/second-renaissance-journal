import { NextResponse, type NextRequest } from "next/server";
import { handlePayme } from "@/lib/payments/payme";

/** Payme Merchant API endpoint (JSON-RPC). Payme always expects HTTP 200. */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error" },
    });
  }
  return NextResponse.json(await handlePayme(body, req.headers.get("authorization")));
}
