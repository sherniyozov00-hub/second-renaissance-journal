"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { createPracticeDraft, setLessonDone } from "@/lib/academy/service";
import { currentUser } from "@/lib/auth/session";

async function path(href: string) {
  return getPathname({ href, locale: (await getLocale()) as AppLocale });
}

async function loginFirst(slug: string): Promise<never> {
  const locale = (await getLocale()) as AppLocale;
  redirect(
    getPathname({
      href: { pathname: "/kirish", query: { next: await path(`/akademiya/${slug}`) } },
      locale,
    }),
  );
}

const slugOf = (form: FormData) => String(form.get("slug") ?? "").slice(0, 120);

/** "Xorazmiy AI bilan mashq": opens the workspace with the lesson's exercise. */
export async function startPracticeAction(form: FormData) {
  const slug = slugOf(form);
  const user = await currentUser();
  if (!user) return loginFirst(slug);
  const id = await createPracticeDraft(user.id, slug, await getLocale());
  redirect(await path(id ? `/kabinet/yozish/${id}` : "/akademiya"));
}

export async function toggleLessonAction(form: FormData) {
  const slug = slugOf(form);
  const user = await currentUser();
  if (!user) return loginFirst(slug);
  await setLessonDone(user.id, slug, form.get("done") === "1");
  revalidatePath("/[locale]/akademiya", "layout");
  revalidatePath("/[locale]/kabinet", "layout");
}
