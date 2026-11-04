"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import type { ArticleType } from "@/generated/prisma/client";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { checkCitations, type CitationCheck } from "@/lib/ai/citations";
import { AiError } from "@/lib/ai/client";
import {
  ARTICLE_TYPES,
  createDraft,
  getOwnDraft,
  parseReferences,
  saveDraftBody,
  submitDraft,
} from "@/lib/ai/drafts";
import {
  assistWriting,
  chat,
  draftOriginality,
  type FeatureContext,
  findSources,
  makePlan,
  suggestEdits,
  translate,
} from "@/lib/ai/features";
import { mentorMessagesToday, mentorTurn, type MentorMessageView } from "@/lib/ai/mentor";
import { allowLight, consumeCheck, premiumUntil } from "@/lib/ai/quota";
import { reviewDraft } from "@/lib/ai/review";
import { parseLang } from "@/lib/ai/schemas";
import type {
  AiErrorCode,
  Assist,
  ChatMessage,
  DraftReference,
  EditSuggestion,
  Plan,
  Review,
  ScholarItem,
  Translation,
} from "@/lib/ai/schemas";
import { citationStrings, verifyDoi } from "@/lib/ai/scholar";
import { currentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { extractDocx, validateDocx, type DocxError } from "@/lib/submission/docx";

async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

async function localePath(href: string) {
  const locale = (await getLocale()) as AppLocale;
  return getPathname({ href, locale });
}

export async function createDraftAction(form: FormData) {
  const user = await requireUser();
  const type = String(form.get("type") ?? "") as ArticleType;
  const categoryId = String(form.get("categoryId") ?? "") || null;
  const id = await createDraft(user.id, {
    title: String(form.get("title") ?? "").trim() || "Nomsiz qoralama",
    articleType: ARTICLE_TYPES.includes(type) ? type : "RESEARCH",
    categoryId:
      categoryId && (await db.category.findUnique({ where: { id: categoryId } }))
        ? categoryId
        : null,
  });
  redirect(await localePath(`/kabinet/yozish/${id}`));
}

export async function deleteDraftAction(form: FormData) {
  const user = await requireUser();
  await db.draft.deleteMany({ where: { id: String(form.get("id") ?? ""), userId: user.id } });
  redirect(await localePath("/kabinet/yozish"));
}

export async function saveDraftAction(
  id: string,
  input: { title?: string; body?: string },
): Promise<{ savedAt: string } | { error: "save" }> {
  const user = await requireUser();
  try {
    // The document travels as a JSON string: editor objects are not plain values for React.
    const at = await saveDraftBody(user.id, id, {
      title: input.title,
      body: input.body === undefined ? undefined : JSON.parse(input.body),
    });
    return { savedAt: at.toISOString() };
  } catch (e) {
    console.error("[draft save]", e);
    return { error: "save" };
  }
}

export async function importDocxAction(
  form: FormData,
): Promise<{ html: string } | { error: DocxError }> {
  await requireUser();
  const file = form.get("file");
  if (!(file instanceof File)) return { error: "not_docx" };
  const buffer = Buffer.from(await file.arrayBuffer());
  const invalid = await validateDocx({ name: file.name, size: file.size, buffer });
  if (invalid) return { error: invalid };
  const { html } = await extractDocx(buffer);
  return { html };
}

export async function submitDraftAction(id: string): Promise<{ error: string } | never> {
  const user = await requireUser();
  const res = await submitDraft(user, id);
  if ("error" in res) return { error: res.error };
  redirect(await localePath(`/kabinet/yuborish?maqola=${res.articleId}`));
}

export type ToolRequest =
  | { tool: "plan"; notes: string }
  | { tool: "assist"; text: string; question: string }
  | { tool: "edit"; text: string }
  | { tool: "sources"; query: string }
  | { tool: "originality"; text: string }
  | { tool: "citations"; text: string }
  | { tool: "translate"; title: string; abstract: string }
  | { tool: "chat"; history: ChatMessage[]; question: string; text: string }
  | { tool: "review"; text: string };

export type ToolResponse =
  | { tool: "plan"; plan: Plan; checkId: string }
  | { tool: "assist"; assist: Assist; checkId: string }
  | { tool: "edit"; edits: EditSuggestion[]; checkId: string }
  | { tool: "sources"; items: ScholarItem[]; failed: string[]; checkId: string }
  | {
      tool: "originality";
      originality: number;
      matches: { id: string; title: string; overlap: number; slug: string | null }[];
    }
  | {
      tool: "citations";
      check: CitationCheck;
      formatted: { apa: string; gost: string; bibtex: string }[];
    }
  | { tool: "translate"; translation: Translation; checkId: string }
  | { tool: "chat"; answer: string }
  | { tool: "review"; review: Review; checkId: string }
  | { tool: string; error: AiErrorCode };

/** Checks counted against the quota (TZ 10.4); the rest are only rate limited. */
const COUNTED = new Set(["plan", "assist", "edit", "translate", "review"]);

export async function runToolAction(draftId: string, req: ToolRequest): Promise<ToolResponse> {
  const user = await requireUser();
  const draft = await getOwnDraft(user.id, draftId);
  if (!draft) return { tool: req.tool, error: "forbidden" };
  const ctx: FeatureContext = {
    userId: user.id,
    draftId: draft.id,
    articleId: null,
    articleType: draft.articleType,
    categoryId: draft.categoryId,
    lang: parseLang(await getLocale()),
  };
  const actor = { kind: "user" as const, id: user.id, aiQuota: user.aiQuota };
  const size =
    "text" in req
      ? req.text.length
      : req.tool === "translate"
        ? req.title.length + req.abstract.length
        : 0;

  if (req.tool === "originality") {
    const r = await draftOriginality(ctx, req.text.slice(0, 200_000));
    return { tool: "originality", originality: r.originality, matches: r.matches };
  }
  if (req.tool === "citations") {
    const refs = parseReferences(draft.references);
    return {
      tool: "citations",
      check: checkCitations(req.text, refs),
      formatted: refs.map((r, i) => citationStrings(r, i + 1)),
    };
  }

  let refund: (() => Promise<void>) | null = null;
  if (COUNTED.has(req.tool)) {
    const taken = await consumeCheck(actor, {
      chars: size,
      paidArticleId: draft.articleId,
      workKey: draft.articleId ? `article:${draft.articleId}` : `draft:${draft.id}`,
    });
    if (!taken.ok) return { tool: req.tool, error: taken.code };
    refund = taken.refund;
  } else {
    const blocked = await allowLight(actor);
    if (blocked) return { tool: req.tool, error: blocked };
    if (size > 60_000) return { tool: req.tool, error: "too_long" };
  }

  try {
    switch (req.tool) {
      case "plan": {
        const r = await makePlan(ctx, draft.title, req.notes.slice(0, 2000));
        return { tool: "plan", ...r };
      }
      case "assist": {
        if (!req.text.trim()) throw new AiError("empty");
        const r = await assistWriting(ctx, req.text, req.question.slice(0, 1000));
        return { tool: "assist", ...r };
      }
      case "edit": {
        if (!req.text.trim()) throw new AiError("empty");
        const r = await suggestEdits(ctx, req.text);
        return { tool: "edit", ...r };
      }
      case "translate": {
        if (!req.title.trim() && !req.abstract.trim()) throw new AiError("empty");
        const r = await translate(ctx, req.title, req.abstract);
        return { tool: "translate", ...r };
      }
      case "sources": {
        if (!req.query.trim()) throw new AiError("empty");
        const r = await findSources(ctx, req.query.slice(0, 2000));
        return { tool: "sources", items: r.items, failed: r.failed, checkId: r.checkId };
      }
      case "review": {
        const r = await reviewDraft(ctx, draft.title, req.text.slice(0, 60_000));
        return { tool: "review", ...r };
      }
      case "chat": {
        if (!req.question.trim()) throw new AiError("empty");
        const r = await chat(ctx, req.history, req.question, {
          title: draft.title,
          text: req.text,
        });
        return { tool: "chat", answer: r.answer };
      }
    }
  } catch (e) {
    await refund?.();
    return { tool: req.tool, error: e instanceof AiError ? e.code : "unavailable" };
  }
}

/** Adds a found source to the draft's bibliography; DOIs are confirmed through Crossref. */
export async function addReferenceAction(
  draftId: string,
  ref: DraftReference,
): Promise<{ references: DraftReference[] } | { error: "save" }> {
  const user = await requireUser();
  const draft = await getOwnDraft(user.id, draftId);
  if (!draft) return { error: "save" };
  const refs = parseReferences(draft.references);
  const clean: DraftReference = {
    id: String(ref.id).slice(0, 120),
    title: String(ref.title).slice(0, 400),
    authors: (ref.authors ?? []).map((a) => String(a).slice(0, 120)).slice(0, 20),
    year: Number.isInteger(ref.year) ? ref.year : null,
    journal: ref.journal ? String(ref.journal).slice(0, 300) : null,
    doi: ref.doi ? String(ref.doi).slice(0, 200) : null,
    url: String(ref.url).slice(0, 600),
    verified: ref.doi ? await verifyDoi(ref.doi) : false,
  };
  if (!/^https?:\/\//.test(clean.url)) return { error: "save" };
  const same = refs.findIndex((r) => (clean.doi && r.doi === clean.doi) || r.url === clean.url);
  const next = same >= 0 ? refs : [...refs, clean];
  await saveDraftBody(user.id, draftId, { references: next });
  return { references: next };
}

export async function removeReferenceAction(draftId: string, refId: string) {
  const user = await requireUser();
  const draft = await getOwnDraft(user.id, draftId);
  if (!draft) return { references: [] as DraftReference[] };
  const next = parseReferences(draft.references).filter((r) => r.id !== refId);
  await saveDraftBody(user.id, draftId, { references: next });
  return { references: next };
}

/** Feedback that teaches the AI: accepted/rejected edits, thumbs up/down (stage 6). */
export async function feedbackAction(input: {
  checkId: string | null;
  feature: string;
  verdict: "up" | "down" | "accepted" | "rejected";
  payload?: unknown;
}) {
  const user = await requireUser();
  if (!["up", "down", "accepted", "rejected"].includes(input.verdict)) return;
  const check = input.checkId
    ? await db.aiCheck.findFirst({
        where: { id: input.checkId, userId: user.id },
        select: { id: true },
      })
    : null;
  await db.aiFeedback.create({
    data: {
      aiCheckId: check?.id ?? null,
      userId: user.id,
      feature: input.feature.slice(0, 40),
      verdict: input.verdict,
      payload:
        input.payload === undefined
          ? undefined
          : JSON.parse(JSON.stringify(input.payload).slice(0, 20000) || "null"),
    },
  });
}

/** Messages per author per day in Xorazmiy Ustoz (keeps a Premium month's cost bounded). */
const MENTOR_DAILY = 60;

export type MentorResponse =
  { author: MentorMessageView; reply: MentorMessageView; stage: number } | { error: AiErrorCode };

/** Xorazmiy Ustoz: Premium only; the chat is stored on the draft. */
export async function mentorAction(
  draftId: string,
  message: string,
  goTo?: number,
  /** The editor's current text (the saved copy can be a few seconds behind). */
  current?: string,
): Promise<MentorResponse> {
  const user = await requireUser();
  const draft = await getOwnDraft(user.id, draftId);
  if (!draft) return { error: "forbidden" };
  const text = message.trim().slice(0, 4000);
  if (!text) return { error: "empty" };
  if (!(await premiumUntil(user.id))) return { error: "premium_required" };
  if ((await mentorMessagesToday(user.id)) >= MENTOR_DAILY) return { error: "daily_limit" };
  const taken = await consumeCheck(
    { kind: "user", id: user.id, aiQuota: user.aiQuota },
    {
      chars: text.length,
      paidArticleId: draft.articleId,
      workKey: draft.articleId ? `article:${draft.articleId}` : `draft:${draft.id}`,
    },
  );
  if (!taken.ok) return { error: taken.code };
  const ctx: FeatureContext = {
    userId: user.id,
    draftId: draft.id,
    articleId: null,
    articleType: draft.articleType,
    categoryId: draft.categoryId,
    lang: parseLang(await getLocale()),
  };
  try {
    return await mentorTurn(
      ctx,
      {
        id: draft.id,
        title: draft.title,
        text: typeof current === "string" ? current.slice(0, 200_000) : draft.text,
        mentorStage: draft.mentorStage,
        mentorNotes: draft.mentorNotes,
      },
      text,
      Number.isInteger(goTo) ? goTo : undefined,
    );
  } catch (e) {
    await taken.refund();
    return { error: e instanceof AiError ? e.code : "unavailable" };
  }
}
