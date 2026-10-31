/** Names of Xorazmiy AI features as editors and reviewers see them (TZ 10.2), per panel language. */
const LABELS: Record<string, Record<string, string>> = {
  uz: {
    plan: "reja",
    assist: "yozishga yordam",
    edit: "tahrir",
    sources: "xalqaro manbalar",
    factcheck: "fakt tekshiruvi",
    originality: "originallik",
    citations: "iqtiboslar",
    translate: "tarjima",
    chat: "chat",
  },
  ru: {
    plan: "план",
    assist: "помощь в написании",
    edit: "правки",
    sources: "международные источники",
    factcheck: "проверка фактов",
    originality: "оригинальность",
    citations: "цитаты",
    translate: "перевод",
    chat: "чат",
  },
  en: {
    plan: "outline",
    assist: "writing help",
    edit: "edits",
    sources: "international sources",
    factcheck: "fact check",
    originality: "originality",
    citations: "citations",
    translate: "translation",
    chat: "chat",
  },
};

export const AI_FEATURE_LABEL = LABELS.uz!;

export const aiFeatureList = (features: string[], locale = "uz") =>
  features.map((f) => (LABELS[locale] ?? LABELS.uz!)[f] ?? f).join(", ");
