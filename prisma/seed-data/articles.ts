/**
 * Sample (seed) articles. Titles and authors follow the approved screens
 * (TZ section 12.3). Bodies are illustrative placeholders, not real research;
 * affiliations stay "[Muassasa nomi]" exactly as in the screens.
 */

export type SeedAuthor = {
  slug: string;
  fullName: string;
  position?: string;
};

export type SeedArticle = {
  titleUz: string;
  titleEn: string;
  titleRu?: string;
  abstractUz: string;
  abstractEn: string;
  abstractRu?: string;
  keywords: string[];
  category: string;
  type: "RESEARCH" | "REVIEW" | "CASE_STUDY" | "POPULAR";
  status:
    | "PUBLISHED"
    | "UNDER_REVIEW"
    | "REVISION_REQUESTED"
    | "AWAITING_PAYMENT"
    | "ACCEPTED"
    | "REJECTED";
  /** Author slugs, in order. The first author is the corresponding author. */
  authors: string[];
  /** ISO date; only for published articles. */
  publishedAt?: string;
  pages?: [number, number];
  intro: string;
  methods: string;
};

export const authors: SeedAuthor[] = [
  { slug: "aziza-karimova", fullName: "Aziza Karimova", position: "3-kurs" },
  { slug: "bekzod-rahimov", fullName: "Bekzod Rahimov", position: "Magistrant" },
  { slug: "dilnoza-yusupova", fullName: "Dilnoza Yusupova", position: "Magistrant" },
  { slug: "jasur-toshmatov", fullName: "Jasur Toshmatov", position: "4-kurs" },
  { slug: "madina-ergasheva", fullName: "Madina Ergasheva", position: "Ordinator" },
  { slug: "sardor-aliyev", fullName: "Sardor Aliyev", position: "3-kurs" },
  { slug: "kamola-yoldosheva", fullName: "Kamola Yo‘ldosheva", position: "2-kurs" },
  { slug: "otabek-qodirov", fullName: "Otabek Qodirov", position: "Magistrant" },
  { slug: "laylo-hamidova", fullName: "Laylo Hamidova", position: "Tayanch doktorant" },
  { slug: "rustam-ismoilov", fullName: "Rustam Ismoilov", position: "4-kurs" },
  { slug: "nodira-saidova", fullName: "Nodira Saidova", position: "Magistrant" },
  { slug: "shahzod-mirzayev", fullName: "Shahzod Mirzayev", position: "3-kurs" },
  { slug: "zarina-abdullayeva", fullName: "Zarina Abdullayeva", position: "Magistrant" },
];

export const articles: SeedArticle[] = [
  {
    titleUz: "Farg‘ona vodiysida tomchilatib sug‘orishning paxta hosildorligiga ta’siri",
    titleEn: "The effect of drip irrigation on cotton yield in the Fergana Valley",
    titleRu: "Влияние капельного орошения на урожайность хлопка в Ферганской долине",
    abstractUz:
      "Tadqiqotda Farg‘ona vodiysidagi ikki fermer xo‘jaligida an’anaviy egat usuli va tomchilatib sug‘orish ikki mavsum davomida taqqoslandi. Suv sarfi, paxta hosildorligi va sug‘orish tizimini o‘rnatishning qoplanish muddati baholandi. Natijalar kichik xo‘jaliklar uchun tomchilatib sug‘orishga o‘tishning amaliy shartlarini ko‘rsatadi.",
    abstractEn:
      "The study compares traditional furrow irrigation and drip irrigation on two farms in the Fergana Valley over two seasons. Water use, cotton yield and the payback period of the irrigation system were assessed. The results outline practical conditions for small farms switching to drip irrigation.",
    abstractRu:
      "В исследовании сравниваются традиционный бороздковый полив и капельное орошение в двух фермерских хозяйствах Ферганской долины в течение двух сезонов. Оценены расход воды, урожайность хлопка и срок окупаемости системы.",
    keywords: [
      "agrotexnologiya",
      "tomchilatib sug‘orish",
      "paxta",
      "suv tejash",
      "Farg‘ona vodiysi",
    ],
    category: "agrotexnologiyalar",
    type: "RESEARCH",
    status: "PUBLISHED",
    authors: ["aziza-karimova", "bekzod-rahimov"],
    publishedAt: "2026-10-20",
    pages: [3, 12],
    intro:
      "O‘zbekistonda qishloq xo‘jaligi suv resurslarining asosiy iste’molchisi hisoblanadi. Suv tanqisligi kuchayib borayotgan sharoitda sug‘orish usulini tanlash fermerning daromadiga ham, mintaqaning suv balansiga ham bevosita ta’sir qiladi.",
    methods:
      "Tajriba ikki xo‘jalikda, bir xil tuproq tipi va paxta navi bilan o‘tkazildi. Har bir maydonda suv hisoblagichlar o‘rnatildi, hosil terim davrida tortib o‘lchandi.",
  },
  {
    titleUz: "O‘zbek tilidagi matnlarni transformer modellari bilan tasniflash",
    titleEn: "Classifying Uzbek-language texts with transformer models",
    abstractUz:
      "Maqolada o‘zbek tilidagi yangilik matnlarini mavzular bo‘yicha tasniflash uchun ko‘p tilli transformer modellari sinovdan o‘tkaziladi. Lotin va kirill yozuvidagi matnlar uchun oldindan ishlov berish bosqichlari va ularning aniqlikka ta’siri tahlil qilinadi.",
    abstractEn:
      "The paper evaluates multilingual transformer models for topic classification of Uzbek news texts. Pre-processing steps for Latin and Cyrillic script and their effect on accuracy are analysed.",
    keywords: ["sun’iy intellekt", "NLP", "transformer", "o‘zbek tili", "matn tasnifi"],
    category: "suniy-intellekt",
    type: "RESEARCH",
    status: "PUBLISHED",
    authors: ["dilnoza-yusupova"],
    publishedAt: "2026-10-18",
    pages: [13, 22],
    intro:
      "Kam resursli tillar uchun matnni avtomatik tasniflash hali ham dolzarb muammo bo‘lib qolmoqda. O‘zbek tilida ikki yozuvning parallel qo‘llanishi vazifani yanada murakkablashtiradi.",
    methods:
      "Ochiq manbalardan yig‘ilgan yangilik matnlari korpusi tayyorlandi va bir nechta model bir xil sharoitda o‘qitildi va baholandi.",
  },
  {
    titleUz: "IT-startaplarni dastlabki bosqichda moliyalashtirish manbalari",
    titleEn: "Early-stage funding sources for IT startups",
    abstractUz:
      "Tadqiqot O‘zbekistondagi IT-startaplar dastlabki bosqichda foydalanadigan moliyalashtirish manbalarini ko‘rib chiqadi: shaxsiy jamg‘arma, grantlar, akselerator dasturlari va biznes-farishtalar. Asoschilar bilan suhbatlar asosida har bir manbaning afzallik va cheklovlari tavsiflanadi.",
    abstractEn:
      "The study reviews funding sources used by early-stage IT startups in Uzbekistan: personal savings, grants, accelerator programmes and business angels, based on interviews with founders.",
    keywords: ["startap", "venchur", "moliyalashtirish", "akselerator", "IT"],
    category: "startaplar",
    type: "RESEARCH",
    status: "PUBLISHED",
    authors: ["jasur-toshmatov"],
    publishedAt: "2026-10-16",
    pages: [23, 31],
    intro:
      "Startap ekotizimining rivojlanishi ko‘p jihatdan loyihalar g‘oya bosqichida qanday mablag‘ topishiga bog‘liq.",
    methods: "Yarim tuzilmali suhbatlar o‘tkazildi, javoblar mavzuli tahlil usuli bilan kodlandi.",
  },
  {
    titleUz: "Qishloq aholisida qandli diabetni erta aniqlash usullari",
    titleEn: "Methods for early detection of diabetes in rural populations",
    abstractUz:
      "Adabiyotlar sharhida qishloq joylarida qandli diabetni erta aniqlashning arzon va amaliy usullari ko‘rib chiqiladi: skrining so‘rovnomalari, kapillyar qon tahlili va mobil sog‘liqni saqlash yechimlari.",
    abstractEn:
      "This literature review examines low-cost, practical methods for early detection of diabetes in rural areas: screening questionnaires, capillary blood tests and mobile health solutions.",
    keywords: ["tibbiyot", "qandli diabet", "skrining", "qishloq aholisi", "profilaktika"],
    category: "tibbiyot",
    type: "REVIEW",
    status: "PUBLISHED",
    authors: ["madina-ergasheva"],
    publishedAt: "2026-10-14",
    pages: [32, 40],
    intro:
      "Kasallikni erta aniqlash asoratlarning oldini olish va davolash xarajatlarini kamaytirishda muhim ahamiyatga ega.",
    methods:
      "Xalqaro ma’lumotlar bazalaridan tanlangan nashrlar oldindan belgilangan mezonlar asosida tahlil qilindi.",
  },
  {
    titleUz: "Raqamli to‘lov tizimlarining kichik biznes aylanmasiga ta’siri",
    titleEn: "The impact of digital payment systems on small business turnover",
    abstractUz:
      "Maqolada raqamli to‘lov tizimlarini joriy etgan kichik savdo korxonalarining aylanmasi va mijozlar oqimidagi o‘zgarishlar o‘rganiladi. So‘rovnoma natijalari asosida joriy etishga to‘sqinlik qiluvchi omillar aniqlanadi.",
    abstractEn:
      "The paper studies changes in turnover and customer flow in small retail businesses after adopting digital payment systems, and identifies barriers to adoption based on a survey.",
    keywords: ["moliya", "fintex", "raqamli to‘lov", "kichik biznes", "aylanma"],
    category: "moliya",
    type: "RESEARCH",
    status: "PUBLISHED",
    authors: ["sardor-aliyev"],
    publishedAt: "2026-10-12",
    pages: [41, 49],
    intro:
      "Naqd pulsiz hisob-kitoblarning kengayishi kichik biznes uchun ham imkoniyat, ham yangi xarajatlar demakdir.",
    methods:
      "Kichik savdo korxonalari egalari orasida so‘rovnoma o‘tkazildi va natijalar statistik usullar bilan tahlil qilindi.",
  },
  {
    titleUz: "Maishiy chiqindilarni saralashga aholining munosabati",
    titleEn: "Public attitudes towards household waste sorting",
    abstractUz:
      "Tadqiqot shahar aholisining maishiy chiqindilarni saralashga munosabatini va bunga ta’sir qiluvchi omillarni o‘rganadi. Infratuzilma, xabardorlik va rag‘batlantirish choralarining o‘rni tahlil qilinadi.",
    abstractEn:
      "The study examines urban residents’ attitudes to household waste sorting and the factors that shape them, including infrastructure, awareness and incentives.",
    keywords: ["ekologiya", "chiqindilar", "saralash", "aholi xulqi", "shahar"],
    category: "ekologiya",
    type: "RESEARCH",
    status: "PUBLISHED",
    authors: ["kamola-yoldosheva"],
    publishedAt: "2026-10-10",
    pages: [50, 57],
    intro:
      "Chiqindilarni manbada saralash qayta ishlash samaradorligini oshirishning eng arzon yo‘llaridan biridir.",
    methods: "Turli tumanlarda yashovchi aholi o‘rtasida so‘rovnoma va kuzatuv o‘tkazildi.",
  },
  {
    titleUz: "Issiqxonalarda IoT sensorlari bilan namlikni boshqarish",
    titleEn: "Humidity control in greenhouses with IoT sensors",
    abstractUz:
      "Maqolada arzon sensorlar asosidagi issiqxona namligini monitoring qilish va boshqarish tizimi taklif qilinadi. Tizim prototipi kichik issiqxonada sinovdan o‘tkazildi.",
    abstractEn:
      "The paper proposes a low-cost sensor-based system for monitoring and controlling greenhouse humidity. A prototype was tested in a small greenhouse.",
    keywords: ["agrotexnologiya", "IoT", "issiqxona", "aqlli fermerlik", "sensorlar"],
    category: "agrotexnologiyalar",
    type: "RESEARCH",
    status: "PUBLISHED",
    authors: ["otabek-qodirov"],
    publishedAt: "2026-10-08",
    pages: [58, 66],
    intro:
      "Issiqxonada namlikni barqaror ushlab turish hosil sifati va kasalliklarning oldini olish uchun muhim.",
    methods:
      "Mikrokontroller, namlik va harorat sensorlari asosida prototip yig‘ildi; ma’lumotlar bulutli xizmatga uzatildi.",
  },
  {
    titleUz: "O‘zbekistonda raqamli agrotexnologiyalar: mavjud tadqiqotlar sharhi",
    titleEn: "Digital agrotechnology in Uzbekistan: a review of existing research",
    abstractUz:
      "Sharhda dron, sun’iy yo‘ldosh tasvirlari va sensorlar qo‘llanilgan mahalliy tadqiqotlar tizimlashtiriladi va keyingi tadqiqotlar uchun bo‘shliqlar aniqlanadi.",
    abstractEn:
      "The review systematises local studies that use drones, satellite imagery and sensors, and identifies gaps for future research.",
    keywords: [
      "agrotexnologiya",
      "raqamli qishloq xo‘jaligi",
      "dron",
      "masofaviy zondlash",
      "sharh",
    ],
    category: "agrotexnologiyalar",
    type: "REVIEW",
    status: "PUBLISHED",
    authors: ["laylo-hamidova"],
    publishedAt: "2026-10-06",
    pages: [67, 76],
    intro:
      "So‘nggi yillarda qishloq xo‘jaligida raqamli texnologiyalarni qo‘llash bo‘yicha tadqiqotlar soni ortib bormoqda.",
    methods:
      "Mahalliy va xalqaro nashrlar tizimli sharh metodikasi asosida tanlandi va guruhlandi.",
  },
  {
    titleUz: "Orol bo‘yida tuz bardoshli ekinlar tajribasi",
    titleEn: "Experience with salt-tolerant crops in the Aral Sea region",
    abstractUz:
      "Keys-stadida Orol bo‘yidagi sho‘rlangan yerlarda tuz bardoshli ekinlarni tanlashda mahalliy fermerlar tajribasi o‘rganildi.",
    abstractEn:
      "This case study examines how local farmers in the Aral Sea region choose salt-tolerant crops for saline land.",
    keywords: ["ekologiya", "agrotexnologiya", "Orol", "sho‘rlanish", "tuz bardoshli ekinlar"],
    category: "ekologiya",
    type: "CASE_STUDY",
    status: "PUBLISHED",
    authors: ["rustam-ismoilov"],
    publishedAt: "2026-10-04",
    pages: [77, 84],
    intro: "Tuproq sho‘rlanishi mintaqada qishloq xo‘jaligi uchun asosiy cheklovlardan biridir.",
    methods: "Fermerlar bilan suhbatlar va dala kuzatuvlari asosida ma’lumot yig‘ildi.",
  },
  {
    titleUz: "Organik o‘g‘itlarning tuproq unumdorligiga ta’siri",
    titleEn: "The effect of organic fertilisers on soil fertility",
    abstractUz:
      "Tadqiqotda organik va mineral o‘g‘itlar qo‘llanilgan maydonlarda tuproq unumdorligi ko‘rsatkichlari taqqoslanadi.",
    abstractEn:
      "The study compares soil fertility indicators on plots treated with organic and mineral fertilisers.",
    keywords: [
      "agrotexnologiya",
      "organik o‘g‘it",
      "tuproq",
      "unumdorlik",
      "barqaror dehqonchilik",
    ],
    category: "agrotexnologiyalar",
    type: "RESEARCH",
    status: "PUBLISHED",
    authors: ["nodira-saidova"],
    publishedAt: "2026-10-02",
    pages: [85, 92],
    intro:
      "Tuproq unumdorligini saqlash uzoq muddatli qishloq xo‘jaligi barqarorligining asosidir.",
    methods: "Tajriba maydonlaridan tuproq namunalari olinib, laboratoriyada tahlil qilindi.",
  },
  {
    titleUz: "Masofaviy ta’limda talabalar faolligini oshirish usullari",
    titleEn: "Ways to increase student engagement in distance learning",
    abstractUz:
      "Maqolada onlayn kurslarda talabalar faolligini oshiruvchi pedagogik usullar va raqamli vositalar ko‘rib chiqiladi.",
    abstractEn:
      "The paper reviews pedagogical methods and digital tools that increase student engagement in online courses.",
    keywords: ["ta’lim", "EdTech", "masofaviy ta’lim", "talabalar faolligi", "pedagogika"],
    category: "talim",
    type: "POPULAR",
    status: "PUBLISHED",
    authors: ["shahzod-mirzayev"],
    publishedAt: "2026-09-30",
    pages: [93, 99],
    intro:
      "Masofaviy ta’limning samaradorligi talabaning jarayonga qanchalik jalb qilinganiga bog‘liq.",
    methods: "Kurs platformasidagi faollik ko‘rsatkichlari va talabalar fikrlari tahlil qilindi.",
  },
  {
    titleUz: "Mahalla institutining davlat boshqaruvidagi o‘rni",
    titleEn: "The role of the mahalla institution in public administration",
    abstractUz:
      "Tadqiqotda mahalla institutining davlat boshqaruvi tizimidagi huquqiy maqomi va vakolatlari tahlil qilinadi.",
    abstractEn:
      "The study analyses the legal status and powers of the mahalla institution within the public administration system.",
    keywords: ["huquq", "davlat boshqaruvi", "mahalla", "qonunchilik", "fuqarolik jamiyati"],
    category: "huquq",
    type: "RESEARCH",
    status: "PUBLISHED",
    authors: ["zarina-abdullayeva"],
    publishedAt: "2026-09-28",
    pages: [100, 108],
    intro: "Mahalla O‘zbekistonda fuqarolarning o‘zini o‘zi boshqarishining an’anaviy shaklidir.",
    methods: "Normativ-huquqiy hujjatlar qiyosiy-huquqiy usul bilan tahlil qilindi.",
  },

  // In-workflow articles (not public) — they populate the cabinet (Ekran 7)
  // and the admin table (Ekran 8) with every status.
  {
    titleUz: "Kichik shaharlarda jamoat transporti marshrutlarini optimallashtirish",
    titleEn: "Optimising public transport routes in small towns",
    abstractUz: "Qoralama annotatsiya.",
    abstractEn: "Draft abstract.",
    keywords: ["texnologiyalar", "transport", "optimallashtirish", "shahar", "logistika"],
    category: "texnologiyalar",
    type: "RESEARCH",
    status: "UNDER_REVIEW",
    authors: ["aziza-karimova"],
    intro: "Qoralama matn.",
    methods: "Qoralama matn.",
  },
  {
    titleUz: "Yosh oilalarning moliyaviy savodxonligi",
    titleEn: "Financial literacy of young families",
    abstractUz: "Qoralama annotatsiya.",
    abstractEn: "Draft abstract.",
    keywords: ["iqtisodiyot", "moliyaviy savodxonlik", "oila", "jamg‘arma", "so‘rovnoma"],
    category: "iqtisodiyot",
    type: "RESEARCH",
    status: "REVISION_REQUESTED",
    authors: ["aziza-karimova"],
    intro: "Qoralama matn.",
    methods: "Qoralama matn.",
  },
  {
    titleUz: "Samarqand me’moriy yodgorliklarini raqamlashtirish tajribasi",
    titleEn: "Digitising the architectural monuments of Samarkand",
    abstractUz: "Qoralama annotatsiya.",
    abstractEn: "Draft abstract.",
    keywords: ["tarix", "madaniy meros", "raqamlashtirish", "Samarqand", "3D"],
    category: "tarix-madaniyat",
    type: "CASE_STUDY",
    status: "AWAITING_PAYMENT",
    authors: ["aziza-karimova"],
    intro: "Qoralama matn.",
    methods: "Qoralama matn.",
  },
];
