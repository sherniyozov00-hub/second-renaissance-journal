import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getOwnDraft } from "@/lib/ai/drafts";
import { runFactCheck, type FactCheckContext } from "@/lib/ai/factcheck";
import { markFeature } from "@/lib/ai/features";
import { aiLimits, type AiActor, consumeCheck } from "@/lib/ai/quota";
import type { AiErrorCode, FactEvent } from "@/lib/ai/schemas";
import { guestKey } from "@/lib/ai/text";
import { currentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { extractDocx } from "@/lib/submission/docx";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEVICE_COOKIE = "srj_device";

function fail(code: AiErrorCode, status: number) {
  return new Response(`${JSON.stringify({ type: "error", code } satisfies FactEvent)}\n`, {
    status,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}

async function articleText(articleId: string) {
  const version = await db.articleVersion.findFirst({
    where: { articleId },
    orderBy: { version: "desc" },
  });
  if (!version?.docxUrl) return "";
  const { text } = await extractDocx(await getStorage().get(version.docxUrl));
  return text;
}

/**
 * Fact check (TZ 10.3), streamed as NDJSON so the browser shows results as
 * they arrive. Three callers: a guest trial (text only), the workspace
 * (draftId + current editor text) and the submission pre-check (articleId).
 */
export async function POST(req: Request) {
  let body: { text?: unknown; draftId?: unknown; articleId?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("empty", 400);
  }
  const user = await currentUser();
  const limits = await aiLimits();
  let text = typeof body.text === "string" ? body.text : "";
  let actor: AiActor;
  let paidArticleId: string | null = null;
  const ctx: FactCheckContext = {
    userId: user?.id ?? null,
    draftId: null,
    articleId: null,
    articleType: "RESEARCH",
    categoryId: null,
    maxClaims: limits.maxClaims,
  };

  if (user && typeof body.draftId === "string") {
    const draft = await getOwnDraft(user.id, body.draftId);
    if (!draft) return fail("forbidden", 404);
    ctx.draftId = draft.id;
    ctx.articleType = draft.articleType;
    ctx.categoryId = draft.categoryId;
    paidArticleId = draft.articleId;
    if (!text) text = draft.text;
    actor = { kind: "user", id: user.id, aiQuota: user.aiQuota };
  } else if (user && typeof body.articleId === "string") {
    const article = await db.article.findFirst({
      where: { id: body.articleId, submitterId: user.id },
      select: { id: true, type: true, categoryId: true },
    });
    if (!article) return fail("forbidden", 404);
    ctx.articleId = article.id;
    ctx.articleType = article.type;
    ctx.categoryId = article.categoryId;
    paidArticleId = article.id;
    text = await articleText(article.id);
    actor = { kind: "user", id: user.id, aiQuota: user.aiQuota };
  } else if (user) {
    actor = { kind: "user", id: user.id, aiQuota: user.aiQuota };
  } else {
    const jar = await cookies();
    let device = jar.get(DEVICE_COOKIE)?.value;
    if (!device || !/^[a-f0-9]{32}$/.test(device)) {
      device = randomBytes(16).toString("hex");
      jar.set(DEVICE_COOKIE, device, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || h.get("x-real-ip") || "0";
    actor = { kind: "guest", key: guestKey(ip, device) };
  }

  text = text.trim();
  if (!text) return fail("empty", 400);
  const taken = await consumeCheck(actor, { chars: text.length, paidArticleId });
  if (!taken.ok) return fail(taken.code, taken.code === "rate_limit" ? 429 : 403);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let results = 0;
      let failed = false;
      const emit = (e: FactEvent) => {
        if (e.type === "result") results++;
        if (e.type === "error") failed = true;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
        } catch {
          // The browser went away; the check still finishes and is cached.
        }
      };
      try {
        await runFactCheck(text, ctx, emit);
        if (failed && results === 0) await taken.refund();
        else await markFeature(ctx, "factcheck");
      } catch (e) {
        console.error("[factcheck]", e);
        await taken.refund();
        emit({ type: "error", code: "unavailable" });
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
