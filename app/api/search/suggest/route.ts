import { NextResponse, type NextRequest } from "next/server";
import { suggest } from "@/lib/search/query";

/** Autocomplete for the search box (TZ 8). */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  const items = await suggest(q);
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
