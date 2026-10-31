import "server-only";
import type { ArticleType, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  saveDraft as saveSubmission,
  type SubmitUser,
  uploadManuscript,
} from "@/lib/submission/service";
import { docToText, EMPTY_DOC, isDoc, type DocNode } from "./doc";
import { draftToDocx } from "./docx-export";
import type { DraftReference, FactResult, EditSuggestion } from "./schemas";
import { countWords } from "./text";

/** Workspace drafts (Ekran 3, /kabinet/yozish/[draftId]). Owner-only. */

export const ARTICLE_TYPES: ArticleType[] = ["RESEARCH", "REVIEW", "CASE_STUDY", "POPULAR"];

export function listDrafts(userId: string) {
  return db.draft.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      articleType: true,
      wordCount: true,
      updatedAt: true,
      article: { select: { number: true, status: true } },
    },
  });
}

export function getOwnDraft(userId: string, id: string) {
  return db.draft.findFirst({ where: { id, userId }, include: { category: true } });
}

export async function createDraft(
  userId: string,
  input: { title: string; articleType: ArticleType; categoryId: string | null },
) {
  const draft = await db.draft.create({
    data: {
      userId,
      title: input.title.slice(0, 300),
      articleType: input.articleType,
      categoryId: input.categoryId,
      body: EMPTY_DOC as unknown as Prisma.InputJsonValue,
      text: docToText(EMPTY_DOC),
    },
    select: { id: true },
  });
  return draft.id;
}

export function parseReferences(v: unknown): DraftReference[] {
  return Array.isArray(v) ? (v as DraftReference[]) : [];
}

export async function saveDraftBody(
  userId: string,
  id: string,
  input: { title?: string; body?: unknown; references?: DraftReference[] },
) {
  const data: Prisma.DraftUpdateManyMutationInput = {};
  if (input.title !== undefined) data.title = input.title.trim().slice(0, 300) || "Nomsiz qoralama";
  if (input.body !== undefined) {
    if (!isDoc(input.body)) throw new Error("Invalid document");
    const json = JSON.stringify(input.body);
    if (json.length > 2_000_000) throw new Error("Document too large");
    const text = docToText(input.body);
    data.body = input.body as unknown as Prisma.InputJsonValue;
    data.text = text;
    data.wordCount = countWords(text);
  }
  if (input.references !== undefined) {
    data.references = input.references.slice(0, 200) as unknown as Prisma.InputJsonValue;
  }
  const res = await db.draft.updateMany({ where: { id, userId }, data });
  if (!res.count) throw new Error("Not found");
  return new Date();
}

/** Last fact check and edit suggestions, to restore the right panel. */
export async function lastResults(draftId: string) {
  const [fact, edit] = await Promise.all([
    db.aiCheck.findFirst({
      where: { draftId, type: "FACTCHECK", model: "summary" },
      orderBy: { createdAt: "desc" },
      select: { result: true },
    }),
    db.aiCheck.findFirst({
      where: { draftId, type: "EDIT" },
      orderBy: { createdAt: "desc" },
      select: { result: true },
    }),
  ]);
  return {
    facts: ((fact?.result as { results?: FactResult[] } | null)?.results ?? []) as FactResult[],
    edits: ((edit?.result as { edits?: EditSuggestion[] } | null)?.edits ?? []) as EditSuggestion[],
  };
}

export async function exportDraft(userId: string, id: string) {
  const draft = await getOwnDraft(userId, id);
  if (!draft) return null;
  const buffer = await draftToDocx({
    title: draft.title,
    body: (isDoc(draft.body) ? draft.body : EMPTY_DOC) as DocNode,
    references: parseReferences(draft.references),
  });
  return { buffer, title: draft.title };
}

/**
 * "Jurnalga yuborish": the draft becomes a submission (status DRAFT) with
 * the exported .docx as manuscript; the author completes Ekran 6. AI
 * features used are carried over (TZ 10.2).
 */
export async function submitDraft(
  user: SubmitUser,
  id: string,
): Promise<{ articleId: string } | { error: "not_found" | "empty" | "locked" | string }> {
  const draft = await getOwnDraft(user.id, id);
  if (!draft) return { error: "not_found" };
  if (draft.wordCount < 50) return { error: "empty" };

  let articleId = draft.articleId;
  if (articleId) {
    const a = await db.article.findUnique({ where: { id: articleId }, select: { status: true } });
    if (a && !["DRAFT", "AWAITING_PAYMENT", "REVISION_REQUESTED"].includes(a.status)) {
      return { error: "locked" };
    }
    if (!a) articleId = null;
  }
  if (!articleId) {
    articleId = await saveSubmission(user, null, {
      titleUz: draft.title,
      titleEn: "",
      titleRu: "",
      categoryId: draft.categoryId ?? "",
      type: draft.articleType,
      language: "uz",
      abstractUz: "",
      abstractEn: "",
      keywords: [],
      authors: [],
    });
    await db.draft.update({ where: { id: draft.id }, data: { articleId } });
  }
  const exported = await exportDraft(user.id, id);
  const upload = await uploadManuscript(user, articleId, {
    name: "maqola.docx",
    size: exported!.buffer.length,
    buffer: exported!.buffer,
  });
  if (!upload.ok) return { error: upload.error };
  await db.article.update({
    where: { id: articleId },
    data: { aiFeaturesUsed: draft.aiFeaturesUsed },
  });
  return { articleId };
}
