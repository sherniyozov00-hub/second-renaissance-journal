import type { ArticleStatus, Locale } from "@/generated/prisma/client";

/**
 * Texts of email and Telegram notifications (TZ 14): status changes, editor
 * notes, payment confirmation, publication. Pure — unit tested.
 */
export type NotifyEvent =
  | { kind: "status"; status: ArticleStatus; title: string; number: number; note?: string | null }
  | { kind: "comment"; title: string; number: number; body: string }
  | { kind: "paid"; title: string; number: number; amount: number }
  | { kind: "published"; title: string; url: string; certificateUrl?: string }
  | { kind: "issue"; year: number; number: number; count: number; url: string }
  | { kind: "premium"; until: string };

type Text = { subject: string; text: string };

const STATUS: Record<Locale, Partial<Record<ArticleStatus, string>>> = {
  uz: {
    AWAITING_PAYMENT: "to‘lov kutilmoqda",
    UNDER_REVIEW: "taqrizga yuborildi",
    REVISION_REQUESTED: "tuzatish kerak",
    ACCEPTED: "qabul qilindi",
    PUBLISHED: "nashr qilindi",
    REJECTED: "rad etildi",
  },
  ru: {
    AWAITING_PAYMENT: "ожидает оплаты",
    UNDER_REVIEW: "отправлена на рецензию",
    REVISION_REQUESTED: "нужна доработка",
    ACCEPTED: "принята",
    PUBLISHED: "опубликована",
    REJECTED: "отклонена",
  },
  en: {
    AWAITING_PAYMENT: "awaiting payment",
    UNDER_REVIEW: "sent for review",
    REVISION_REQUESTED: "revision requested",
    ACCEPTED: "accepted",
    PUBLISHED: "published",
    REJECTED: "rejected",
  },
};

const num = (n: number) => `#${String(n).padStart(4, "0")}`;

export function renderNotification(e: NotifyEvent, locale: Locale = "uz"): Text {
  const l = locale;
  switch (e.kind) {
    case "status": {
      const s = STATUS[l][e.status] ?? e.status;
      const subject = {
        uz: `Maqola ${num(e.number)}: ${s}`,
        ru: `Статья ${num(e.number)}: ${s}`,
        en: `Article ${num(e.number)}: ${s}`,
      }[l];
      const lead = {
        uz: "Maqolangiz holati o‘zgardi",
        ru: "Статус вашей статьи изменился",
        en: "Your article status changed",
      }[l];
      const noteLabel = { uz: "Izoh", ru: "Комментарий", en: "Note" }[l];
      return {
        subject,
        text: [`${lead}: «${e.title}» — ${s}.`, e.note ? `${noteLabel}: ${e.note}` : null]
          .filter(Boolean)
          .join("\n\n"),
      };
    }
    case "comment": {
      const subject = {
        uz: `Maqola ${num(e.number)}: muharrir izohi`,
        ru: `Статья ${num(e.number)}: комментарий редактора`,
        en: `Article ${num(e.number)}: editor’s note`,
      }[l];
      return { subject, text: `«${e.title}»\n\n${e.body}` };
    }
    case "paid": {
      const subject = {
        uz: `To‘lov qabul qilindi — ${num(e.number)}`,
        ru: `Оплата получена — ${num(e.number)}`,
        en: `Payment received — ${num(e.number)}`,
      }[l];
      const text = {
        uz: `«${e.title}» uchun ${e.amount.toLocaleString("ru-RU")} so‘m to‘lov qabul qilindi. Maqola taqrizga yuborildi.`,
        ru: `Оплата ${e.amount.toLocaleString("ru-RU")} сум за «${e.title}» получена. Статья отправлена на рецензию.`,
        en: `We received ${e.amount.toLocaleString("en-US")} UZS for “${e.title}”. The article has been sent for review.`,
      }[l];
      return { subject, text };
    }
    case "premium": {
      const subject = {
        uz: "Premium faollashdi",
        ru: "Premium активирован",
        en: "Premium is active",
      }[l];
      const text = {
        uz: `Xorazmiy AI Premium ${e.until} gacha faol. Kabinet → “Xorazmiy AI bilan yozish”.`,
        ru: `Xorazmiy AI Premium активен до ${e.until}. Кабинет → «Писать с Xorazmiy AI».`,
        en: `Xorazmiy AI Premium is active until ${e.until}. Cabinet → “Write with Xorazmiy AI”.`,
      }[l];
      return { subject, text };
    }
    case "published": {
      const subject = {
        uz: "Maqolangiz nashr qilindi",
        ru: "Ваша статья опубликована",
        en: "Your article has been published",
      }[l];
      const lines = [
        {
          uz: `«${e.title}» nashr qilindi: ${e.url}`,
          ru: `«${e.title}» опубликована: ${e.url}`,
          en: `“${e.title}” is published: ${e.url}`,
        }[l],
        e.certificateUrl
          ? {
              uz: `Sertifikat: ${e.certificateUrl}`,
              ru: `Сертификат: ${e.certificateUrl}`,
              en: `Certificate: ${e.certificateUrl}`,
            }[l]
          : null,
      ];
      return { subject, text: lines.filter(Boolean).join("\n") };
    }
    case "issue": {
      const subject = {
        uz: `Yangi son: ${e.year}-yil, ${e.number}-son`,
        ru: `Новый выпуск: ${e.year}, № ${e.number}`,
        en: `New issue: ${e.year}, No. ${e.number}`,
      }[l];
      const text = {
        uz: `Jurnalning yangi soni chiqdi — ${e.count} ta maqola: ${e.url}`,
        ru: `Вышел новый выпуск журнала — статей: ${e.count}: ${e.url}`,
        en: `A new issue is out with ${e.count} articles: ${e.url}`,
      }[l];
      return { subject, text };
    }
  }
}
