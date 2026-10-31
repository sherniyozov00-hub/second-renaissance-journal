import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sendTelegram } from "@/lib/notify/telegram";
import { botReply } from "@/lib/telegram/bot";

type Update = {
  message?: { chat?: { id?: number }; text?: string; from?: { language_code?: string } };
};

function secretOk(header: string | null) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Telegram bot webhook (TZ 14): account linking ("/start <token>" from the
 * cabinet deep link) and commands — latest articles, search, issue, lessons,
 * the status of the user's articles. See lib/telegram/bot.ts.
 */
export async function POST(req: NextRequest) {
  if (!secretOk(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const update = (await req.json().catch(() => ({}))) as Update;
  const chatId = update.message?.chat?.id;
  const text = update.message?.text ?? "";
  if (!chatId || !text) return NextResponse.json({ ok: true });
  try {
    await sendTelegram(
      String(chatId),
      await botReply(String(chatId), text, update.message?.from?.language_code),
    );
  } catch (err) {
    console.error("[telegram]", err);
  }
  // Always 200, so Telegram does not retry the same update.
  return NextResponse.json({ ok: true });
}
