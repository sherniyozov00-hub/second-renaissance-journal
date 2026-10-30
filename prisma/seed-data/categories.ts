export type L10n = { uz: string; ru: string; en: string };

export type SeedCategory = { slug: string; name: L10n; description: L10n };

/** Initial directions — TZ section 2 table. Admin can edit them later. */
export const categories: SeedCategory[] = [
  {
    slug: "agrotexnologiyalar",
    name: { uz: "Agrotexnologiyalar", ru: "Агротехнологии", en: "Agrotechnology" },
    description: {
      uz: "Sug‘orish, hosildorlik, aqlli fermerlik",
      ru: "Орошение, урожайность, умное фермерство",
      en: "Irrigation, crop yield, smart farming",
    },
  },
  {
    slug: "suniy-intellekt",
    name: { uz: "Sun’iy intellekt", ru: "Искусственный интеллект", en: "Artificial Intelligence" },
    description: {
      uz: "Mashinaviy o‘qitish, NLP",
      ru: "Машинное обучение, NLP",
      en: "Machine learning, NLP",
    },
  },
  {
    slug: "texnologiyalar",
    name: { uz: "Texnologiyalar", ru: "Технологии", en: "Technology" },
    description: {
      uz: "Dasturlash, muhandislik, IoT",
      ru: "Программирование, инженерия, IoT",
      en: "Software, engineering, IoT",
    },
  },
  {
    slug: "startaplar",
    name: { uz: "Startaplar", ru: "Стартапы", en: "Startups" },
    description: {
      uz: "Biznes modellar, venchur",
      ru: "Бизнес-модели, венчур",
      en: "Business models, venture capital",
    },
  },
  {
    slug: "tibbiyot",
    name: { uz: "Tibbiyot", ru: "Медицина", en: "Medicine" },
    description: {
      uz: "Sog‘liqni saqlash, farmatsiya",
      ru: "Здравоохранение, фармация",
      en: "Healthcare, pharmacy",
    },
  },
  {
    slug: "iqtisodiyot",
    name: { uz: "Iqtisodiyot", ru: "Экономика", en: "Economics" },
    description: {
      uz: "Makroiqtisodiyot, mintaqalar",
      ru: "Макроэкономика, регионы",
      en: "Macroeconomics, regions",
    },
  },
  {
    slug: "biznes",
    name: { uz: "Biznes va menejment", ru: "Бизнес и менеджмент", en: "Business and Management" },
    description: {
      uz: "Marketing, boshqaruv",
      ru: "Маркетинг, управление",
      en: "Marketing, management",
    },
  },
  {
    slug: "moliya",
    name: { uz: "Moliya", ru: "Финансы", en: "Finance" },
    description: {
      uz: "Bank, fintex, investitsiya",
      ru: "Банки, финтех, инвестиции",
      en: "Banking, fintech, investment",
    },
  },
  {
    slug: "talim",
    name: { uz: "Ta’lim", ru: "Образование", en: "Education" },
    description: { uz: "Pedagogika, EdTech", ru: "Педагогика, EdTech", en: "Pedagogy, EdTech" },
  },
  {
    slug: "ekologiya",
    name: { uz: "Ekologiya", ru: "Экология", en: "Ecology" },
    description: {
      uz: "Iqlim, suv, chiqindilar",
      ru: "Климат, вода, отходы",
      en: "Climate, water, waste",
    },
  },
  {
    slug: "huquq",
    name: { uz: "Huquq", ru: "Право", en: "Law" },
    description: {
      uz: "Davlat boshqaruvi, qonunchilik",
      ru: "Госуправление, законодательство",
      en: "Public administration, legislation",
    },
  },
  {
    slug: "tarix-madaniyat",
    name: { uz: "Tarix va madaniyat", ru: "История и культура", en: "History and Culture" },
    description: {
      uz: "Meros, sharqshunoslik",
      ru: "Наследие, востоковедение",
      en: "Heritage, Oriental studies",
    },
  },
];
