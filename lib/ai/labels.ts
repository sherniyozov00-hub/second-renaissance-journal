/** Uzbek names of Xorazmiy AI features, as editors and reviewers see them (TZ 10.2). */
export const AI_FEATURE_LABEL: Record<string, string> = {
  plan: "reja",
  assist: "yozishga yordam",
  edit: "tahrir",
  sources: "xalqaro manbalar",
  factcheck: "fakt tekshiruvi",
  originality: "originallik",
  citations: "iqtiboslar",
  translate: "tarjima",
  chat: "chat",
};

export const aiFeatureList = (features: string[]) =>
  features.map((f) => AI_FEATURE_LABEL[f] ?? f).join(", ");
