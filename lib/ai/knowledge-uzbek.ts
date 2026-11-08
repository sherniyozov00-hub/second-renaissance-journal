import type { KnowledgeSeed } from "./knowledge-defaults";

/**
 * Uzbek language knowledge for Xorazmiy AI.
 *
 * Sources (read in full, not from memory):
 *  - "O‘zbek tilining asosiy imlo qoidalari", Vazirlar Mahkamasining
 *    1995-yil 24-avgustdagi 339-son qarori (lex.uz/docs/1625271) — rule
 *    numbers and examples below are quoted from it;
 *  - "Lotin yozuviga asoslangan o‘zbek alifbosini joriy etish to‘g‘risida"gi
 *    931-XII-son Qonun (1995-yil 71-I tahriri) and its 2026-yil 21-oktabrdagi
 *    O‘RQ-1184-son tahriri (lex.uz/docs/-112286, lex.uz/docs/8548754);
 *  - M. Aminov, A. Madvaliyev, N. Mahkamov, N. Mahmudov, Y. Odilov,
 *    "Davlat tilida ish yuritish. Amaliy qo‘llanma" (Toshkent, 2021);
 *  - N. Mahmudov, A. Madvaliyev, N. Mahkamov, "O‘zbek tili punktuatsiyasining
 *    asosiy qoidalari" (Toshkent, 2015) — as set out in published summaries;
 *    where sources disagree the entry says so and the AI must not call it an
 *    error;
 *  - an analysis of 95 Uzbek-language articles (CC BY) from eight journals:
 *    «Maktabgacha va maktab ta’limi», «Yashil iqtisodiyot va taraqqiyot»,
 *    «Muhandislik va iqtisodiyot», «Raqamli iqtisodiyot», «Al-Farg‘oniy
 *    avlodlari», O‘zbekiston agrar fani xabarnomasi, ActaCAMU and medical
 *    journals (Zenodo).
 */
export const KNOWLEDGE_UZBEK: KnowledgeSeed[] = [
  {
    key: "uz.alphabet",
    kind: "STYLE",
    articleType: null,
    title: "O‘zbek alifbosi: amaldagi va 2027-yildan kuchga kiradigan",
    body: `Amaldagi alifbo (931-XII-son Qonun, 1995-yil tahriri): 26 harf va 3 ta harflar birikmasi — a, b, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, x, y, z, oʻ, gʻ, sh, ch, ng va tutuq belgisi (ʼ).
- oʻ va gʻ harflaridagi belgi — “ʻ” (teskari vergul; matnda “‘” ham ishlatiladi). Tutuq belgisi — “ʼ” (matnda “’” ham ishlatiladi). Ular boshqa-boshqa belgilar: oʻ harfi — “oʻzbek”, tutuq — “maʼlumot”, “sheʼr”.
- Qo‘shtirnoq (”), teskari tirnoq (\`) yoki urg‘u (´) bilan “o”zbek”, “o\`zbek” deb yozish — xato.
- Bir matnda oʻ/gʻ uchun bitta belgi tanlanadi (yo “ʻ”, yo “‘”), aralashtirilmaydi.
- Lotin so‘z ichiga kirill harfi (о, а, е, с, р, х, у…) aralashib qolmasligi kerak: ko‘zga bir xil ko‘rinadi, lekin qidiruv tizimlari va kompyuter uni boshqa so‘z deb hisoblaydi. 95 ta o‘zbek maqolasining 31 tasida shunday xato topildi.

Yangi alifbo: O‘RQ-1184-son Qonun (2026-yil 21-oktabr) bilan alifbo 28 ta harf va 1 ta tutuq belgisidan iborat qilib belgilandi; u **2027-yil 22-apreldan** kuchga kiradi. Harflar: A, B, D, E, F, G, Ğ, H, I, J, K, L, M, N, O, Ö, P, Q, R, S, Ş, Ç, T, U, V, X, Y, Z va ʼ. Ya’ni oʻ → ö, gʻ → ğ, sh → ş, ch → ç (ng alohida harf emas).
- 2027-yil 22-aprelgacha amaldagi alifbo me’yor hisoblanadi. Yangi harflar bilan yozilgan matnni (masalan, “paxtaçilik”, “joriy etiş”) xato deb belgilama: muallifga ikkala alifboni aralashtirmasdan, bitta alifboda izchil yozishni va jurnal qaysi alifboni qabul qilishini tahririyatdan aniqlashni ayt.
- Qonunga ko‘ra, avvalgi harflar bilan rasmiylashtirilgan hujjatlar o‘z kuchini yo‘qotmaydi.
- Yangi alifbo uchun imlo qoidalarining yangi tahriri (Vazirlar Mahkamasi qarori) chiqqanini bilmasang, uni bilgandek gapirma.`,
  },
  {
    key: "uz.orthography",
    kind: "CHECKLIST",
    articleType: null,
    title: "Imlo qoidalari (VM 1995-yil 339-son qarori): ilmiy matnda eng kerakli bandlar",
    body: `Har bir qoidani ko‘rsatganda band raqamini ayt (masalan, “Imlo qoidalari, 56-band”) — muallif o‘zi tekshira oladi. Misollar qarorning o‘zidan.

Tutuq belgisi (32-band): unlidan keyin cho‘ziqroq aytilishini bildiradi — aʼlo, baʼzan, taʼzim, eʼlon, eʼtibor, sheʼr, feʼl; unli oldingi undoshdan ajratib aytilishini bildiradi — inʼom, sanʼat, qatʼiy, masʼul. Lekin moʻjiza, moʻtadil, moʻtabar so‘zlarida tutuq qo‘yilmaydi. Ilmiy matnlarda eng ko‘p tushib qoladiganlari: taʼlim, maʼlumot, eʼtibor, taʼsir, taʼminlash, taʼkidlash, maʼnaviy, masʼuliyat.

Qo‘shimcha qo‘shilganda o‘zgarish:
- 34-band: k, q bilan tugagan ko‘p bo‘g‘inli so‘zga egalik qo‘shimchasi qo‘shilsa k → g, q → gʻ: tilak — tilaging, yurak — yuragim, tayoq — tayogʻi, qoshiq — qoshigʻi. Lekin ko‘p bo‘g‘inli o‘zlashma so‘zlarda va ko‘pchilik bir bo‘g‘inli so‘zlarda o‘zgarmaydi: ishtirok — ishtiroki, ocherk — ocherki, huquq — huquqim, ravnaq — ravnaqi.
- 35-band: o‘rin — o‘rnim, qorin — qorni, burun — burning, o‘g‘il — o‘g‘ling, ko‘ngil — ko‘ngli, yarim — yarmi; mavzu — mavzusi, obro‘ — obro‘yi.
- 36-band: -da, -dan, -di boshidagi undosh t eshitilsa ham d yoziladi: ishda, misdan, ketdi.
- 37-band: k bilan tugagan so‘zga -ga, -gan… qo‘shilsa k yoziladi (tokka, bukkan), q bilan tugaganga q (qishloqqacha, chiqquncha), qolgan hamma holda g (bargga, pedagogga).
- 31-band: o‘zlashma so‘z oxiridagi qo‘sh undosh yoziladi (metall, kilogramm, kongress), lekin shu undosh bilan boshlanadigan qo‘shimcha qo‘shilsa bittasi tushadi: metall + lar = metallar.

Qo‘shib yozish (38–50-bandlar): -xona, -noma, -bop, -kor kabilar bilan yasalgan so‘zlar (qabulxona, taklifnoma, ommabop); qisqartmalar va ularning qo‘shimchalari (SamDU, ToshDUning); rus tilidan olingan qo‘shma so‘zlar (kinoteatr, radiostansiya, elektrotexnika, yarimavtomat, suvosti); birpas, biroz, birmuncha, buyon; qayerda, qayoqqa.

Chiziqcha bilan (51–56-bandlar): juft va takroriy so‘zlar (el-yurt, asta-sekin, ilmiy-amaliy, ijtimoiy-iqtisodiy); -chi, -a (-ya), -ku, -u (-yu), -da, -e yuklamalari (keldi-ku, yaxshi-da); lekin -mi, -oq (-yoq), -gina yuklamalari qo‘shib yoziladi (keldimi?, o‘ziyoq, mengina). Arab raqami bilan yozilgan tartib sonda -nchi o‘rniga chiziqcha: 7-sinf, 60-yillar, 1991-yilning 1-sentabri, 3-, 7-, 8-sinf o‘quvchilari; Rim raqamidan keyin chiziqcha yozilmaydi: XX asr, X sinf. Sana: “2024-yil 5-mart”, “2019–2030-yillar”.

Ajratib yozish (57–65-bandlar): qo‘shma fe’llar (sarf qil, taʼsir et, olib kel); ko‘makchi va to‘liqsiz fe’llar (aytib ber, ketgan edi) — lekin aytaver, boroladi, bilarkan qo‘shib yoziladi; ko‘makchilar (shu bilan, kun bo‘yi); hamma, har, hech, bir, qay, u, bu, shu, o‘sha so‘zlari (har kim, hech qaysi, u yerda); murakkab sonlar (o‘n bir, besh yuz); izofali birikmalar (nuqtayi nazar, tarjimayi hol).

Bosh harf (66–74-bandlar): davlatlar, davlat oliy tashkilotlari va xalqaro tashkilotlar nomidagi har bir so‘z (O‘zbekiston Respublikasi Oliy Majlisi, Birlashgan Millatlar Tashkiloti); vazirlik, idora, tashkilot nomida faqat birinchi so‘z (Sog‘liqni saqlash vazirligi, Fanlar akademiyasi, Tilshunoslik instituti); tarixiy sana va bayram nomida birinchi so‘z (Mustaqillik kuni); qisqartmalar (BMT, AQSH, ToshDTU).

Oylar: sentabr, oktabr, noyabr (1-band misollari) — “sentyabr”, “oktyabr” emas.`,
  },
  {
    key: "uz.punctuation",
    kind: "CHECKLIST",
    articleType: null,
    title: "Tinish belgilari: aniq qoidalar va bahsli joylar",
    body: `O‘zbek yozuvida 10 ta tinish belgisi bor: nuqta, vergul, nuqtali vergul, ikki nuqta, tire, so‘roq, undov, ko‘p nuqta, qavs, qo‘shtirnoq. Ilmiy matnda so‘roq va undov gaplar deyarli ishlatilmaydi.

Aniq qoidalar (bularni xato sifatida ko‘rsatish mumkin):
- Nuqta: darak gap oxirida. Sarlavhadan keyin nuqta qo‘yilmaydi. Qisqartmalarda: prof., sh.k., va h.k., t.f.d.
- Vergul — uyushiq bo‘laklar bog‘lovchisiz yoki takroriy bog‘lovchi bilan kelganda: “ham…, ham…”, “yo…, yo…”, “na…, na…”, “goh…, goh…”. Zidlov bog‘lovchilari (ammo, lekin, biroq) oldidan vergul qo‘yiladi. Yakka “va”, “hamda”, “yoki” oldidan vergul qo‘yilmaydi.
- Vergul — kirish so‘z va birikmalar ajratiladi: albatta, shubhasiz, menimcha, birinchidan, xullas, demak, masalan, aksincha, shunday qilib, shu bilan birga, ma’lumki, “…ga ko‘ra” (manbaga havola ma’nosida). Korpusdagi eng ko‘p uchragani: “Shu bilan birga,” (95 maqoladan 56 tasida).
- Vergul — undalma; ajratilgan izohlovchi; ko‘chirma gap bilan muallif gapi orasida.
- Vergul — “-ki” bilan bog‘langan ergash gapda -ki dan keyin: “Ma’lumki, …”, “Shuni ta’kidlash joizki, …”, “Tahlil shuni ko‘rsatadiki, …”.
- Nuqtali vergul — ichida vergul bor uyushiq guruhlar yoki qo‘shma gap qismlari orasida; ro‘yxat bandlari oxirida (oxirgisidan keyin nuqta).
- Ikki nuqta — umumlashtiruvchi so‘zdan keyin uyushiq bo‘laklar kelsa (“quyidagi usullar qo‘llanildi: so‘rovnoma, kuzatuv va tajriba”); bog‘lovchisiz qo‘shma gapda ikkinchi qism birinchisini izohlasa; ko‘chirma gap muallif gapidan keyin kelsa.
- Tire — ega va kesim ot bilan ifodalanib, bog‘lamasiz kelganda: “Tinchlik – farovon hayot manbayi.”; uyushiq bo‘laklardan keyin umumlashtiruvchi so‘z kelsa; bog‘lovchisiz qo‘shma gapda zidlik yoki shart-payt ma’nosi bo‘lsa. Tire so‘zlar orasida ikki tomondan bo‘sh joy bilan yoziladi (–); chiziqcha (-) so‘z ichida bo‘sh joysiz (ilmiy-amaliy). Korpusda “Mashinali o‘rganish - bu…” kabi tire o‘rnida chiziqcha 38 ta maqolada uchradi.
- Sonlar oralig‘i — bo‘sh joysiz tire: 5–10, 2019–2030-yillar.
- Qo‘shtirnoq — ko‘chirma gap, asar va tashkilot nomlari, ko‘chma ma’nodagi so‘z: «Navbahor», “yashil” iqtisodiyot. Bir matnda bir xil qo‘shtirnoq turi.
- Belgi oldidan bo‘sh joy qo‘yilmaydi, keyin qo‘yiladi: “natija, ya’ni” (“natija ,ya’ni” — xato).

Bahsli joylar (xato dema; “manbalarda turlicha” deb ayt):
- Kesim son bilan ifodalanganda ega va kesim orasiga tire qo‘yilishi (“Uch karra uch – to‘qqiz.”) — ba’zi qo‘llanmalarda qo‘yiladi, ba’zilarida yo‘q.
- Kesim sifat, ravish yoki tartib son bilan ifodalanganda tire qo‘yilmaydi (“Vatanimiz go‘zal.”), shuningdek bog‘lama yoki “ham” bo‘lsa.
- Bog‘lovchisiz qo‘shma gapda sabab–natija munosabatida ikki nuqta yoki tire tanlovi qo‘llanmalarda bir xil emas.
Qoida yetarli bo‘lmasa, muallifga gapni ikki sodda gapga bo‘lishni taklif qil — bu har doim to‘g‘ri yechim.`,
  },
  {
    key: "uz.grammar",
    kind: "CHECKLIST",
    articleType: null,
    title: "Grammatika va so‘z qo‘llash: ilmiy matnlarda ko‘p uchraydigan xatolar",
    body: `Kelishik va ko‘makchi boshqaruvi (so‘z qaysi qo‘shimchani talab qiladi):
- “-dan foydalanish” (“ma’lumotlardan foydalanildi”), “-ga ta’sir ko‘rsatish”, “-ga bog‘liq”, “-ga ko‘ra”, “-ga qaramay”, “-ga nisbatan”, “-dan keyin”, “-dan oldin”, “-dan tashqari”, “-ning natijasida”, “-ga asoslanib”, “-ni hisobga olgan holda”.
- Qaratqich (-ning) va tushum (-ni) aralashmasin: “tadqiqotning natijasi” (kimning/nimaning), “tadqiqotni o‘tkazdik” (kimni/nimani).
- Tartib: o‘zbek gapida kesim odatda oxirida; aniqlovchi aniqlanmishdan oldin. Hujjat va ilmiy matnda odatdagi so‘z tartibi saqlanadi, badiiy inversiyaga yo‘l qo‘yilmaydi (Davlat tilida ish yuritish, 2021).

Ortiqcha so‘z va kalkalar:
- “bo‘lib hisoblanadi” → “hisoblanadi” yoki “… –dir”; “eng optimal” → “optimal”; “yomon salbiy ta’sir” → “salbiy ta’sir”; “o‘zaro hamkorlik qilmoq” → “hamkorlik qilmoq”.
- Ko‘p “tomonidan” bilan majhul gap zanjiri o‘qishni qiyinlashtiradi — iloji bo‘lsa, kim bajarganini aytib, faol shaklda yoz.
- Og‘zaki so‘zlar ilmiy matnga to‘g‘ri kelmaydi: “judayam”, “zo‘r”, “ko‘rishimiz mumkinki” o‘rniga “jadvaldan ko‘rinib turibdiki”.

Bo‘sh iboralar (korpusda eng ko‘p uchragan shablonlar, 95 maqoladan): “muhim ahamiyat kasb etadi” (29), “muhim ahamiyatga ega” (29), “muhim rol o‘ynaydi” (17), “muhim o‘rin tutadi” (14), “katta ahamiyatga ega” (11), “dolzarb masalalardan biri hisoblanadi” (10). Ular xato emas, lekin hech narsani isbotlamaydi. Muallifdan so‘ra: “Nima uchun muhim? Raqam yoki manba bilan ayting.” Masalan: “… muhim ahamiyat kasb etadi” → “… hosildorlikni 12 % ga oshirdi [3]”.

Bir xil atama: bir tushuncha butun maqolada bitta atama bilan ataladi (“so‘rovnoma” yoki “anketa” — bittasi). Atama birinchi marta kelganda izohlanadi; xorijiy atama bo‘lsa qavsda asl shakli: “sun’iy intellekt (artificial intelligence, AI)”.`,
  },
  {
    key: "uz.scientific-style",
    kind: "STYLE",
    articleType: null,
    title: "O‘zbek ilmiy uslubi: real maqolalardan namunalar",
    body: `Ilmiy uslub talablari (Davlat tilida ish yuritish, 2021, rasmiy uslub bo‘limidan ilmiy matnga mos qismlar): xolislik, aniqlik, ixchamlik, mazmuniy to‘liqlik. Kichraytirish-erkalash qo‘shimchalari, ko‘tarinki-tantanavor yoki dag‘al so‘zlar, shevaga oid so‘zlar, o‘xshatish, mubolag‘a, istiora ishlatilmaydi. Har yangi fikr — yangi xatboshi; xatboshi 4–5 jumladan oshmagani ma’qul. Qisqartmalar me’yorga qat’iy va izchil amal qilib ishlatiladi (prof., sh.k., va h.k.).

Shaxs: maqola boshidan oxirigacha bitta shakl — “biz” (“Biz … tahlil qildik”) yoki shaxssiz/majhul (“… tahlil qilindi”). Aralashtirma.

95 ta maqolada barqaror ishlatiladigan, to‘g‘ri tuzilgan formulalar (bularni namuna sifatida tavsiya qil):
- Annotatsiya boshi: “Ushbu maqolada … tahlil qilingan.” / “Mazkur maqolada … o‘rganilgan.” (23 maqolada). Davomi: usul, asosiy natija raqam bilan, xulosa.
- Kirish va maqsad: “Tadqiqotning asosiy maqsadi … dan iborat.” (13), “… dolzarb masalalardan biri hisoblanadi” (dolzarblikni raqam bilan asosla).
- Adabiyotlar: “Adabiyotlar tahlili shuni ko‘rsatadiki, …” (12).
- Natijalar: “Tadqiqot natijalari shuni ko‘rsatdiki, …” (17); “1-jadvaldan ko‘rinib turibdiki, …”.
- Bog‘lash: “Shu bilan birga, …” (56), “Shu nuqtai nazardan, …” (13), “… ni hisobga olgan holda” (11), “… o‘z ichiga oladi” (20), “… ga olib kelishi mumkin” (11).
- Xulosa: “Xulosa qilib aytganda, …” (21) — bundan keyin tadqiqot savoliga aniq javob va asosiy raqam kelishi kerak.

Real maqoladagi kamchilik namunasi (nima uchun bunday yozmaslik kerak): “Inflatsiya darajasi yuqori bo‘lishi bu valyutaga judayam yomon salbiy ta’sirlarga olib kelishi mumkin.Ko’rishimiz mumkinki, …” — og‘zaki “judayam”, ortiqcha “yomon salbiy”, nuqtadan keyin bo‘sh joy yo‘q, “Ko’rishimiz” da oʻ belgisi noto‘g‘ri, “ko‘rishimiz mumkinki” og‘zaki. To‘g‘risi: “Inflatsiyaning yuqori darajasi valyuta kursiga salbiy ta’sir ko‘rsatishi mumkin. 2-jadvaldan ko‘rinib turibdiki, …”`,
  },
  {
    key: "uz.corpus-structure",
    kind: "GUIDE",
    articleType: null,
    title: "95 ta o‘zbek ilmiy maqolasi tahlili: odatdagi holat va bizning talablar",
    body: `Sakkiz jurnaldagi 95 ta o‘zbekcha maqola (2023–2026, CC BY) tahlilidan raqamlar. Muallifga “ko‘pchilik shunday yozadi, lekin jurnal talabi boshqacha” deb tushuntirishda ishlat:

| Ko‘rsatkich | 95 maqola (median) | Jurnal talabi |
|---|---|---|
| Hajm | ~3 500 so‘z (yarmi 2 250–4 750) | 3 000–8 000 so‘z |
| Annotatsiya | 77 so‘z (58–104) | 150–250 so‘z, raqamli natija bilan |
| Kalit so‘zlar | 8 ta | 5–7 ta |
| Adabiyotlar | 9 ta (7–13) | kamida 10 ta, bir qismi xalqaro |
| Matnda havola | [1], [2] raqamli — 48 maqolada; (Muallif, yil) — 2 tasida | APA 7: (Muallif, yil) |
| Bo‘limlar | Kirish 93 %, Xulosa 80 %, Natijalar 64 %, Metodlar 46 %, Adabiyotlar tahlili 36 %, Muhokama 28 % | IMRAD: hammasi bor |
| To‘liq IMRAD | 95 tadan 34 tasi | majburiy |

Bundan kelib chiqadigan ustozlik maslahatlari:
1. Eng ko‘p tushib qoladigan bo‘limlar — Metodlar va Muhokama. Muallifdan albatta so‘ra: “Qanday usul bilan, kimlarda, qachon?” va “Natijangiz boshqa tadqiqotlarga o‘xshaydimi yoki farq qiladimi?”
2. Annotatsiya odatda juda qisqa va natijasiz. 150–250 so‘zgacha kengaytirish va asosiy natijani raqam bilan berishni o‘rgat.
3. Ko‘p maqola kirishni farmon va qarorlar ro‘yxati bilan boshlaydi (24 tasida Prezident qarori yoki farmoniga havola). Bu dolzarblikni ko‘rsatadi, lekin yetarli emas: muammo raqam va ilmiy manba bilan asoslanishi, keyin bo‘shliq va tadqiqot savoli aytilishi kerak.
4. Havolalar APA 7 ga o‘tkazilishi kerak: matnda (Karimov, 2021), ro‘yxatda alifbo tartibida, DOI bilan.
5. Til xatolari keng tarqalgan: maqolalarning 31 tasida so‘z ichida kirill harfi, 35 tasida oʻ/gʻ uchun noto‘g‘ri belgi, 20 tasida “2018 yilda” (to‘g‘risi “2018-yilda”), 11 tasida “sentyabr/oktyabr”. Bular “Imlo va tinish belgilari” asbobida avtomatik topiladi — muallifni o‘sha asbobga yo‘naltir.`,
  },
  {
    key: "uz.teaching-language",
    kind: "STYLE",
    articleType: null,
    title: "Til xatolarini qanday o‘rgatish kerak",
    body: `Ustuvorlik: avval ma’no va mantiq, keyin grammatika (kelishik, so‘z tartibi), keyin tinish belgilari, eng oxirida tipografiya. Ma’nosi noaniq gapda vergul haqida gapirma — avval gapni aniqlashtir.

Usul:
1. Bitta xato turini ol va uni nomla (“tartib son chiziqchasi”, “tutuq belgisi”, “kirish so‘zidan keyin vergul”).
2. Qoidani bir jumlada ayt va manbasini ko‘rsat (masalan, “Imlo qoidalari, 56-band”).
3. Muallif matnidan bitta misolni tuzatib ko‘rsat.
4. Qolganini muallifning o‘zi topib tuzatishini so‘ra: “Matningizda yana 4 ta shunday joy bor — topib ko‘ring.” Keyingi xabarida tekshir.
5. Mexanik xatolarni (kirill harfi, oʻ belgisi, bo‘sh joylar, “1991-yil”) bittalab sanab o‘tirma — “Imlo va tinish belgilari” asbobini tavsiya qil, u ularni aniq topadi va tuzatadi.

Ehtiyotkorlik:
- Ishonching komil bo‘lmagan qoidani xato dema; “bu joyni tahrirchi bilan tekshiring” yoki “gapni ikkiga bo‘lsangiz, muammo yo‘qoladi” de.
- Atoqli otlar (ism-familiya, joy va tashkilot nomlari) rasmiy yozilishida qoladi — ularni imlo qoidasi bilan “tuzatma”.
- Ruscha yoki inglizcha iqtibos va adabiyot nomlarini o‘zbekcha qoidalar bilan tekshirma.
- Til bo‘yicha javob ham o‘zbek tilida, adabiy me’yorda, qisqa va xushmuomala bo‘lsin.`,
  },
];
