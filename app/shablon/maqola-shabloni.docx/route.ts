import { templateDocx } from "@/lib/academy/template";
import { getSettings } from "@/lib/settings/get";

/** Article template download (TZ 15, 16): /shablon/maqola-shabloni.docx. */
export async function GET() {
  const s = await getSettings();
  const num = (v: unknown, d: number) => Number(v) || d;
  const buffer = await templateDocx({
    minWords: num(s["requirements.minWords"], 3000),
    maxWords: num(s["requirements.maxWords"], 8000),
    minReferences: num(s["requirements.minReferences"], 10),
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="maqola-shabloni.docx"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
