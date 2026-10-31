"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AiKnowledgeKind, ArticleType, Prisma, Role } from "@/generated/prisma/client";
import { staffOrThrow } from "@/lib/admin/auth";
import { clearKnowledgeCache } from "@/lib/ai/knowledge";
import { db } from "@/lib/db";
import { slugify } from "@/lib/text/uz";

/** Admin → Xorazmiy AI: the knowledge base that "trains" the assistant (stage 6). */

const EDITOR: Role[] = ["EDITOR", "ADMIN"];
const KINDS: AiKnowledgeKind[] = ["GUIDE", "CHECKLIST", "STYLE", "EXAMPLE"];
const TYPES: ArticleType[] = ["RESEARCH", "REVIEW", "CASE_STUDY", "POPULAR"];

const str = (f: FormData, k: string, max = 20000) =>
  String(f.get(k) ?? "")
    .trim()
    .slice(0, max);

function parse(form: FormData) {
  const kind = str(form, "kind") as AiKnowledgeKind;
  const type = str(form, "articleType") as ArticleType;
  return {
    kind: KINDS.includes(kind) ? kind : "GUIDE",
    articleType: TYPES.includes(type) ? type : null,
    categoryId: str(form, "categoryId", 40) || null,
    title: str(form, "title", 200),
    body: str(form, "body"),
    active: form.get("active") === "1",
  };
}

function done(code: string): never {
  clearKnowledgeCache();
  revalidatePath("/admin/xorazmiy-ai");
  redirect(`/admin/xorazmiy-ai?natija=${code}`);
}

export async function saveKnowledgeAction(form: FormData) {
  const user = await staffOrThrow(EDITOR);
  const id = str(form, "id", 40);
  const data = parse(form);
  if (!data.title || !data.body) done("xato");
  if (id) {
    await db.aiKnowledge.update({
      where: { id },
      data: { ...data, version: { increment: 1 }, updatedById: user.id },
    });
  } else {
    await db.aiKnowledge.create({
      data: {
        ...data,
        key: `custom.${slugify(data.title, 40)}.${Date.now().toString(36)}`,
        updatedById: user.id,
      },
    });
  }
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: id ? "ai_knowledge_updated" : "ai_knowledge_created",
      entity: "AiKnowledge",
      entityId: id || data.title,
    },
  });
  done("saqlandi");
}

/** A good answer becomes an EXAMPLE the AI imitates for this kind of task. */
export async function promoteFeedbackAction(form: FormData) {
  const user = await staffOrThrow(EDITOR);
  const fb = await db.aiFeedback.findUnique({ where: { id: str(form, "id", 40) } });
  if (!fb || fb.promoted) done("xato");
  const p = (fb!.payload ?? {}) as Record<string, unknown>;
  const body =
    "original" in p
      ? `Asl: “${p.original}”\nTaklif: “${p.replacement}”\nSabab: ${p.reason ?? ""}`
      : "q" in p
        ? `Savol: ${p.q}\nYaxshi javob: ${p.a}`
        : JSON.stringify(p, null, 2).slice(0, 4000);
  await db.$transaction([
    db.aiKnowledge.create({
      data: {
        key: `feedback.${fb!.id}`,
        kind: "EXAMPLE",
        title: `Namuna (${fb!.feature}): muallif ma’qullagan javob`,
        body: body.slice(0, 8000),
        updatedById: user.id,
      },
    }),
    db.aiFeedback.update({ where: { id: fb!.id }, data: { promoted: true } }),
  ]);
  done("namuna");
}

export async function deleteKnowledgeAction(form: FormData) {
  const user = await staffOrThrow(EDITOR);
  const id = str(form, "id", 40);
  const row = await db.aiKnowledge.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: "ai_knowledge_deleted",
      entity: "AiKnowledge",
      entityId: id,
      before: { key: row.key, title: row.title } as Prisma.InputJsonValue,
    },
  });
  done("ochirildi");
}
