"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings/get";
import { getStorage } from "@/lib/storage";
import { normalizePhone } from "@/lib/auth/identifiers";
import { isPlaceholder } from "@/lib/settings/registry";
import { slugify } from "@/lib/text/uz";

/** Opens the Telegram bot with a one-time deep-link token (TZ 14). */
export async function connectTelegramAction() {
  const user = await currentUser();
  if (!user) return;
  const bot = String(await getSetting("telegram.botName")).replace(/^@/, "");
  if (!bot || isPlaceholder(bot)) return;
  const token = randomBytes(16).toString("hex");
  await db.user.update({ where: { id: user.id }, data: { telegramLinkToken: token } });
  redirect(`https://t.me/${bot}?start=${token}`);
}

export type ProfileState = { ok?: boolean; errors?: Partial<Record<"name" | "orcid" | "phone", true>> };

const ORCID = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

async function uniqueSlug(base: string, ownId?: string) {
  const root = slugify(base) || "muallif";
  for (let i = 0; i < 50; i++) {
    const slug = i ? `${root}-${i + 1}` : root;
    const taken = await db.authorProfile.findUnique({ where: { slug }, select: { id: true } });
    if (!taken || taken.id === ownId) return slug;
  }
  return `${root}-${randomBytes(3).toString("hex")}`;
}

/** A non-Uzbek number: "+" and 8–15 digits (E.164). */
function looseIntlPhone(raw: string): string | null {
  const digits = raw.replace(/[\s()-]/g, "");
  return /^\+\d{8,15}$/.test(digits) ? digits : null;
}

/** Creates or updates the user's public author profile. */
export async function saveProfileAction(
  _prev: ProfileState,
  form: FormData,
): Promise<ProfileState> {
  const user = await currentUser();
  if (!user) return {};
  const fullName = String(form.get("fullName") ?? "")
    .trim()
    .slice(0, 120);
  const orcid = String(form.get("orcid") ?? "")
    .trim()
    .toUpperCase();
  const errors: ProfileState["errors"] = {};
  if (fullName.length < 3) errors.name = true;
  if (orcid && !ORCID.test(orcid)) errors.orcid = true;
  const rawPhone = String(form.get("phone") ?? "").trim();
  const phone = rawPhone ? (normalizePhone(rawPhone) ?? looseIntlPhone(rawPhone)) : null;
  if (rawPhone && !phone) errors.phone = true;
  if (Object.keys(errors).length) return { errors };

  const data = {
    fullName,
    affiliation:
      String(form.get("affiliation") ?? "")
        .trim()
        .slice(0, 200) || null,
    position:
      String(form.get("position") ?? "")
        .trim()
        .slice(0, 80) || null,
    orcid: orcid || null,
    bio:
      String(form.get("bio") ?? "")
        .trim()
        .slice(0, 1000) || null,
    interests:
      String(form.get("interests") ?? "")
        .trim()
        .slice(0, 300) || null,
    phone,
    isPublic: form.get("isPublic") === "on",
  };

  await db.$transaction(async (tx) => {
    if (user.profile) {
      await tx.authorProfile.update({ where: { id: user.profile.id }, data });
    } else {
      await tx.authorProfile.create({
        data: { ...data, userId: user.id, slug: await uniqueSlug(fullName) },
      });
    }
    await tx.user.update({
      where: { id: user.id },
      data: {
        name: fullName,
        ...(form.get("consent") === "1" && !user.consentAt ? { consentAt: new Date() } : {}),
      },
    });
  });
  revalidatePath("/[locale]/kabinet", "layout");
  return { ok: true };
}

export type AvatarState = { ok?: boolean; error?: "no_profile" | "bad_file" | "too_big" };

const MAX_AVATAR = 400 * 1024;

/**
 * Saves the profile photo. The browser already crops it to a 320×320 JPEG,
 * so a file is ~20–60 KB; the server only accepts a real JPEG this small.
 */
export async function saveAvatarAction(_prev: AvatarState, form: FormData): Promise<AvatarState> {
  const user = await currentUser();
  if (!user) return {};
  if (!user.profile) return { error: "no_profile" };
  const profileId = user.profile.id;
  if (form.get("intent") === "remove") {
    await db.authorProfile.update({ where: { id: profileId }, data: { avatarUrl: null } });
    revalidatePath("/[locale]/kabinet", "layout");
    return { ok: true };
  }
  const file = form.get("avatar");
  if (!(file instanceof File) || !file.size) return { error: "bad_file" };
  if (file.size > MAX_AVATAR) return { error: "too_big" };
  const body = Buffer.from(await file.arrayBuffer());
  if (!(body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff)) return { error: "bad_file" };
  await getStorage().put(`avatars/${profileId}.jpg`, body, "image/jpeg");
  await db.authorProfile.update({
    where: { id: profileId },
    data: { avatarUrl: `/api/avatar/${profileId}?v=${Date.now().toString(36)}` },
  });
  revalidatePath("/[locale]/kabinet", "layout");
  return { ok: true };
}
