import type { L10n } from "./categories";

/** Akademiya lessons — TZ section 15. Bodies are short starters the editor can expand. */
export const lessons = [
  {
    slug: "maqola-tuzilmasi-imrad",
    summary: "Kirish, usullar, natijalar, muhokama.",
    title: "Maqola tuzilmasi: IMRAD",
    durationMin: 10,
    body: "Ilmiy maqola odatda IMRAD tuzilmasiga amal qiladi: **Kirish** (muammo va tadqiqot savoli), **Usullar** (nima va qanday qilindi), **Natijalar** (nima topildi), **Muhokama** (natijalar nimani anglatadi) va **Xulosa**. Har bir bo‘lim o‘z vazifasini bajaradi: o‘quvchi kerakli ma’lumotni tez topishi kerak.",
    exercise: "O‘z mavzuingiz bo‘yicha har bir IMRAD bo‘limi uchun bitta jumla yozing.",
  },
  {
    slug: "mavzu-va-tadqiqot-savoli",
    summary: "Keng mavzudan aniq savolga.",
    title: "Mavzu va tadqiqot savoli",
    durationMin: 12,
    body: "Keng mavzu (masalan, “suv tejash”) tadqiqot uchun yaroqsiz. Uni tekshiriladigan savolga toraytiring: kim, qayerda, qaysi davrda, nimani o‘lchaysiz. Yaxshi savol bitta jumlada aytiladi va unga ma’lumot bilan javob berish mumkin.",
    exercise: "Keng mavzuingizni uch bosqichda toraytirib, yakuniy tadqiqot savolini yozing.",
  },
  {
    slug: "manbalar-va-iqtibos-apa-7",
    summary: "Ishonchli manba, to‘g‘ri havola, plagiatsiz.",
    title: "Manbalar va iqtibos (APA 7)",
    durationMin: 15,
    body: "Ishonchli manba — taqrizdan o‘tgan jurnal maqolasi, rasmiy statistika yoki ilmiy kitob. Har bir iqtibos matnda (Muallif, yil) ko‘rinishida va adabiyotlar ro‘yxatida to‘liq beriladi. Boshqa muallifning fikrini havolasiz keltirish plagiat hisoblanadi.",
    exercise: "Mavzuingiz bo‘yicha uchta manbani APA 7 formatida yozing.",
  },
  {
    slug: "annotatsiya-va-kalit-sozlar",
    summary: "Maqolangiz Google’da topilishi uchun.",
    title: "Annotatsiya va kalit so‘zlar",
    durationMin: 8,
    body: "Annotatsiya 150–250 so‘zda maqsad, usul, asosiy natija va xulosani beradi. Kalit so‘zlar (5–7 ta) — odamlar qidiruvda yozadigan so‘zlar. Ular maqolangizning Google’da topilishiga yordam beradi.",
    exercise:
      "Maqolangiz uchun 5 ta kalit so‘z tanlang va annotatsiyaning birinchi jumlasini yozing.",
  },
  {
    slug: "jadval-va-rasmlar",
    summary: "Imzo, raqamlash, manba ko‘rsatish.",
    title: "Jadval va rasmlar",
    durationMin: 8,
    body: "Har bir jadval va rasm raqamlanadi, imzoga ega bo‘ladi va matnda unga havola beriladi. Boshqa manbadan olingan rasm ostida manba ko‘rsatiladi.",
    exercise: "Natijalaringizdan bittasini jadval ko‘rinishida tayyorlang va imzo yozing.",
  },
  {
    slug: "taqrizchiga-javob-yozish",
    summary: "Izohlarga aniq va xushmuomala javob.",
    title: "Taqrizchiga javob yozish",
    durationMin: 10,
    body: "Taqrizchining har bir izohiga alohida, xushmuomala va aniq javob bering: nima o‘zgartirildi va qayerda. Rozi bo‘lmasangiz, sababini dalil bilan tushuntiring.",
    exercise: "Namuna izohga ikki jumlali javob yozing.",
  },
];

const PLACEHOLDER: L10n = {
  uz: "[Matn buyurtmachidan keladi]",
  ru: "[Текст будет предоставлен заказчиком]",
  en: "[Text to be provided by the customer]",
};

/** Static pages — texts come from the customer (TZ section 17). */
const PAGE_TITLES: { slug: string; title: L10n }[] = [
  {
    slug: "biz-haqimizda",
    title: { uz: "Jurnal haqida", ru: "О журнале", en: "About the journal" },
  },
  {
    slug: "tahrir-hayati",
    title: { uz: "Tahrir hay’ati", ru: "Редакционная коллегия", en: "Editorial board" },
  },
  {
    slug: "nashr-siyosati",
    title: {
      uz: "Nashr siyosati va etika",
      ru: "Издательская политика и этика",
      en: "Publication policy and ethics",
    },
  },
  { slug: "mualliflarga", title: { uz: "Mualliflarga", ru: "Авторам", en: "For authors" } },
  { slug: "narxlar", title: { uz: "Narxlar", ru: "Цены", en: "Pricing" } },
  { slug: "savollar", title: { uz: "Savollar", ru: "Вопросы", en: "FAQ" } },
  { slug: "oferta", title: { uz: "Ommaviy oferta", ru: "Публичная оферта", en: "Public offer" } },
  {
    slug: "maxfiylik",
    title: { uz: "Maxfiylik siyosati", ru: "Политика конфиденциальности", en: "Privacy policy" },
  },
];

/** TZ 10.2: the publication policy states the rule on AI use. */
const AI_POLICY: L10n = {
  uz: `## Sun’iy intellektdan foydalanish

- Mualliflar Xorazmiy AI va boshqa AI vositalaridan reja tuzish, tahrir, manba qidirish va faktlarni tekshirish uchun foydalanishi mumkin.
- Maqola matni, ma’lumotlar, natijalar va xulosalar uchun to‘liq javobgarlik muallifda. AI muallif yoki hammuallif bo‘la olmaydi.
- AI yozib bergan bo‘limni o‘z ishi sifatida taqdim etish, AI o‘ylab topgan manba yoki ma’lumotni keltirish taqiqlanadi.
- Platformada qaysi AI funksiyalaridan foydalanilgani maqola ma’lumotlarida saqlanadi va taqrizchiga ko‘rinadi. Boshqa AI vositalaridan foydalanilgan bo‘lsa, muallif buni “Materiallar va usullar” bo‘limida ko‘rsatadi.
- Taqrizchilar maqola matnini tashqi AI xizmatlariga yuklamaydi.`,
  ru: `## Использование искусственного интеллекта

- Авторы могут использовать Xorazmiy AI и другие инструменты ИИ для составления плана, редактуры, поиска источников и проверки фактов.
- Полную ответственность за текст, данные, результаты и выводы несёт автор. ИИ не может быть автором или соавтором.
- Запрещено выдавать раздел, написанный ИИ, за свою работу и приводить источники или данные, выдуманные ИИ.
- Какие функции ИИ платформы использовались, сохраняется в данных статьи и видно рецензенту. Об использовании других инструментов ИИ автор сообщает в разделе «Материалы и методы».
- Рецензенты не загружают текст статьи во внешние сервисы ИИ.`,
  en: `## Use of artificial intelligence

- Authors may use Xorazmiy AI and other AI tools to outline, edit, find sources and check facts.
- The author is fully responsible for the text, data, results and conclusions. AI cannot be an author or co-author.
- Presenting a section written by AI as one’s own work, or citing sources or data invented by AI, is not allowed.
- Which platform AI features were used is stored with the article and shown to the reviewer. Use of other AI tools is disclosed by the author in “Materials and methods”.
- Reviewers do not upload the manuscript to external AI services.`,
};

export const pages = PAGE_TITLES.map((p) => ({
  ...p,
  body:
    p.slug === "nashr-siyosati"
      ? {
          uz: `${PLACEHOLDER.uz}\n\n${AI_POLICY.uz}`,
          ru: `${PLACEHOLDER.ru}\n\n${AI_POLICY.ru}`,
          en: `${PLACEHOLDER.en}\n\n${AI_POLICY.en}`,
        }
      : PLACEHOLDER,
}));
