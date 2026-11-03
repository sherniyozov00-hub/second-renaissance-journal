"use server";

import { redirect } from "next/navigation";
import { staffOrThrow } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { getEmailProvider } from "@/lib/notify/email";
import { SECRET_KEYS, setSecret, type SecretKey } from "@/lib/secrets";
import { siteConfig } from "@/lib/site";

/** Saves the keys typed into the form; an empty secret field keeps the old value. */
export async function saveIntegrationsAction(form: FormData) {
  const user = await staffOrThrow(["ADMIN"]);
  const changed: SecretKey[] = [];
  for (const key of SECRET_KEYS) {
    const raw = form.get(key);
    if (typeof raw !== "string") continue;
    const value = raw.trim().slice(0, 500);
    if (form.get(`${key}__clear`) === "1") {
      await setSecret(key, "");
      changed.push(key);
    } else if (value) {
      await setSecret(key, value);
      changed.push(key);
    }
  }
  if (changed.length) {
    // Only the names: values never go to the audit log.
    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "integrations_updated",
        entity: "Setting",
        entityId: "integrations",
        after: { keys: changed },
      },
    });
  }
  redirect("/admin/integratsiyalar?natija=saqlandi");
}

/** Sends a test email to the signed-in administrator. */
export async function testEmailAction() {
  const user = await staffOrThrow(["ADMIN"]);
  const me = await db.user.findUnique({ where: { id: user.id }, select: { email: true } });
  if (!me?.email) redirect("/admin/integratsiyalar?natija=email_yoq");
  let result = "yuborildi";
  try {
    const provider = await getEmailProvider();
    if (provider.name === "mock") result = "ulanmagan";
    else
      await provider.send({
        to: me.email,
        subject: `${siteConfig.name}: test`,
        text: "Email xizmati ishlayapti. / Email works. / Email работает.",
      });
  } catch (err) {
    console.error("[integrations] test email failed", err);
    result = "xato";
  }
  redirect(`/admin/integratsiyalar?natija=${result}`);
}
