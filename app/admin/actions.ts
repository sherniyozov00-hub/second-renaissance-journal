"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { staffOrThrow } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import {
  acceptArticle,
  addComment,
  assignReviewer,
  publishArticle,
  refundPayment,
  rejectArticle,
  requestRevision,
  setPublicationDetails,
  WorkflowError,
} from "@/lib/editorial/workflow";
import { SETTINGS } from "@/lib/settings/registry";
import { slugify } from "@/lib/text/uz";

const EDITOR: Role[] = ["EDITOR", "ADMIN"];
const ADMIN: Role[] = ["ADMIN"];

const str = (f: FormData, k: string, max = 4000) =>
  String(f.get(k) ?? "")
    .trim()
    .slice(0, max);
const int = (f: FormData, k: string) => {
  const n = Number(f.get(k));
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** Runs an editorial action and returns to the article page with a result code. */
async function run(articleId: string, fn: () => Promise<unknown>, ok: string) {
  let code = ok;
  try {
    await fn();
  } catch (err) {
    if (!(err instanceof WorkflowError)) throw err;
    code = `xato-${err.code}`;
  }
  revalidatePath("/admin/maqolalar");
  redirect(`/admin/maqolalar/${articleId}?natija=${code}`);
}

export async function assignReviewerAction(form: FormData) {
  const user = await staffOrThrow(EDITOR);
  const id = str(form, "articleId");
  const due = new Date(str(form, "dueAt"));
  await run(
    id,
    () =>
      assignReviewer(
        user,
        id,
        str(form, "reviewerId"),
        isNaN(+due) ? new Date(Date.now() + 14 * 864e5) : due,
      ),
    "taqrizchi",
  );
}

export async function revisionAction(form: FormData) {
  const user = await staffOrThrow(EDITOR);
  const id = str(form, "articleId");
  await run(id, () => requestRevision(user, id, str(form, "note")), "tuzatish");
}

/** Runs Muharrir yordamchisi again (e.g. after the API key was connected). */
export async function briefAction(form: FormData) {
  await staffOrThrow(EDITOR);
  const id = str(form, "articleId");
  const { buildEditorBrief } = await import("@/lib/editorial/assistant");
  await buildEditorBrief(id);
  revalidatePath(`/admin/maqolalar/${id}`);
  redirect(`/admin/maqolalar/${id}?natija=tahlil`);
}

export async function acceptAction(form: FormData) {
  const user = await staffOrThrow(EDITOR);
  const id = str(form, "articleId");
  await run(id, () => acceptArticle(user, id), "qabul");
}

export async function rejectAction(form: FormData) {
  const user = await staffOrThrow(EDITOR);
  const id = str(form, "articleId");
  await run(id, () => rejectArticle(user, id, str(form, "reason")), "rad");
}

export async function commentAction(form: FormData) {
  const user = await staffOrThrow(EDITOR);
  const id = str(form, "articleId");
  await run(
    id,
    () => addComment(user, id, str(form, "body"), form.get("visible") === "on"),
    "izoh",
  );
}

export async function publicationDetailsAction(form: FormData) {
  const user = await staffOrThrow(EDITOR);
  const id = str(form, "articleId");
  await run(
    id,
    () =>
      setPublicationDetails(user, id, {
        issueId: str(form, "issueId") || null,
        pageStart: int(form, "pageStart"),
        pageEnd: int(form, "pageEnd"),
        doi: str(form, "doi", 200) || null,
      }),
    "saqlandi",
  );
}

export async function publishAction(form: FormData) {
  const user = await staffOrThrow(EDITOR);
  const id = str(form, "articleId");
  await run(id, () => publishArticle(user, id), "nashr");
}

// ── Issues ───────────────────────────────────────────────────────────────────

export async function createIssueAction(form: FormData) {
  const user = await staffOrThrow(EDITOR);
  const year = int(form, "year");
  const number = int(form, "number");
  if (!year || !number) redirect("/admin/sonlar?natija=xato-invalid");
  const issue = await db.issue.upsert({
    where: { year_number: { year: year!, number: number! } },
    update: {},
    create: {
      year: year!,
      number: number!,
      title: str(form, "title", 200) || `${year} · ${number}-son`,
    },
  });
  await db.auditLog.create({
    data: { actorId: user.id, action: "issue_created", entity: "Issue", entityId: issue.id },
  });
  revalidatePath("/admin/sonlar");
  redirect("/admin/sonlar?natija=yaratildi");
}

export async function publishIssueAction(form: FormData) {
  const user = await staffOrThrow(EDITOR);
  const id = str(form, "issueId");
  const issue = await db.issue.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await db.auditLog.create({
    data: { actorId: user.id, action: "issue_published", entity: "Issue", entityId: issue.id },
  });
  const { enqueue } = await import("@/lib/jobs");
  await enqueue("issue.announce", { issueId: issue.id });
  revalidatePath("/admin/sonlar");
  redirect("/admin/sonlar?natija=nashr");
}

// ── Categories, pages, settings (admin only) ────────────────────────────────

export async function saveCategoryAction(form: FormData) {
  const user = await staffOrThrow(ADMIN);
  const id = str(form, "id");
  const name = {
    uz: str(form, "nameUz", 120),
    ru: str(form, "nameRu", 120),
    en: str(form, "nameEn", 120),
  };
  const description = {
    uz: str(form, "descUz", 300),
    ru: str(form, "descRu", 300),
    en: str(form, "descEn", 300),
  };
  if (!name.uz) redirect("/admin/kategoriyalar?natija=xato-invalid");
  const data = {
    name,
    description,
    order: int(form, "order") ?? 0,
    isActive: form.get("isActive") === "on",
  };
  const row = id
    ? await db.category.update({ where: { id }, data })
    : await db.category.create({
        data: { ...data, slug: str(form, "slug", 80) || slugify(name.uz) },
      });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: id ? "category_updated" : "category_created",
      entity: "Category",
      entityId: row.id,
    },
  });
  revalidatePath("/", "layout");
  redirect("/admin/kategoriyalar?natija=saqlandi");
}

export async function savePageAction(form: FormData) {
  const user = await staffOrThrow(ADMIN);
  const id = str(form, "id");
  const l10n = (k: string, max = 20000) => ({
    uz: str(form, `${k}Uz`, max),
    ru: str(form, `${k}Ru`, max),
    en: str(form, `${k}En`, max),
  });
  await db.page.update({
    where: { id },
    data: {
      title: l10n("title", 200),
      body: l10n("body"),
      seoTitle: l10n("seoTitle", 200),
      seoDescription: l10n("seoDesc", 300),
    },
  });
  await db.auditLog.create({
    data: { actorId: user.id, action: "page_updated", entity: "Page", entityId: id },
  });
  revalidatePath("/", "layout");
  redirect(`/admin/sahifalar?natija=saqlandi`);
}

export async function saveSettingsAction(form: FormData) {
  const user = await staffOrThrow(ADMIN);
  const before = Object.fromEntries((await db.setting.findMany()).map((s) => [s.key, s.value]));
  const changed: Record<string, unknown> = {};
  for (const def of SETTINGS) {
    if (!form.has(def.key)) continue;
    const raw = str(form, def.key, 2000);
    const value = typeof def.defaultValue === "number" && /^\d+$/.test(raw) ? Number(raw) : raw;
    if (before[def.key] === value) continue;
    await db.setting.upsert({
      where: { key: def.key },
      update: { value },
      create: { key: def.key, value },
    });
    changed[def.key] = value;
  }
  if (Object.keys(changed).length) {
    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "settings_updated",
        entity: "Setting",
        entityId: "settings",
        after: changed as object,
      },
    });
  }
  revalidatePath("/", "layout");
  redirect("/admin/sozlamalar?natija=saqlandi");
}

// ── Users and roles ─────────────────────────────────────────────────────────

const ROLES: Role[] = ["AUTHOR", "REVIEWER", "EDITOR", "ADMIN"];

export async function saveUserRolesAction(form: FormData) {
  const actor = await staffOrThrow(ADMIN);
  const id = str(form, "userId");
  const roles = ROLES.filter((r) => form.get(`role-${r}`) === "on");
  const isBlocked = form.get("isBlocked") === "on";
  // An admin cannot lock themselves out.
  if (id === actor.id && (!roles.includes("ADMIN") || isBlocked))
    redirect("/admin/foydalanuvchilar?natija=xato-self");
  const before = await db.user.findUniqueOrThrow({ where: { id } });
  await db.user.update({ where: { id }, data: { roles, isBlocked } });
  await db.auditLog.create({
    data: {
      actorId: actor.id,
      action: "roles_changed",
      entity: "User",
      entityId: id,
      before: { roles: before.roles, isBlocked: before.isBlocked },
      after: { roles, isBlocked },
    },
  });
  revalidatePath("/admin/foydalanuvchilar");
  redirect("/admin/foydalanuvchilar?natija=saqlandi");
}

// ── Payments and promo codes ────────────────────────────────────────────────

export async function refundAction(form: FormData) {
  const actor = await staffOrThrow(ADMIN);
  let code = "qaytarildi";
  try {
    await refundPayment(actor, str(form, "paymentId"), str(form, "reason", 500));
  } catch (err) {
    if (!(err instanceof WorkflowError)) throw err;
    code = `xato-${err.code}`;
  }
  revalidatePath("/admin/tolovlar");
  redirect(`/admin/tolovlar?natija=${code}`);
}

/** Click QR: an admin saw the money in Click and confirms (or rejects) the payment. */
export async function confirmClickQrAction(form: FormData) {
  const actor = await staffOrThrow(ADMIN);
  const id = str(form, "paymentId");
  const payment = await db.payment.findFirst({
    where: { id, provider: "CLICK_QR", status: "PENDING" },
  });
  if (!payment) redirect("/admin/tolovlar?natija=xato-invalid");
  if (form.get("decision") === "reject") {
    await db.payment.update({ where: { id }, data: { status: "CANCELLED" } });
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        action: "payment_rejected",
        entity: "Payment",
        entityId: id,
        after: { provider: "CLICK_QR" },
      },
    });
    revalidatePath("/admin/tolovlar");
    redirect("/admin/tolovlar?natija=rad");
  }
  const { markPaid } = await import("@/lib/payments/service");
  await markPaid(id, `click-qr-${id}`, { confirmedBy: actor.id, at: Date.now() });
  revalidatePath("/admin/tolovlar");
  redirect("/admin/tolovlar?natija=tasdiqlandi");
}

export async function savePromoAction(form: FormData) {
  const actor = await staffOrThrow(ADMIN);
  const code = str(form, "code", 40)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
  const percent = int(form, "percent");
  const amount = int(form, "amount");
  if (!code || (!percent && !amount) || (percent && percent > 100))
    redirect("/admin/tolovlar?natija=xato-invalid");
  const until = str(form, "validUntil");
  const promo = await db.promoCode.upsert({
    where: { code },
    update: {
      discountPercent: percent,
      discountAmount: percent ? null : amount,
      usageLimit: int(form, "limit"),
      validUntil: until ? new Date(until) : null,
      isActive: true,
    },
    create: {
      code,
      discountPercent: percent,
      discountAmount: percent ? null : amount,
      usageLimit: int(form, "limit"),
      validUntil: until ? new Date(until) : null,
    },
  });
  await db.auditLog.create({
    data: { actorId: actor.id, action: "promo_saved", entity: "PromoCode", entityId: promo.id },
  });
  redirect("/admin/tolovlar?natija=promokod");
}

export async function togglePromoAction(form: FormData) {
  await staffOrThrow(ADMIN);
  const id = str(form, "id");
  const p = await db.promoCode.findUniqueOrThrow({ where: { id } });
  await db.promoCode.update({ where: { id }, data: { isActive: !p.isActive } });
  redirect("/admin/tolovlar");
}

// ── Akademiya lessons (stage 7) ─────────────────────────────────────────────

export async function saveLessonAction(form: FormData) {
  const user = await staffOrThrow(ADMIN);
  const id = str(form, "id", 40);
  const title = str(form, "title", 200);
  const body = str(form, "body", 50000);
  if (!title || !body) redirect(`/admin/akademiya?natija=xato`);
  const video = str(form, "videoUrl", 400);
  const data = {
    title,
    slug: slugify(str(form, "slug", 120) || title),
    summary: str(form, "summary", 300) || null,
    body,
    example: str(form, "example", 20000) || null,
    exercise: str(form, "exercise", 2000) || null,
    videoUrl: /^https:\/\//.test(video) ? video : null,
    durationMin: int(form, "durationMin") ?? 10,
    order: Number(form.get("order")) || 0,
    isPublished: form.get("isPublished") === "1",
    // Russian and English versions; empty fields fall back to Uzbek on the site.
    translations: Object.fromEntries(
      (["ru", "en"] as const).map((lang) => [
        lang,
        Object.fromEntries(
          (["title", "summary", "body", "example", "exercise"] as const)
            .map((f) => [f, str(form, `${lang}_${f}`, f === "body" ? 50000 : 20000)])
            .filter(([, v]) => v),
        ),
      ]),
    ),
  };
  try {
    if (id) await db.lesson.update({ where: { id }, data });
    else await db.lesson.create({ data });
  } catch {
    // Unique slug taken.
    redirect(`/admin/akademiya?natija=slug`);
  }
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: id ? "lesson_updated" : "lesson_created",
      entity: "Lesson",
      entityId: id || data.slug,
    },
  });
  revalidatePath("/", "layout");
  redirect(`/admin/akademiya?natija=saqlandi`);
}
