import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sendTelegram } from "@/lib/notify/telegram";

type Update = { message?: { chat?: { id?: number }; text?: string } };

function secretOk(header: string | null) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Telegram bot webhook (TZ 14): "/start <token>" from the cabinet deep link
 * links the chat to the user, after which notifications go to Telegram.
 */
export async function POST(req: NextRequest) {
  if (!secretOk(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const update = (await req.json().catch(() => ({}))) as Update;
  const chatId = update.message?.chat?.id;
  const text = update.message?.text ?? "";
  if (!chatId) return NextResponse.json({ ok: true });

  const token = /^\/start\s+([a-f0-9]{32})$/.exec(text.trim())?.[1];
  if (token) {
    const user = await db.user.findUnique({ where: { telegramLinkToken: token } });
    if (user) {
      await db.user.update({
        where: { id: user.id },
        data: { telegramChatId: String(chatId), telegramLinkToken: null },
      });
      await sendTelegram(
        String(chatId),
        "Hisobingiz ulandi. Maqola holati o‘zgarsa, shu yerga xabar keladi.",
      );
      return NextResponse.json({ ok: true });
    }
  }
  await sendTelegram(
    String(chatId),
    "Ulash uchun saytdagi kabinetingizdan “Telegram-botni ulang” tugmasini bosing.",
  );
  return NextResponse.json({ ok: true });
}
