"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings/get";
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

export type ProfileState = { ok?: boolean; errors?: Partial<Record<"name" | "orcid", true>> };

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
