import { templateDocx } from "@/lib/academy/template";
import { getSettings } from "@/lib/settings/get";

/** Article template download (TZ 15, 16): /shablon/maqola-shabloni.docx. */
export async function GET(req: Request) {
  // ?til=ru | en — the template in Russian or English (default Uzbek).
  const til = new URL(req.url).searchParams.get("til");
  const lang = til === "ru" || til === "en" ? til : "uz";
  const s = await getSettings();
  const num = (v: unknown, d: number) => Number(v) || d;
  const buffer = await templateDocx(
    {
      minWords: num(s["requirements.minWords"], 3000),
      maxWords: num(s["requirements.maxWords"], 8000),
      minReferences: num(s["requirements.minReferences"], 10),
    },
    lang,
  );
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${{ uz: "maqola-shabloni", ru: "shablon-stati", en: "article-template" }[lang]}.docx"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
