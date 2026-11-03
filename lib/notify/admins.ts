import "server-only";
import { db } from "@/lib/db";
import { getEmailProvider } from "./email";
import { sendTelegram } from "./telegram";

/** Email and Telegram to every editor/admin (or admins only). Never throws. */
export async function notifyStaff(
  subject: string,
  text: string,
  roles: ("ADMIN" | "EDITOR")[] = ["ADMIN", "EDITOR"],
) {
  const staff = await db.user.findMany({
    where: { roles: { hasSome: roles }, isBlocked: false },
    select: { email: true, telegramChatId: true },
  });
  const email = await getEmailProvider();
  const results = await Promise.allSettled(
    staff.flatMap((u) => [
      ...(u.email ? [email.send({ to: u.email, subject, text })] : []),
      ...(u.telegramChatId ? [sendTelegram(u.telegramChatId, `${subject}\n\n${text}`)] : []),
    ]),
  );
  for (const r of results) if (r.status === "rejected") console.error("[notify-staff]", r.reason);
}
