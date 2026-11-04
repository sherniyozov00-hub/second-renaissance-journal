import type { KnowledgeSeed } from "./knowledge-defaults";

/**
 * Writing guides for Xorazmiy AI, distilled (in our own words, not copied)
 * from open sources and from the student research reports in "ALT FL in
 * Uzbekistan", vol. 28 (2023). Each entry names its sources so the editorial
 * team can check them. They are written for teaching: the AI explains, asks
 * and shows short examples; it does not write the article for the author.
 */
export const KNOWLEDGE_GUIDES: KnowledgeSeed[] = [
  {
    key: "guide.structure",
    kind: "GUIDE",
    articleType: null,
    title: "Maqolani qurish: bitta asosiy g‘oya va “kontekst → mazmun → xulosa”",
    body: `1. Bitta asosiy hissa. Maqola bitta markaziy g‘oya (topilma, javob, yangi ma’lumot) atrofida quriladi va u sarlavhada ko‘rinadi. Bir maqolada uch-to‘rt xil g‘oyani isbotlashga urinish har birini zaiflashtiradi — muallifga “Maqolangizning bitta asosiy javobi nima? Uni bir jumlada ayting” deb so‘ra.
2. Ishingizni bilmaydigan o‘quvchi uchun yoz. Atamalar birinchi marta tushuntiriladi, qisqartmalar ochiladi, muallifning “hamma biladi” degan narsasi aytiladi.
3. Kontekst → mazmun → xulosa (K-M-X). Bu sxema hamma darajada ishlaydi:
   - butun maqola: Kirish (kontekst) → Usullar va Natijalar (mazmun) → Muhokama va Xulosa (xulosa);
   - bo‘lim: birinchi xatboshi nima haqida ekanini aytadi, o‘rtasi dalil beradi, oxirgisi xulosa chiqaradi;
   - xatboshi: birinchi jumla — asosiy fikr, keyingilari — dalil, oxirgisi — bu fikr nimani anglatadi.
4. Annotatsiya — to‘liq kichik hikoya: muammo va bo‘shliq → maqsad yoki savol → usul (kim, nechta, qanday) → asosiy natija (raqam bilan) → xulosa va ahamiyat.
5. Natijalar — mantiqiy ketma-ket da’volar zanjiri; har bir da’vo rasm yoki jadval bilan tasdiqlanadi va asosiy g‘oyaga xizmat qiladi. Asosiy g‘oyaga aloqasiz natijalar ilovaga yoki keyingi maqolaga qoldiriladi.
6. Muhokama: natijani qisqa takrorlaydi → boshqa tadqiqotlar bilan solishtiradi → cheklovlarni ochiq aytadi → amaliy ahamiyat va keyingi qadamlar.
7. Yozish tartibi: avval Usullar va Natijalar (ular tayyor faktlar), keyin Muhokama, so‘ng Kirish, eng oxirida Annotatsiya va sarlavha. Muallif Kirishdan boshlab qotib qolsa — shu tartibni tavsiya qil.
8. Tayyor qoralamani ishni bilmaydigan bir-ikki kishiga o‘qitib, asosiy g‘oyani ular to‘g‘ri tushunganini tekshirish foydali.

Manbalar: Mensh B., Kording K. (2017). Ten simple rules for structuring papers. PLoS Comput Biol 13(9): e1005619 (CC BY); UNC Writing Center, “Scientific Reports”.`,
  },
  {
    key: "guide.survey",
    kind: "GUIDE",
    articleType: "RESEARCH",
    title: "So‘rovnoma (anketa) asosidagi tadqiqot maqolasi",
    body: `Yosh mualliflar eng ko‘p yozadigan tur. Bo‘limlar va har birida nima bo‘lishi:

Annotatsiya (150–250 so‘z): mavzu nega muhim → tadqiqot savoli → kimlar orasida, nechta ishtirokchi, qanday vosita (masalan, 10 savolli onlayn so‘rovnoma) → asosiy natija foiz bilan → xulosa va tavsiya.
Kalit so‘zlar: 5–7 ta.

Kirish: mavzuning dolzarbligi (raqam va manba bilan) → qisqa adabiyotlar sharhi yoki alohida “Adabiyotlar sharhi” bo‘limi → bo‘shliq (“… bo‘yicha O‘zbekistonda / talabalar orasida ma’lumot kam”) → aniq tadqiqot savoli. Namuna shakl: “[Muassasa] [guruh] vakillari [mavzu]ni qanday baholaydi?” Savol bitta va o‘lchab bo‘ladigan bo‘lsin.

Usullar (boshqa odam takrorlay oladigan darajada):
- Ishtirokchilar: soni (n), qanday tanlangani (qulay tanlov — tanishlar, guruh chatlari; tasodifiy tanlov), jins, yosh yoki kurs bo‘yicha taqsimot.
- Etika va rozilik: ishtirokchilarga maqsad, taxminiy vaqt, ma’lumot qayerda va qancha saqlanishi, tadqiqotchi kim ekani aytilgani; ishtirok ixtiyoriy va anonim; shaxsiy yoki og‘riqli savollar berilmagani.
- Vosita: savollar soni va turi (tanlovli, Likert shkalasi, ochiq savol), kim tuzgani yoki qaysi manbadan moslashtirilgani, oldindan 3–5 kishida sinab ko‘rilgani (pilot).
- Tarqatish: platforma (Google Forms va h.k.), kanal (Telegram guruhlari, elektron pochta), sana yoki muddat.
- Javoblar: nechta odamga yuborildi, nechtasi ochdi, nechtasi to‘liq javob berdi; chala anketalar va takroriy javoblar bilan nima qilindi.
- Tahlil: foizlar qanday hisoblandi, qaysi dastur; guruhlarni solishtirilsa — qaysi statistik test.

Natijalar: har bir savol yoki mavzu bo‘yicha alohida xatboshi: “n = 35 ishtirokchining 13 tasi (37,1 %) …”. Har bir rasm va jadval raqamlangan, o‘ziga xos imzoli, matnda tilga olinadi. Talqin qilinmaydi — faqat nima topilgani.

Muhokama: asosiy natijalar adabiyotdagi tadqiqotlar bilan solishtiriladi (“… natijalari X (2015) fikrini tasdiqlaydi, ammo Y (2016) ning … degan xulosasiga zid”), kutilmagan natijalarning ehtimoliy sabablari.

Cheklovlar (alohida qisqa bo‘lim yoki Muhokama oxirida): kichik va qulay tanlov, bitta muassasa, o‘z-o‘zini baholash (respondent o‘zini yaxshi ko‘rsatishga urinadi), vaqt cheklovi.

Xulosa va tavsiyalar: tadqiqot savoli qayta aytiladi va unga bir-ikki jumlada aniq javob beriladi; keyin raqamlangan amaliy tavsiyalar (kimga, nima qilish) va keyingi tadqiqot uchun taklif. Yangi raqam kiritilmaydi.

Adabiyotlar: jurnal talabiga ko‘ra APA 7.

Manbalar: “ALT FL in Uzbekistan” jurnali, 28-son (2023) — WIUT talabalarining so‘rovnoma asosidagi 10 ta maqolasi tahlili; Eysenbach G. (2004). Checklist for Reporting Results of Internet E-Surveys (CHERRIES). J Med Internet Res 6(3): e34.`,
  },
  {
    key: "guide.questionnaire",
    kind: "GUIDE",
    articleType: "RESEARCH",
    title: "So‘rovnoma savollarini tuzish",
    body: `Muallif savollarini ko‘rsatganda shu qoidalar bo‘yicha tekshir va har bir muammoni yaxshilangan variant bilan tushuntir:

Savol matni:
- Bir savolda bitta narsa. “Ustozlar va darsliklar sizni qoniqtiradimi?” — ikki savol (qo‘sh savol). Ikkiga bo‘linadi.
- Yo‘naltiruvchi emas. “Ijodkorlik muhim ekaniga qo‘shilasizmi?” javobni aytib qo‘ygan. Neytral: “Ijodkorlik sizning o‘qishingiz uchun qanchalik muhim?”
- Hissiy yoki baholovchi so‘zlarsiz (“zararli”, “eskirgan” kabi).
- Inkorsiz, ayniqsa ikki karra inkorsiz (“… emas deb o‘ylamaysizmi?”).
- Oddiy so‘zlar, atamalar tushuntirilgan; bitta savol — bir qator.
- Aniq vaqt oralig‘i: “odatda” emas, “o‘tgan bir hafta ichida”.

Javob variantlari:
- Hammasini qamrab olsin va bir-birini kesmasin: yosh “18–20, 21–23, 24+” (“18–20, 20–22” emas). Kerak bo‘lsa “Boshqa: ___”.
- Likert savoli (bitta baholanadigan gap) va Likert shkalasi (bitta tushunchani o‘lchaydigan bir nechta savol to‘plami) farqlanadi; shkala bo‘lsa, savollar yig‘indisi qanday hisoblanishi Usullarda aytiladi.
- Odatda 5 yoki 7 ballik, hamma savolda bir xil yo‘nalish va yorliqlar (1 — mutlaqo qo‘shilmayman … 5 — to‘liq qo‘shilaman). O‘rta (“bilmayman / betaraf”) variant qo‘yilishi yoki qo‘yilmasligi ongli qaror bo‘lsin.
- Bir nechta variant tanlash mumkin bo‘lgan savolda foizlar yig‘indisi 100 % dan oshadi — matnda buni aytish kerak.

Tartib: oddiy va qiziqarli savollardan boshlanadi, umumiydan xususiyga; shaxsiy ma’lumotlar (yosh, jins) — oxirida yoki boshida qisqa; oldingi savol keyingisiga ta’sir qilmasin.
Hajm: 8–15 savol, 5–10 daqiqa. Har bir savol tadqiqot savoliga xizmat qilishi kerak — “bu savol javobi maqolaning qaysi qismida ishlatiladi?” deb so‘ra.
Pilot: tarqatishdan oldin 3–5 kishida sinash, tushunilmagan savollarni tuzatish.

Manbalar: SAGE Encyclopedia of Survey Research Methods (“double-barreled question”); WestEd / IES, “Best Practices for Survey Design”; GMC (UK), survey design best practice annex.`,
  },
  {
    key: "guide.litreview",
    kind: "GUIDE",
    articleType: null,
    title: "Adabiyotlar sharhini yozish: sanab chiqish emas, solishtirish",
    body: `Sharh — manbalarni birma-bir qisqa bayon qilish (“A shuni yozgan. B buni yozgan.”) emas, ularni g‘oyalar atrofida bog‘lash (sintez).

Qanday qurish:
1. Mavzular (masalan: “ijodkorlik tushunchasi”, “ijodkorlikka to‘siqlar”, “ijodkorlik va baho”) yoki yondashuvlar bo‘yicha guruhlash — har bir guruh alohida xatboshi yoki kichik sarlavha.
2. Har bir xatboshida mualliflarni bir-biri bilan muloqotga kiritish:
   - rozi: “X (2015) ham … deb ta’kidlaydi”;
   - qisman rozi: “Y (2016) bu fikrga qisman qo‘shiladi, ammo … deb hisoblaydi”;
   - zid: “Bu Z (2013) natijalariga zid: …”;
   - rivojlanish: “Keyingi tadqiqotlar … ni ham hisobga oldi”.
3. Usul va sifatga baho: qaysi tadqiqot kichik namunada, qaysi boshqa mamlakatda o‘tkazilgan — bu muallifning o‘z tadqiqotiga asos bo‘ladi.
4. Oxirida bo‘shliq: “Mavjud tadqiqotlar … ni o‘rgangan, lekin … (masalan, O‘zbekiston talabalari, gender farqi) yetarlicha o‘rganilmagan. Ushbu tadqiqot shu bo‘shliqni to‘ldirishga qaratilgan.”

Yordamchi usul — sintez jadvali: qatorlar — manbalar, ustunlar — asosiy savollar (nima o‘rganilgan, kimda, qanday usul, nima topilgan). Bir ustunga qarab o‘xshashlik va farqni ko‘rish oson.

Tekshir: matndagi har bir havola adabiyotlar ro‘yxatida bormi va aksincha; bir xil muallif ismi bir xil yozilganmi; manba yilidagi xato yo‘qmi; ko‘chirma qo‘shtirnoqda va sahifasi bilan berilganmi. Manba yoki iqtibosni hech qachon o‘ylab topma — muallifga qidirish yo‘lini ko‘rsat (Google Scholar, ochiq bazalar, “Xalqaro manbalar” asbobi).

Manbalar: UNC Writing Center, “Literature Reviews”; Saint Louis University Writing Services; Bucknell University Library guide.`,
  },
  {
    key: "guide.numbers",
    kind: "CHECKLIST",
    articleType: null,
    title: "Raqamlar va statistika: yozish va tekshirish qoidalari",
    body: `Yozish (APA 7 ga mos):
- Foiz bilan birga soni ham: “35 talabaning 13 tasi (37,1 %)”. Faqat foiz berilsa, n albatta Usullarda bo‘lsin.
- O‘rtacha (M) va standart og‘ish (SD) — bir kasr xonasi; korrelyatsiya, ulush va statistik testlar — ikki kasr xonasi.
- p qiymati aniq yoziladi (p = 0,032), faqat 0,001 dan kichik bo‘lsa — p < 0,001.
- Uchtagacha raqam — gap ichida, 4–20 ta — jadvalda, undan ko‘p — rasmda. Bir xil raqamni ham matnda, ham jadvalda takrorlama — matnda faqat eng muhimini ayt va jadvalga havola qil.
- O‘zbek matnida o‘nli kasr vergul bilan (37,1 %), ingliz matnida nuqta bilan (37.1%) — bir maqola ichida bir xil.

Tekshirish (bu xatolar talabalar maqolalarida eng ko‘p uchraydi):
1. Foiz namuna hajmiga mosmi: k/n×100 butun k uchun chiqishi kerak. n = 35 da mumkin bo‘lgan qiymatlar 2,9; 5,7; 8,6; … 37,1; 40,0 %. “37,3 %” bo‘lishi mumkin emas — muallifdan hisobni qayta tekshirishni so‘ra.
2. Bitta javob tanlanadigan savolda foizlar yig‘indisi 100 % (yaxlitlash tufayli 99,9–100,1 %). Ko‘p tanlovli savolda 100 % dan oshishi tabiiy, lekin buni aytish kerak.
3. Annotatsiya, Natijalar, Muhokama va Xulosadagi bir xil raqamlar bir-biriga mosmi; “ko‘pchilik” deyilgan joyda raqam haqiqatan 50 % dan ko‘pmi.
4. “Korrelyatsiya”, “ta’sir qiladi”, “bog‘liqlik bor” degan so‘zlar faqat statistik test (masalan, Pearson yoki Spearman koeffitsienti, xi-kvadrat) natijasi bilan. Faqat foizlar bo‘lsa: “talabalarning fikricha …”, “javoblar … ni ko‘rsatadi” deb yumshatish kerak.
5. Bog‘liqlik sabab emas: “A va B birga uchraydi” ≠ “A B ga sabab bo‘ladi”.
6. Qulay tanlov (tanishlar, bitta guruh chati) natijalari butun aholiga yoki “hamma talabalar”ga umumlashtirilmaydi va unga xatolik chegarasi (± %) hisoblanmaydi. To‘g‘ri shakl: “so‘rovnomada qatnashgan talabalarning …”.
7. Kichik guruhlarda (n < 30) foizlar ehtiyotkorlik bilan: “3 kishining 2 tasi (66,7 %)” deyish o‘rniga sonning o‘zi.
8. Rasm va jadvaldagi raqamlar matndagi bilan bir xilmi, o‘lchov birligi bormi.

Bu hisob-kitoblarni o‘zing bajar va natijasini muallifga ko‘rsat; raqamni o‘zgartirma — muallif o‘z ma’lumotiga qarab tuzatadi.

Manbalar: APA Style, Numbers and Statistics Guide (7-nashr) — Purdue OWL va Scribbr sharhlari orqali; Researchscape, qulay tanlov va xatolik chegarasi haqida.`,
  },
  {
    key: "guide.survey.checklist",
    kind: "CHECKLIST",
    articleType: "RESEARCH",
    title: "So‘rovnoma maqolasini tekshirish ro‘yxati",
    body: `Quyidagilarning har biri real talaba maqolalarida uchragan xatolar asosida tuzilgan:
- Tadqiqot savoli Kirishda aniq yozilganmi va Xulosada aynan unga javob berilganmi?
- Annotatsiyadagi da’vo (masalan, “ijobiy korrelyatsiya aniqlandi”) Natijalarda statistik dalil bilan tasdiqlanganmi yoki faqat foizlar bormi?
- Xulosa natijalarga zid emasmi? (Namuna: Natijalarda “71,4 % ijodkorlikni o‘lchab bo‘lmaydi deb javob berdi”, Xulosada esa “ko‘pchilik uni o‘lchash mumkin deb hisoblaydi” — bu ziddiyat.)
- Har bir foiz n ga mosmi va yig‘indilar to‘g‘rimi? (“Raqamlar va statistika” qoidasiga qara.)
- Har bir rasm va jadvalning imzosi o‘ziga xosmi? Ikki xil rasmga bir xil imzo qo‘yilgan bo‘lsa — tuzatish kerak. Har biriga matnda havola bormi?
- Usullarda: n, tanlov usuli, rozilik va anonimlik, savollar soni va turi, tarqatish kanali va muddati, pilot bormi?
- Natijalar bo‘limida talqin (“bu shuni isbotlaydiki”) yo‘qmi — u Muhokamaga.
- Muhokamada natijalar kamida 2–3 ta adabiyotdagi tadqiqot bilan solishtirilganmi?
- Cheklovlar ochiq aytilganmi (kichik va qulay tanlov, bitta muassasa, o‘z-o‘zini baholash)?
- Xulosa “barcha talabalar” deb umumlashtirmayaptimi?
- Tavsiyalar natijalardan kelib chiqadimi va aniqmi (kim, nima qilsin)?
- Sarlavha tadqiqot savolini aks ettiradimi (kimlar orasida, nima o‘rganilgan)?

Manba: “ALT FL in Uzbekistan” jurnali, 28-son (2023) maqolalari tahlili.`,
  },
  {
    key: "style.phrases",
    kind: "STYLE",
    articleType: null,
    title: "Akademik iboralar (o‘zbek / ingliz)",
    body: `Muallif to‘g‘ri ibora topolmasa, shu ro‘yxatdan bir-ikkitasini taklif qil (butun bo‘limni yozib berma).

Maqsad va savol:
- Ushbu tadqiqotning maqsadi … ni aniqlashdan iborat. / The aim of this study is to identify …
- Tadqiqot quyidagi savolga javob izlaydi: … / This study addresses the following question: …

Adabiyotlar:
- … ning fikricha (2015), … / According to … (2015), …
- Bu fikrga … (2016) qisman qo‘shiladi, ammo … / … (2016) partly agrees, but argues that …
- Mavjud tadqiqotlarda … yetarlicha o‘rganilmagan. / Little is known about …

Usullar:
- Tadqiqotda … talabadan iborat qulay tanlovdan foydalanildi. / A convenience sample of … students was used.
- Ishtirokchilarga tadqiqot maqsadi va ma’lumotlarning maxfiyligi oldindan tushuntirildi. / Participants were informed about the purpose of the study and the confidentiality of their data.

Natijalar:
- Ishtirokchilarning … tasi (… %) … deb javob berdi (1-rasm). / … of the respondents (…%) reported that … (Figure 1).
- Eng ko‘p tanlangan javob … bo‘ldi. / The most frequent answer was …

Muhokama:
- Ushbu natija … (2015) xulosasini tasdiqlaydi. / This finding is consistent with …
- Kutilmaganidek, … / Unexpectedly, …
- Buning ehtimoliy sababi … bo‘lishi mumkin. / A possible explanation is …

Cheklovlar va xulosa:
- Tadqiqotning asosiy cheklovi — namunaning kichikligi va bitta muassasa bilan chegaralanganligi. / The main limitation is the small sample drawn from a single institution.
- Natijalar faqat so‘rovnomada qatnashganlarning fikrini aks ettiradi. / The results reflect only the views of the respondents.
- Kelgusi tadqiqotlarda … tavsiya etiladi. / Future research should …

Uslub: “Biz” yoki shaxssiz shakl — bir maqolada bittasi; “isbotlandi”, “shubhasiz”, “hamma” kabi mubolag‘adan qoch; har bir umumiy da’vo manba yoki raqam bilan.`,
  },
  {
    key: "style.ai-ethics",
    kind: "STYLE",
    articleType: null,
    title: "Sun’iy intellekt va nashr etikasi",
    body: `- AI muallif bo‘la olmaydi: u ish uchun javobgarlikni o‘z zimmasiga ololmaydi. Muallif maqolaning har bir qismi, jumladan AI yordamida yozilgan joylar uchun to‘liq javobgar.
- AI’dan foydalanilgan bo‘lsa (matn tahriri, tarjima, manba qidirish, ma’lumot tahlili), bu Usullar bo‘limida yoki maqola oxirida qaysi vosita va nima uchun ishlatilgani bilan ochiq yoziladi. Namuna: “Matnning tilini tahrirlash va manba qidirishda Xorazmiy AI (The Third Renaissance of Uzbekistan) yordamidan foydalanildi; barcha xulosalar va ma’lumotlar mualliflarga tegishli.”
- AI uydirgan manba, raqam yoki iqtibos — ilmiy halollikning jiddiy buzilishi. Har bir manbani muallifning o‘zi ochib ko‘rishi shart.
- Boshqa muallifning matnini yoki g‘oyasini havolasiz ishlatish — plagiat, hatto AI qayta yozib bergan bo‘lsa ham.
- Shuning uchun Xorazmiy AI o‘rgatadi: tushuntiradi, savol beradi, tuzilma va namuna ko‘rsatadi, xatoni topadi va variantlar beradi — lekin maqolani muallif o‘rniga yozmaydi.

Manba: COPE (Committee on Publication Ethics), “Authorship and AI tools” pozitsiyasi (2023).`,
  },
  {
    key: "example.survey-feedback",
    kind: "EXAMPLE",
    articleType: "RESEARCH",
    title: "Namuna: so‘rovnoma maqolasidagi xatoni tushuntirish",
    body: `Muallif matni: “Natijalar shuni ko‘rsatdiki, 35 talabaning 37,3 % i ijodkorlikni muhim, 31,4 % i juda muhim deb hisoblaydi. Demak, ijodkorlik va o‘zlashtirish o‘rtasida ijobiy korrelyatsiya bor.”

Yaxshi javob (o‘rgatuvchi):
1. Raqam: “35 kishida 37,3 % chiqishi mumkin emas: 13 kishi — 37,1 %, 14 kishi — 40,0 %. Diagrammadagi sonni tekshirib, foizni qayta hisoblang. 31,4 % to‘g‘ri (11 kishi).”
2. Da’vo: “Korrelyatsiya — ikki o‘lchov o‘rtasidagi statistik bog‘liqlik. Sizda faqat fikrlar foizi bor, o‘zlashtirish (baho) o‘lchanmagan. Ikki yo‘l bor: (a) gapni yumshatish — ‘Ishtirokchilarning ko‘pchiligi (68,5 %) ijodkorlikni o‘qish uchun muhim deb biladi’; (b) haqiqiy bog‘liqlikni ko‘rsatmoqchi bo‘lsangiz, talabalarning o‘rtacha bahosini ham so‘rab, Spearman koeffitsientini hisoblash.”
3. Savol: “Qaysi yo‘lni tanlaysiz? (b) ni tanlasangiz, so‘rovnomaga qaysi savolni qo‘shish kerakligini birga ko‘rib chiqamiz.”

Yomon javob: gapni muallif o‘rniga to‘liq qayta yozib berish yoki raqamni o‘zi “tuzatib” qo‘yish.`,
  },
];
