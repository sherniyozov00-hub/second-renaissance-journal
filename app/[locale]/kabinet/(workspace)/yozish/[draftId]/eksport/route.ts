import { exportDraft } from "@/lib/ai/drafts";
import { currentUser } from "@/lib/auth/session";
import { slugify } from "@/lib/text/uz";

/** "Yuklab olish" in the workspace (Ekran 3): the draft as .docx. */
export async function GET(_req: Request, { params }: { params: Promise<{ draftId: string }> }) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { draftId } = await params;
  const file = await exportDraft(user.id, draftId);
  if (!file) return new Response("Not found", { status: 404 });
  const name = `${slugify(file.title, 60) || "maqola"}.docx`;
  return new Response(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
