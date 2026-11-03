/**
 * Admin-editable settings (TZ sections 1.7, 13 and 19). Values the customer
 * has not provided yet are seeded as bracketed placeholders such as "[NARX]";
 * nothing here may be hard-coded elsewhere in the app.
 */

export type SettingValue = string | number | boolean;

export type SettingDefinition = {
  key: string;
  group: "journal" | "contacts" | "pricing" | "payments" | "ai" | "review" | "integrations" | "seo";
  defaultValue: SettingValue;
  description: string;
};

export const SETTINGS: readonly SettingDefinition[] = [
  // Journal
  { key: "journal.issn", group: "journal", defaultValue: "[RAQAM]", description: "ISSN" },
  { key: "site.domain", group: "journal", defaultValue: "[DOMEN]", description: "Public domain" },
  {
    key: "journal.startYear",
    group: "journal",
    defaultValue: 2026,
    description: "First publication year; volume number = year − startYear + 1",
  },

  // Contacts
  { key: "contacts.email", group: "contacts", defaultValue: "[EMAIL]", description: "Email" },
  { key: "contacts.phone", group: "contacts", defaultValue: "[TELEFON]", description: "Phone" },
  {
    key: "contacts.telegramChannel",
    group: "contacts",
    defaultValue: "[KANAL]",
    description: "Telegram channel",
  },

  // Pricing (UZS)
  {
    key: "pricing.publication",
    group: "pricing",
    defaultValue: "[NARX]",
    description: "Publication fee: review, AI check, PDF and certificate",
  },
  {
    key: "pricing.fastTrack",
    group: "pricing",
    defaultValue: "[NARX]",
    description: "Fast-track review surcharge",
  },
  {
    key: "pricing.premium",
    group: "pricing",
    defaultValue: 39990,
    description: "Xorazmiy AI Premium for one month (UZS): writing help and fact checks",
  },
  {
    key: "pricing.refundTerms",
    group: "pricing",
    defaultValue: "[QAYTARISH SHARTLARI]",
    description: "Refund terms shown on rejection and in the offer",
  },

  // Payments
  {
    key: "payments.clickQrId",
    group: "payments",
    defaultValue: "0114800",
    description:
      "Click QR (self-employed) receiver id, e.g. 0114800 from https://indoor.click.uz/pay?id=0114800 — payments confirmed by an admin",
  },
  {
    key: "payments.mode",
    group: "payments",
    defaultValue: "sandbox",
    description: "sandbox | live",
  },
  {
    key: "payments.mxikCode",
    group: "payments",
    defaultValue: "[MXIK KODI]",
    description: "MXIK (IKPU) code for fiscal receipts",
  },
  {
    key: "payments.unitCode",
    group: "payments",
    defaultValue: "[O'LCHOV BIRLIGI KODI]",
    description: "Unit-of-measure code for fiscal receipts",
  },

  // Editorial
  {
    key: "review.deadlineDays",
    group: "review",
    defaultValue: "[MUDDAT]",
    description: "Review deadline in working days",
  },
  {
    key: "requirements.minWords",
    group: "review",
    defaultValue: 3000,
    description: "Minimum article length, words (excluding references)",
  },
  {
    key: "requirements.maxWords",
    group: "review",
    defaultValue: 8000,
    description: "Maximum article length, words",
  },
  {
    key: "requirements.minReferences",
    group: "review",
    defaultValue: 10,
    description: "Minimum number of references",
  },
  {
    key: "requirements.minOriginalityPercent",
    group: "review",
    defaultValue: "[N]",
    description: "Minimum originality, %",
  },

  // Xorazmiy AI
  {
    key: "ai.guestDailyChecks",
    group: "ai",
    defaultValue: 1,
    description: "Free checks per guest per day (IP + device)",
  },
  {
    key: "ai.guestMaxChars",
    group: "ai",
    defaultValue: 1500,
    description: "Max characters per guest check",
  },
  {
    key: "ai.freeMonthlyChecks",
    group: "ai",
    defaultValue: 2,
    description: "Free trial: AI checks per signed-in author per month without Premium",
  },
  {
    key: "ai.premiumArticles",
    group: "ai",
    defaultValue: 4,
    description: "Premium: articles (drafts) an author can work on with AI in 30 days",
  },
  {
    key: "ai.premiumDays",
    group: "ai",
    defaultValue: 30,
    description: "Premium: days one payment lasts",
  },
  {
    key: "ai.authorMaxChars",
    group: "ai",
    defaultValue: 60000,
    description: "Max characters an author sends in one AI request",
  },
  {
    key: "ai.maxClaimsPerCheck",
    group: "ai",
    defaultValue: 20,
    description: "Max claims verified on the web in one fact check (cost cap)",
  },
  {
    key: "ai.requestsPerMinute",
    group: "ai",
    defaultValue: 8,
    description: "Rate limit: AI requests per user (or guest) per minute",
  },
  {
    key: "ai.model",
    group: "ai",
    defaultValue: "claude-opus-5-5",
    description: "Claude model for all Xorazmiy AI features",
  },

  // Integrations
  {
    key: "telegram.botName",
    group: "integrations",
    defaultValue: "[BOT_NOMI]",
    description: "Telegram bot username",
  },

  // SEO / webmaster verification
  {
    key: "seo.googleVerification",
    group: "seo",
    defaultValue: "",
    description: "Google Search Console verification code",
  },
  {
    key: "seo.bingVerification",
    group: "seo",
    defaultValue: "",
    description: "Bing Webmaster verification code",
  },
] as const;

/** True for values the customer still has to provide, e.g. "[NARX]". */
export function isPlaceholder(value: unknown): boolean {
  return typeof value === "string" && /^\[[^\]]+\]$/.test(value.trim());
}

export function getSettingDefinition(key: string): SettingDefinition | undefined {
  return SETTINGS.find((s) => s.key === key);
}
