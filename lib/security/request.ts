/**
 * Request helpers for route handlers (TZ 17 security). Server actions already
 * check the Origin header themselves; JSON route handlers use these.
 */

/** Client IP behind the reverse proxy (deploy guide: Caddy/nginx set X-Forwarded-For). */
export function clientIp(headers: Headers): string {
  return (
    (headers.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || headers.get("x-real-ip") || "0"
  );
}

/**
 * CSRF guard for cookie-authenticated POST endpoints: the body must be JSON
 * (a cross-site form cannot send that without a CORS preflight) and, when the
 * browser sends an Origin, it must be this site.
 */
export function isSameOriginJson(req: Request): boolean {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json"))
    return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const buckets = new Map<string, number[]>();

/** Fixed-window-free sliding limiter in memory (one app instance; see docs/deploy.md). */
export function tooMany(key: string, perMinute: number, now = Date.now()): boolean {
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < 60_000);
  const over = recent.length >= perMinute;
  if (!over) recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 20_000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < 60_000)) buckets.delete(k);
  }
  return over;
}
