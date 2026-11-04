import { currentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getStorage } from "@/lib/storage";

/**
 * Profile photo. A public profile's photo is public (cached, the URL carries
 * a version); a hidden profile's photo is shown only to its owner.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await db.authorProfile.findUnique({
    where: { id },
    select: { avatarUrl: true, isPublic: true, userId: true },
  });
  if (!profile?.avatarUrl) return new Response("Not found", { status: 404 });
  if (!profile.isPublic) {
    const user = await currentUser();
    if (!user || user.id !== profile.userId) return new Response("Not found", { status: 404 });
  }
  try {
    const body = await getStorage().get(`avatars/${id}.jpg`);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": "image/jpeg",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": profile.isPublic
          ? "public, max-age=31536000, immutable"
          : "private, no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
