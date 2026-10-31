/**
 * Lesson video (TZ 15, optional): YouTube and Vimeo links become
 * privacy-friendly embed URLs; anything else is shown as a plain link.
 */
export function videoEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id =
      u.searchParams.get("v") ?? /^\/(?:embed|shorts|live)\/([^/]+)/.exec(u.pathname)?.[1] ?? null;
  }
  if (id && /^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const v = /\/(?:video\/)?(\d{5,12})(?:$|\/)/.exec(u.pathname)?.[1];
    if (v) return `https://player.vimeo.com/video/${v}?dnt=1`;
  }
  return null;
}
