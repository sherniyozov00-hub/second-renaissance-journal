import type { L10n } from "./categories";

/**
 * Akademiya lessons — TZ section 15: text, an example ("namuna") and an
 * exercise for practice with Xorazmiy AI. Editors expand them in Admin →
 * Akademiya; the seed only creates missing lessons.
 */
export const lessons = [
  {
    slug: "maqola-tuzilmasi-imrad",
    summary: "Kirish, usullar, natijalar, muhokama.",
    title: "Maqola tuzilmasi: IMRAD",
    durationMin: 10,
    body: `Ilmiy maqola odatda **IMRAD** tuzilmasiga amal qiladi. Bu qolip o‘quvchiga kerakli ma’lumotni tez topishga yordam beradi: taqrizchi usullarni, amaliyotchi natijalarni, talaba kirishni o‘qiydi.

## Har bir bo‘limning vazifasi

- **Kirish** — muammo nima uchun muhim, u haqda nima ma’lum, nima hali o‘rganilmagan va sizning tadqiqot savolingiz.
- **Materiallar va usullar** — nima, qayerda, qachon va qanday qilindi; boshqa tadqiqotchi tajribani takrorlay olishi kerak.
- **Natijalar** — nima topildi: raqamlar, jadvallar, rasmlar. Talqin yo‘q.
- **Muhokama** — natijalar nimani anglatadi, boshqa tadqiqotlar bilan qanday solishtiriladi, cheklovlar.
- **Xulosa** — tadqiqot savoliga qisqa javob va tavsiyalar.

## Tez-tez uchraydigan xatolar

- Natijalar bo‘limida izoh berish (“bu shuni ko‘rsatadiki…”) — bu Muhokamaga tegishli.
- Usullarda namuna hajmi va statistik usulni yozmaslik.
- Xulosada yangi ma’lumot keltirish.`,
    example: `Mavzu: “Tomchilatib sug‘orishning paxta hosildorligiga ta’siri”.
- **Kirish:** Suv tanqisligi sharoitida sug‘orish usuli fermer daromadini belgilaydi; kichik xo‘jaliklar uchun ma’lumot kam.
- **Usullar:** 2025-yil mavsumida ikki xo‘jalikda bir xil nav va tuproqda tomchilatib va egat usuli solishtirildi.
- **Natijalar:** Hosildorlik va suv sarfi 1- va 2-jadvalda.
- **Muhokama:** Natijalar xalqaro tadqiqotlar bilan solishtiriladi, bir mavsum — cheklov.
- **Xulosa:** Tomchilatib sug‘orish kichik xo‘jaliklar uchun iqtisodiy jihatdan o‘zini oqlaydi.`,
    exercise: "O‘z mavzuingiz bo‘yicha har bir IMRAD bo‘limi uchun bitta jumla yozing.",
  },
  {
    slug: "mavzu-va-tadqiqot-savoli",
    summary: "Keng mavzudan aniq savolga.",
    title: "Mavzu va tadqiqot savoli",
    durationMin: 12,
    body: `Keng mavzu (masalan, “suv tejash”) tadqiqot uchun yaroqsiz: unga bitta maqolada javob berib bo‘lmaydi. Uni **tekshiriladigan savolga** toraytiring.

## Toraytirish uchun to‘rt savol

- **Kim yoki nima?** — ob’ekt: paxta, maktab o‘quvchilari, kichik korxonalar.
- **Qayerda?** — hudud: Sirdaryo viloyati, Toshkent shahri.
- **Qachon?** — davr: 2020–2025-yillar, bir mavsum.
- **Nimani o‘lchaysiz?** — ko‘rsatkich: hosildorlik (s/ga), suv sarfi (m³/ga), test bali.

## Yaxshi savol belgilari

- Bitta jumlada aytiladi.
- Unga ma’lumot bilan javob berish mumkin.
- Javob hali ma’lum emas yoki bahsli.`,
    example: `Keng mavzu: “Suv tejash”.
- 1-qadam: “Qishloq xo‘jaligida suv tejash”.
- 2-qadam: “Paxtachilikda tomchilatib sug‘orish”.
- Yakuniy savol: “Sirdaryo viloyatining o‘tloqi-bo‘z tuproqlarida tomchilatib sug‘orish egat usuliga nisbatan paxta hosildorligi va suv sarfini qanday o‘zgartiradi?”`,
    exercise: "Keng mavzuingizni uch bosqichda toraytirib, yakuniy tadqiqot savolini yozing.",
  },
  {
    slug: "manbalar-va-iqtibos-apa-7",
    summary: "Ishonchli manba, to‘g‘ri havola, plagiatsiz.",
    title: "Manbalar va iqtibos (APA 7)",
    durationMin: 15,
    body: `Ishonchli manba — taqrizdan o‘tgan jurnal maqolasi, rasmiy statistika (stat.uz, FAO, Jahon banki) yoki ilmiy kitob. Wikipedia va bloglar boshlang‘ich nuqta bo‘lishi mumkin, lekin iqtibos uchun asl manbani toping.

## Matndagi havola (APA 7)

- Bir muallif: (Karimov, 2021) yoki Karimov (2021) ta’kidlaganidek…
- Ikki muallif: (Karimov va Aliyeva, 2020).
- Uch va undan ko‘p: (Karimov va boshq., 2019).

## Adabiyotlar ro‘yxatida

Familiya, I. (Yil). Maqola nomi. Jurnal nomi, jild(son), betlar. https://doi.org/…

## Plagiatdan qochish

- Boshqa muallifning fikrini o‘z so‘zlaringiz bilan bering va havola qo‘ying.
- So‘zma-so‘z iqtibos — qo‘shtirnoqda va bet raqami bilan.
- Har bir raqam va da’vo manbaga ega bo‘lsin.`,
    example: `Matnda: “Tomchilatib sug‘orish suv sarfini 30–50 % kamaytiradi (Karimov va boshq., 2021).”
Ro‘yxatda: Karimov, B., Aliyeva, D., & Smith, J. (2021). Drip irrigation and cotton yield in Central Asia. Agricultural Water Management, 245, 106–115. https://doi.org/10.xxxx/xxxxx`,
    exercise: "Mavzuingiz bo‘yicha uchta manbani APA 7 formatida yozing.",
  },
  {
    slug: "annotatsiya-va-kalit-sozlar",
    summary: "Maqolangiz Google’da topilishi uchun.",
    title: "Annotatsiya va kalit so‘zlar",
    durationMin: 8,
    body: `Annotatsiya — maqolaning eng ko‘p o‘qiladigan qismi. Ko‘p o‘quvchi faqat uni o‘qib, maqolani ochish-ochmaslikni hal qiladi.

## Annotatsiya (150–250 so‘z)

- **Maqsad** — bitta jumla.
- **Usul** — qayerda, qanday ma’lumot, qanday tahlil.
- **Asosiy natija** — raqam bilan.
- **Xulosa** — natija nimani anglatadi.

## Kalit so‘zlar (5–7 ta)

- Odamlar qidiruvda yozadigan atamalar.
- Sarlavhadagi so‘zlarni takrorlamang — ular allaqachon indekslanadi.
- Ham umumiy (sug‘orish), ham aniq (tomchilatib sug‘orish) atamalar.`,
    example: `Annotatsiyaning birinchi jumlasi: “Tadqiqotda Sirdaryo viloyatida tomchilatib sug‘orishning paxta hosildorligi va suv sarfiga ta’siri baholandi.”
Kalit so‘zlar: suv tejash, sug‘orish usullari, paxtachilik, kichik fermer xo‘jaliklari, iqtisodiy samaradorlik.`,
    exercise:
      "Maqolangiz uchun 5 ta kalit so‘z tanlang va annotatsiyaning birinchi jumlasini yozing.",
  },
  {
    slug: "jadval-va-rasmlar",
    summary: "Imzo, raqamlash, manba ko‘rsatish.",
    title: "Jadval va rasmlar",
    durationMin: 8,
    body: `Jadval aniq raqamlarni, rasm (grafik) esa tendensiya va solishtirishni ko‘rsatadi. Bir ma’lumotni ham jadval, ham grafikda takrorlamang.

## Qoidalar

- Har biri raqamlanadi: 1-jadval, 2-jadval; 1-rasm, 2-rasm.
- **Jadval imzosi tepada**, rasm imzosi pastda.
- Matnda har biriga havola bor: “(1-jadval)”.
- O‘lchov birliklari ustun sarlavhasida.
- Boshqa manbadan olingan rasm ostida manba ko‘rsatiladi.`,
    example: `1-jadval. Sug‘orish usuli bo‘yicha paxta hosildorligi va suv sarfi (2025-yil)
- Ustunlar: Usul | Hosildorlik, s/ga | Suv sarfi, m³/ga
- Manba: muallif ma’lumotlari.`,
    exercise: "Natijalaringizdan bittasini jadval ko‘rinishida tayyorlang va imzo yozing.",
  },
  {
    slug: "taqrizchiga-javob-yozish",
    summary: "Izohlarga aniq va xushmuomala javob.",
    title: "Taqrizchiga javob yozish",
    durationMin: 10,
    body: `Taqriz — maqolani yaxshilash imkoniyati. Javob xati taqrizchining ishini osonlashtirsin.

## Tuzilma

- Qisqa minnatdorlik.
- Har bir izoh alohida: izohning o‘zi → sizning javobingiz → matnda nima va qayerda o‘zgardi (bo‘lim, bet).
- Rozi bo‘lmasangiz — sababini dalil va manba bilan, xushmuomala tushuntiring.

## Qilmang

- Izohni e’tiborsiz qoldirmang.
- “Taqrizchi noto‘g‘ri tushungan” demang — matnni aniqroq qiling.`,
    example: `Izoh: “Usullarda namuna hajmi ko‘rsatilmagan.”
Javob: “Rahmat. 2.1-bo‘limga namuna hajmi (n = 48 maydon) va tanlash usuli qo‘shildi (4-bet).”`,
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
  {
    slug: "tanlovlar",
    title: { uz: "Tanlovlar va grantlar", ru: "Конкурсы и гранты", en: "Contests and grants" },
  },
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

/** Simple contests page (stage 7): the editors replace the dates and prizes. */
const CONTESTS: L10n = {
  uz: `Jurnal yosh olimlar uchun maqola tanlovlarini o‘tkazadi. Har bir tanlov e’loni shu sahifada va Telegram-botda chiqadi.

## Yilning eng yaxshi talaba maqolasi

- Kim qatnashadi: bakalavr va magistr talabalari, yosh tadqiqotchilar.
- Qanday: jurnalga odatdagidek maqola yuboring; tahrir hay’ati yil davomida nashr qilingan maqolalar orasidan g‘oliblarni tanlaydi.
- Baholash: dolzarblik, usul, natijalar, ilmiy til va iqtiboslar (taqriz mezonlari).
- Muddat va mukofotlar: [MUDDAT], [MUKOFOTLAR].

## Homiylar tanlovlari

Tashkilotlar o‘z sohasi bo‘yicha mavzuli tanlov e’lon qilishi mumkin. Taklif uchun: [EMAIL].`,
  ru: `Журнал проводит конкурсы статей для молодых учёных. Объявления публикуются на этой странице и в Telegram-боте.

## Лучшая студенческая статья года

- Участники: студенты бакалавриата и магистратуры, молодые исследователи.
- Как участвовать: отправьте статью в журнал как обычно; редколлегия выбирает победителей среди опубликованных за год статей.
- Критерии: актуальность, метод, результаты, научный язык и цитирование (критерии рецензии).
- Сроки и призы: [СРОКИ], [ПРИЗЫ].

## Конкурсы спонсоров

Организации могут объявить тематический конкурс по своей области. Предложения: [EMAIL].`,
  en: `The journal runs article contests for young researchers. Announcements appear on this page and in the Telegram bot.

## Best student article of the year

- Who: bachelor's and master's students, early-career researchers.
- How: submit your article to the journal as usual; the editorial board chooses the winners among the articles published during the year.
- Criteria: relevance, method, results, academic language and citations (the review criteria).
- Dates and prizes: [DATES], [PRIZES].

## Sponsor contests

Organisations can announce a themed contest in their field. Proposals: [EMAIL].`,
};

export const pages = PAGE_TITLES.map((p) => ({
  ...p,
  body:
    p.slug === "tanlovlar"
      ? CONTESTS
      : p.slug === "nashr-siyosati"
        ? {
            uz: `${PLACEHOLDER.uz}\n\n${AI_POLICY.uz}`,
            ru: `${PLACEHOLDER.ru}\n\n${AI_POLICY.ru}`,
            en: `${PLACEHOLDER.en}\n\n${AI_POLICY.en}`,
          }
        : PLACEHOLDER,
}));
