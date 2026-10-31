import { type NextRequest } from "next/server";
import { getStorage, verifyLocalSignature } from "@/lib/storage";

/** Serves files of the local storage driver through signed, expiring URLs. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  const exp = Number(req.nextUrl.searchParams.get("exp"));
  const sig = req.nextUrl.searchParams.get("sig") ?? "";
  if (!verifyLocalSignature(key, exp, sig)) return new Response("Forbidden", { status: 403 });
  try {
    const body = await getStorage().get(key);
    const name = key.split("/").at(-1) ?? "file";
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": name.endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
