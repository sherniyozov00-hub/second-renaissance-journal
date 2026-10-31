"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { STAFF_LOCALE_COOKIE } from "@/i18n/request";
import { routing } from "@/i18n/routing";

/** Language switch of the admin and reviewer panels (uz / ru / en). */
export async function setStaffLocaleAction(form: FormData) {
  const locale = String(form.get("locale") ?? "");
  if (!(routing.locales as readonly string[]).includes(locale)) return;
  (await cookies()).set(STAFF_LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/admin", "layout");
  revalidatePath("/taqriz", "layout");
}
