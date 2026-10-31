import type { AiKnowledgeKind, ArticleType } from "@/generated/prisma/client";

/**
 * Starting knowledge base for Xorazmiy AI (stage 6 "training"). The seed writes
 * these rows once; the editorial team then edits them in Admin → Xorazmiy AI.
 * When the database is empty (tests, a fresh install before seeding), the AI
 * falls back to this list, so it never works without the rules below.
 *
 * Content follows TZ 10 (features, academic integrity), 15 (Academy lessons)
 * and 16 (author requirements). It is written in Uzbek because the model
 * answers authors in Uzbek and should use the same terms they see.
 */
export type KnowledgeSeed = {
  key: string;
  kind: AiKnowledgeKind;
  articleType: ArticleType | null;
  title: string;
  body: string;
};

export const KNOWLEDGE_DEFAULTS: KnowledgeSeed[] = [
  {
    key: "general.integrity",
    kind: "STYLE",
    articleType: null,
    title: "Akademik halollik (TZ 10.2)",
    body: `- Maqolani muallif o‘rniga yozib bermaysan. Bo‘limni noldan yozish so‘ralsa, rad etma — o‘rniga reja, savollar, tuzilma va 1–2 ta qisqa namuna jumla ber va muallifga o‘zi yozishini tushuntir.
- Tushuntirish, savol berish, tahrir taklifi, tekshirish, tuzilma va reja — ruxsat etiladi.
- Manba, DOI, raqam yoki iqtibosni hech qachon o‘ylab topmaysan. Faqat veb-qidiruv yoki ilmiy bazalardan haqiqatda olingan, URL’i bor manbalarni ko‘rsatasan. Ishonching komil bo‘lmasa — “manba kerak” deysan.
- Muallifning ma’lumotlari (o‘lchov natijalari, so‘rovnoma javoblari) ni o‘zgartirishni taklif qilmaysan; faqat bayon qilinishini yaxshilaysan.
- Har bir javob oxirida platforma o‘zi “AI xato qilishi mumkin — manbalarni o‘zingiz tekshiring” deb yozadi; sen buni takrorlama.`,
  },
  {
    key: "general.style",
    kind: "STYLE",
    articleType: null,
    title: "O‘zbek ilmiy uslubi",
    body: `- Javob tili — o‘zbek (lotin) tili, muallif boshqa tilda so‘ramasa. Imlo: o‘, g‘ (tutuq belgisi ‘ bilan), sh, ch, ng; “x” va “h” farqi (xalq, hosil).
- Ilmiy uslub: shaxssiz yoki birinchi shaxs ko‘plik (“tadqiqotda … aniqlandi”, “biz … o‘rgandik”); “men”, “juda”, “eng zo‘r”, ritorik savollar, so‘zlashuv iboralaridan qochish.
- Bir jumla — bitta fikr. 35 so‘zdan uzun jumlalarni bo‘lish taklif qilinadi.
- Atamalar butun matnda bir xil: bir tushuncha uchun bitta atama (masalan, “tomchilatib sug‘orish”, keyin “tomchili sug‘orish” emas).
- Raqamlar: o‘nlik kasr vergul bilan (12,5 %), foiz belgisidan oldin bo‘sh joy, birliklar SI tizimida (t/ga, m³, °C). Jumla raqam bilan boshlanmaydi.
- Qisqartma birinchi marta to‘liq yoziladi: “Birlashgan Millatlar Tashkiloti (BMT)”.
- Iqtibos (APA 7): matnda (Familiya, yil) yoki Familiya (yil); ikki muallif — (Karimov va Aliyeva, 2023); uch va undan ko‘p — (Karimov va boshq., 2023).
- Tarjimada atamani o‘zgartirma: inglizcha annotatsiyada sohaning xalqaro atamasini ishlat (drip irrigation, cotton yield).`,
  },
  {
    key: "general.requirements",
    kind: "CHECKLIST",
    articleType: null,
    title: "Jurnal talablari (TZ 16)",
    body: `- Hajm: 3 000–8 000 so‘z (adabiyotlarsiz).
- Tuzilma: sarlavha, mualliflar va muassasalar, annotatsiya, kalit so‘zlar, so‘ng maqola turiga mos bo‘limlar, oxirida “Foydalanilgan adabiyotlar”.
- Annotatsiya: 150–250 so‘z, o‘zbek va ingliz tilida (rus — ixtiyoriy); maqsad, usul, asosiy natija (raqam bilan) va xulosa.
- Kalit so‘zlar: 5–7 ta, sarlavhadagi so‘zlarni takrorlamasdan qidiruvda ishlatiladigan atamalar.
- Adabiyotlar: kamida 10 ta, APA 7, iloji bo‘lsa DOI bilan; bir qismi xalqaro manba; matndagi har bir havola ro‘yxatda bor va aksincha.
- Rasm va jadvallar: raqamlangan (1-jadval, 1-rasm), imzo bilan, manbasi ko‘rsatilgan, matnda ularga havola bor.
- Etika: avval nashr qilinmagan; AI’dan foydalanish qoidasiga rioya; hammualliflar roziligi.`,
  },
  {
    key: "general.factcheck",
    kind: "STYLE",
    articleType: null,
    title: "Fakt tekshiruvi usuli",
    body: `- Tekshiriladigan da’vo — dunyoda tekshirsa bo‘ladigan aniq gap: raqam, foiz, sana, ism, joy, birinchi/eng katta kabi tavsif, sabab-oqibat bog‘lanishi, boshqa muallifga havola qilingan natija.
- Tekshirilmaydi: muallifning o‘z tajribasi natijalari (“bizning tajribamizda hosil 12 % oshdi”), maqsad va reja gaplari, ta’riflar, fikr va baholar.
- Har bir da’vo uchun kamida ikki xil qidiruv: o‘zbekcha/ruscha va inglizcha. Rasmiy statistika (stat.uz, FAO, World Bank), ilmiy maqolalar va xalqaro tashkilotlar ommaviy saytlardan ustun.
- “To‘g‘ri” — ishonchli manba da’voni tasdiqlaydi. “Noto‘g‘ri” — ishonchli manba boshqacha ma’lumot beradi; to‘g‘ri ma’lumotni va uning manbasini ko‘rsat. “Manba kerak” — topilmadi, manbalar bir-biriga zid yoki da’vo juda umumiy.
- Taxminiy raqamlar (“taxminan”, “qariyb”) uchun 10–15 % farq “To‘g‘ri” hisoblanadi. Sana yoki ism xato bo‘lsa — “Noto‘g‘ri”.
- Tuzatish matni qisqa, muallif jumlasiga qo‘yish mumkin bo‘lgan shaklda bo‘ladi.`,
  },
  {
    key: "type.RESEARCH.guide",
    kind: "GUIDE",
    articleType: "RESEARCH",
    title: "Ilmiy tadqiqot maqolasi (IMRAD)",
    body: `Tuzilma: Kirish → Materiallar va usullar → Natijalar → Muhokama → Xulosa.
- Kirish (10–15 %): mavzuning dolzarbligi (raqam va manba bilan), ma’lum bo‘lgan narsalar (adabiyotlar sharhi), bo‘shliq — nima hali o‘rganilmagan, tadqiqot savoli yoki gipoteza, maqsad va vazifalar. Oxirgi xatboshi — “Ushbu maqolada … baholanadi”.
- Materiallar va usullar (15–20 %): boshqa tadqiqotchi takrorlay oladigan darajada: joy, vaqt, ob’ekt, namuna hajmi va tanlash usuli, asboblar, o‘lchov usullari, statistik tahlil (dastur, test, ahamiyatlilik darajasi p < 0,05). Etik ruxsat kerak bo‘lsa — ko‘rsatiladi.
- Natijalar (25–30 %): faqat topilgan narsa, izohsiz. Jadval va rasmlar raqamlangan, matnda ularga havola; har natija raqam, o‘lchov birligi va statistik ko‘rsatkich bilan. Usullarda aytilgan har bir o‘lchovning natijasi bor.
- Muhokama (20–25 %): natijalar nimani anglatadi, boshqa tadqiqotlar bilan solishtirish (manba bilan), kutilmagan natijalarning sabablari, cheklovlar, amaliy ahamiyat.
- Xulosa (5 %): tadqiqot savoliga aniq javob, asosiy raqamli natija, tavsiya va keyingi tadqiqotlar. Yangi ma’lumot kiritilmaydi.
Gipoteza namunasi: “Tomchilatib sug‘orish an’anaviy egat usuliga nisbatan paxta hosildorligini kamida 10 % oshiradi va suv sarfini 30 % kamaytiradi.”`,
  },
  {
    key: "type.RESEARCH.checklist",
    kind: "CHECKLIST",
    articleType: "RESEARCH",
    title: "Tadqiqot maqolasini tekshirish ro‘yxati",
    body: `- Kirishda aniq tadqiqot savoli yoki gipoteza bormi?
- Bo‘shliq (gap) manbalar bilan asoslanganmi?
- Usullar takrorlash uchun yetarlimi: namuna hajmi, joy, vaqt, statistik test?
- Natijalarda talqin yo‘qmi (“bu shuni ko‘rsatadiki” — Muhokamaga)?
- Har jadval/rasm matnda tilga olinganmi, birliklar ko‘rsatilganmi?
- Muhokamada kamida 3 ta boshqa tadqiqot bilan solishtirish bormi?
- Cheklovlar tan olinganmi?
- Xulosa tadqiqot savoliga javob beradimi va yangi ma’lumot kiritmaydimi?
- Annotatsiyada asosiy natija raqam bilan berilganmi?`,
  },
  {
    key: "type.REVIEW.guide",
    kind: "GUIDE",
    articleType: "REVIEW",
    title: "Adabiyotlar sharhi maqolasi",
    body: `Maqsad — mavzu bo‘yicha mavjud tadqiqotlarni tizimli to‘plash, solishtirish va bo‘shliqlarni ko‘rsatish. Muallifning yangi tajribasi bo‘lmaydi.
Tuzilma: Kirish → Usul (manbalarni qidirish va tanlash) → Asosiy qism (mavzular bo‘yicha bo‘limlar) → Muhokama (umumiy tendensiyalar, ziddiyatlar, bo‘shliqlar) → Xulosa.
- Kirish: nega sharh kerak, oldingi sharhlar nimani qamramagan, sharh savollari.
- Usul: qaysi bazalar (Scopus, Web of Science, Google Scholar, OpenAlex, CyberLeninka), qidiruv so‘zlari, yillar oralig‘i, tanlash mezonlari, nechta manba topildi va nechtasi qoldi (PRISMA sxemasi tavsiya etiladi).
- Asosiy qism: manbalar bittalab qayta hikoya qilinmaydi — mavzu bo‘yicha guruhlanadi va solishtiriladi (“A va B usul samaradorligi bo‘yicha tadqiqotlar ikki guruhga bo‘linadi…”). Solishtirish jadvali tavsiya etiladi.
- Muhokama: kelishilgan xulosalar, ziddiyatlar sababi, O‘zbekiston sharoitiga qo‘llanilishi, hali o‘rganilmagan savollar.
- Adabiyotlar odatda 40 tadan ko‘p; kamida yarmi so‘nggi 5–10 yil va xalqaro manbalar.`,
  },
  {
    key: "type.REVIEW.checklist",
    kind: "CHECKLIST",
    articleType: "REVIEW",
    title: "Sharh maqolasini tekshirish ro‘yxati",
    body: `- Qidiruv usuli (bazalar, so‘zlar, yillar, mezonlar) yozilganmi?
- Manbalar mavzu bo‘yicha guruhlangan va solishtirilganmi, ro‘yxat kabi sanab chiqilmaganmi?
- Har bir umumlashma kamida ikki manbaga tayanganmi?
- Ziddiyatli natijalar ko‘rsatilganmi va sababi muhokama qilinganmi?
- Bo‘shliqlar va keyingi tadqiqot yo‘nalishlari aniq yozilganmi?
- Manbalarning yangiligi va xalqaro ulushi yetarlimi?`,
  },
  {
    key: "type.CASE_STUDY.guide",
    kind: "GUIDE",
    articleType: "CASE_STUDY",
    title: "Keys-stadi (amaliy holat) maqolasi",
    body: `Maqsad — bitta aniq holatni (korxona, fermer xo‘jaligi, maktab, loyiha, bemor, hudud) chuqur tahlil qilish va undan umumiy saboq chiqarish.
Tuzilma: Kirish → Holat tavsifi (kontekst) → Usul (ma’lumot qanday yig‘ildi) → Tahlil va natijalar → Muhokama (saboqlar, boshqa holatlarga qo‘llash) → Xulosa.
- Kirish: nima uchun aynan shu holat tanlangan, u qaysi umumiy muammoni ko‘rsatadi.
- Holat tavsifi: joy, vaqt, ishtirokchilar, boshlang‘ich ko‘rsatkichlar (raqamlar bilan). Shaxsiy ma’lumotlar anonimlashtiriladi, rozilik olinganligi ko‘rsatiladi.
- Usul: intervyu, hujjatlar, kuzatuv, statistika — qachon, kim bilan, qancha.
- Tahlil: “oldin — keyin” ko‘rsatkichlari, sabablar, nazariy model yoki mezon asosida baholash (SWOT, iqtisodiy samaradorlik va h.k.).
- Muhokama: nima ishladi, nima ishlamadi, qaysi sharoitda takrorlash mumkin, cheklovlar (bitta holatdan keng umumlashtirib bo‘lmaydi).`,
  },
  {
    key: "type.CASE_STUDY.checklist",
    kind: "CHECKLIST",
    articleType: "CASE_STUDY",
    title: "Keys-stadi tekshirish ro‘yxati",
    body: `- Holat nima uchun tanlangani asoslanganmi?
- Kontekst raqamlar bilan tasvirlanganmi (oldin/keyin)?
- Ma’lumot manbalari va yig‘ish usuli aniqmi?
- Shaxsiy ma’lumotlar anonimmi, rozilik ko‘rsatilganmi?
- Saboqlar holatdan kelib chiqadimi va ortiqcha umumlashtirish yo‘qmi?
- Cheklovlar tan olinganmi?`,
  },
  {
    key: "type.POPULAR.guide",
    kind: "GUIDE",
    articleType: "POPULAR",
    title: "Ilmiy-ommabop maqola",
    body: `Maqsad — ilmiy natijani keng o‘quvchiga aniq va qiziqarli tushuntirish, ilmiy aniqlikni saqlagan holda.
Tuzilma: Kirish (qiziqarli savol yoki hayotiy misol) → Muammo → Fan nima deydi (tadqiqotlar, manba bilan) → Tushuntirish (o‘xshatish, oddiy misollar) → Amaliy ahamiyati → Xulosa.
- Atamalar birinchi marta oddiy so‘z bilan tushuntiriladi; jargon minimal.
- Har bir raqam va da’vo manbaga ega — ommabop uslub manbasiz gapga ruxsat bermaydi.
- Sensatsiya va mubolag‘adan qochish: “olimlar isbotladi” o‘rniga “tadqiqot ko‘rsatdiki”, korrelyatsiyani sabab deb ko‘rsatmaslik.
- Xatboshilar qisqa (3–5 jumla), oraliq sarlavhalar savol shaklida bo‘lishi mumkin.
- Adabiyotlar ro‘yxati baribir APA 7 formatida.`,
  },
  {
    key: "type.POPULAR.checklist",
    kind: "CHECKLIST",
    articleType: "POPULAR",
    title: "Ilmiy-ommabop maqolani tekshirish ro‘yxati",
    body: `- Boshlanish o‘quvchini qiziqtiradimi?
- Har bir atama tushuntirilganmi?
- Har raqam va da’vo manbaga egami?
- Mubolag‘a, “isbotlandi”, sabab-oqibatni chalkashtirish yo‘qmi?
- Amaliy xulosa o‘quvchi uchun aniqmi?`,
  },
  {
    key: "example.edit",
    kind: "EXAMPLE",
    articleType: null,
    title: "Namuna: tahrir taklifi",
    body: `Asl: “Ushbu maqolada biz shuni ko‘rib chiqamizki tomchilatib sug‘orishning kichik xo‘jaliklar uchun qanchalik o‘zini oqlashi baholanadi.”
Takliflar:
1. “biz shuni ko‘rib chiqamizki” → olib tashlash. Sabab: ortiqcha kirish so‘zi; jumla allaqachon “baholanadi” bilan tugaydi (uslub).
2. “tomchilatib sug‘orishning” → “tomchilatib sug‘orishning iqtisodiy jihatdan” . Sabab: nima baholanishi aniq emas (aniqlik).
Natija: “Ushbu maqolada tomchilatib sug‘orishning kichik xo‘jaliklar uchun iqtisodiy jihatdan qanchalik o‘zini oqlashi baholanadi.”`,
  },
  {
    key: "example.plan",
    kind: "EXAMPLE",
    articleType: "RESEARCH",
    title: "Namuna: reja tuzish",
    body: `Mavzu: “Tomchilatib sug‘orishning paxta hosildorligiga ta’siri”.
Tadqiqot savoli: Sirdaryo viloyatining o‘tloqi-bo‘z tuproqlarida tomchilatib sug‘orish egat usuliga nisbatan paxta hosildorligi va suv sarfini qanday o‘zgartiradi?
Gipoteza: tomchilatib sug‘orish hosildorlikni ≥10 % oshiradi, suv sarfini ≥30 % kamaytiradi.
Reja:
1. Kirish — suv tanqisligi (raqam + manba), sug‘orish usullari bo‘yicha xalqaro va mahalliy tadqiqotlar, bo‘shliq: kichik xo‘jaliklar uchun ma’lumot kam, maqsad.
2. Materiallar va usullar — 2 ta xo‘jalik, bir xil tuproq va nav, 2025-yil mavsumi, maydon o‘lchami, suv hisoblagichlar, hosilni o‘lchash usuli, t-test.
3. Natijalar — 1-jadval: hosildorlik (s/ga), 2-jadval: suv sarfi (m³/ga), 1-rasm: mavsum davomida tuproq namligi.
4. Muhokama — FAO va Isroil tajribasi bilan solishtirish, xarajat va qoplanish muddati, cheklovlar (bir mavsum).
5. Xulosa — gipotezaga javob, fermerlarga tavsiya.
Namuna jumla (Kirish uchun): “O‘zbekistonda sug‘oriladigan yerlarning … foizida suv tanqisligi kuzatilmoqda [manba].” — raqamni manbadan o‘zingiz qo‘ying.`,
  },
];

/** Labels for the article types, used in prompts. */
export const ARTICLE_TYPE_LABEL: Record<ArticleType, string> = {
  RESEARCH: "ilmiy tadqiqot maqolasi (IMRAD)",
  REVIEW: "adabiyotlar sharhi",
  CASE_STUDY: "keys-stadi (amaliy holat)",
  POPULAR: "ilmiy-ommabop maqola",
};
