# Qabul qilingan qarorlar jurnali

TZ’da noaniq qolgan joylar bo‘yicha qabul qilingan qarorlar (TZ 1-bo‘lim, “Ish uslubi”).
Har bir qaror tegishli PR tavsifida ham yoziladi.

## 0-bosqich — Asos

1. **Prisma 7.10 (8 emas).** npm’dagi `latest` teg Prisma 8 release candidate’ga ishora
   qiladi. Barqaror versiya — 7.10.1, shuni tanladik. Prisma 7 driver adapter (`@prisma/adapter-pg`)
   orqali ishlaydi; ulanish satri `prisma.config.ts` da.
2. **MinIO image.** MinIO Docker Hub’da community image chiqarishni to‘xtatgan
   (`minio/minio` endi yuklanmaydi). Lokal ishlab chiqish uchun arxivlangan
   `bitnamilegacy/minio:2025.7.23` ishlatildi. Production’da istalgan S3-mos xizmat
   (`S3_*` o‘zgaruvchilari) ulanadi — TZ 4-bo‘limiga mos.
3. **Yo‘nalishlar soni.** TZ’da “kamida 10 ta yo‘nalish” deyilgan, jadvalda esa
   12 ta. Jadvaldagi barcha 12 tasi seed qilindi.
4. **Namuna maqolalar.** 12 ta nashr qilingan maqola ekranlardagi sarlavha va mualliflar
   asosida tuzildi. Ekran 7 va 8 dagi turli holatlarni ko‘rsatish uchun yana 3 ta
   jarayondagi maqola (taqrizda / tuzatish kerak / to‘lov kutilmoqda) qo‘shildi.
   Muassasa nomlari ekrandagidek `[Muassasa nomi]` qoldirildi.
5. **AI limitlari standart qiymatlari.** TZ’da `[N]`. Kod raqamga muhtoj bo‘lgani uchun
   boshlang‘ich qiymatlar: mehmon — kuniga 1 ta tekshiruv, 1 500 belgigacha (TZ 3-bo‘limdagi
   misol); muallif — oyiga 10 ta. Hammasi Sozlamalardan o‘zgaradi. Originallik chegarasi
   `[N]` placeholder bo‘lib qoldi.
6. **Mehmonlar uchun rol yo‘q.** `Role` enum’ida faqat AUTHOR, REVIEWER, EDITOR, ADMIN —
   mehmon bu tizimga kirmagan foydalanuvchi.
7. **`AuthorProfile.userId` ixtiyoriy.** Ro‘yxatdan o‘tmagan hammualliflar va seed mualliflar
   ham ommaviy profilga ega bo‘lishi uchun.
8. **`Certificate`** har bir hammuallif uchun alohida (`articleAuthorId`), `id` — QR va
   `/sertifikat/[id]` uchun qisqa ommaviy kod.
9. **`Article.number`** — kabinet va admin paneldagi `#0142` ko‘rinishidagi tartib raqami
   (avtoinkrement). Google Scholar uchun `pageStart` / `pageEnd` alohida maydonlar.
10. **`Payment.purpose`** (PUBLICATION / AI_PACKAGE) qo‘shildi — Ekran 7 dagi “Limitni
    oshirish” paketlarini sotish uchun.
11. **Auth.js jadvallari** (Account, Session, VerificationToken) 3-bosqichda alohida
    migratsiya bilan qo‘shiladi.
12. **Docker:** build bosqichlari `node:22-bookworm` (Prisma CLI uchun OpenSSL bor),
    runtime — `node:22-bookworm-slim` + Next.js `standalone`. Migratsiya va seed alohida
    `migrate` xizmatida bajariladi, ilova u muvaffaqiyatli tugagach ishga tushadi.
13. **Vaqtinchalik bosh sahifa.** `/` hozircha dizayn tokenlari va baza holatini ko‘rsatadi
    (indekslanmaydi). 1-bosqichda Ekran 1 va 2 bilan almashtiriladi.

## 1-bosqich — Ommaviy sayt

1. **i18n — `next-intl`.** O‘zbekcha prefikssiz, `/ru` va `/en` prefiks bilan. Brauzer tiliga
   qarab avtomatik yo‘naltirish o‘chirilgan — URL qaysi tilni ko‘rsatsa, sahifa shu tilda
   (SEO uchun barqaror).
2. **Mobil bosh sahifa Ekran 2 bo‘yicha.** Mobilda faqat hero, AI karta, yo‘nalish chiplari,
   so‘nggi 3 maqola va narx kartasi. AI imkoniyatlari, Akademiya, “Platformada yana” va
   nashr qadamlari mobilda yashirin (menyu orqali ochiladi).
3. **Yuqori chiziq va til tanlash** desktopda faqat bosh sahifada (Ekran 1). Ichki sahifalar
   Ekran 4 header’i bilan; til tanlash mobil menyuda har sahifada bor.
4. **“Ko‘p iqtibos olingan” tabi** uchun `Article.citations` maydoni qo‘shildi (keyin admin
   yoki Crossref sinxronizatsiyasi to‘ldiradi).
5. **`/yonalishlar`** — TZ jadvalida yo‘q, lekin “Barcha yo‘nalishlar” havolasi va menyu
   uchun kerak bo‘lgani uchun qo‘shildi.
6. **`/maqola/[slug]/pdf`** hozircha chop etishga tayyor ko‘rinish (brauzerda “PDF sifatida
   saqlash”). Server tomonda PDF fayl yaratish 5-bosqichda.
7. **`/mualliflarga`** TZ 16 dagi talablar jadvalini Sozlamalardan oladi; **`/narxlar`** narx
   blokini ko‘rsatadi. Boshqa statik sahifa matnlari buyurtmachidan keladi.
8. **Ko‘rishlar** sessiyada bir marta, sahifa yuklangandan keyin alohida so‘rov bilan sanaladi
   (sahifa keshini buzmaslik uchun).
9. **Sanalar** ekrandagi `[SANA]` o‘rniga haqiqiy qiymat bilan ko‘rsatiladi.
10. **`Lesson.summary`** — Akademiya kartalaridagi qisqa tavsif uchun.
11. **Hali ishlamaydigan havolalar:** `/kirish`, `/kabinet` (3-bosqich), `/kabinet/yuborish`
    (4-bosqich), shablon `.docx` (7-bosqich). Qidiruv hozircha oddiy; to‘liq matnli qidiruv
    va filtrlar 2-bosqichda.

## 2-bosqich — Qidiruv va SEO

1. **Indeks DB triggerlari bilan yangilanadi** (ilova kodi emas): sarlavha, annotatsiya, kalit
   so‘zlar, mualliflar yoki matn o‘zgarsa, `search_vector`/`search_text` avtomatik qayta
   hisoblanadi. Ko‘rishlar sonining o‘zgarishi indeksni qayta hisoblamaydi (tezlik uchun).
2. **Tutuq belgisi indeksda olib tashlanadi** (`o‘zbek` → `ozbek`): PostgreSQL parseri
   apostrofda so‘zni bo‘lib yuboradi, shu sababli barcha yozilishlar bitta shaklga keltiriladi.
3. **`simple` konfiguratsiya + prefiks moslik (`:*`)** — o‘zbek tili uchun tayyor stemmer yo‘q;
   qo‘shimchalar (`-lar`, `-ni`) prefiks bilan qamraladi.
4. **Xato yozish** — `pg_trgm` `word_similarity ≥ 0.6` (faqat “Hamma joyda” rejimida).
5. **URL parametrlari o‘zbekcha:** `q, joy, yonalish, tur, yildan, yilgacha, son, til,
muassasa, saralash, tab, page`. Filtrlangan natija sahifalari `noindex`, kanonik — `/maqolalar`.
6. **Natijadagi ajratish** JS’da qilinadi (`ts_headline` apostrofli so‘zlarni noto‘g‘ri
   belgilaydi); faqat mos kelgan qism belgilanadi, Ekran 5 dagi kabi.
7. **Scholar teglari** element sifatida chiqariladi (React ularni `<head>` ga ko‘taradi), chunki
   har `citation_author` dan keyin o‘z `citation_author_institution` kelishi kerak.
   Placeholder qiymatlar (`[Muassasa nomi]`, `[RAQAM]`) teglarga va JSON-LD’ga chiqarilmaydi.
8. **PDF’lar robots.txt’da ochiq** — Scholar `citation_pdf_url` ni o‘qiydi.
9. **Rich Results testi** tashqi xizmat; lokalda JSON-LD tuzilishi unit testlar bilan
   tekshiriladi, domen ulangach README’dagi qadamlar bo‘yicha Google testidan o‘tkaziladi.

## 3-bosqich — Kirish va kabinet

1. **Auth.js v5 (`5.0.0-beta.32`, aniq versiya qotirilgan).** Next 16 ni qo‘llaydigan yagona
   yo‘nalish; v4 App Router uchun mos emas. Sessiya — JWT; rollar va bloklash har so‘rovda
   bazadan qayta o‘qiladi (`currentUser()`), shuning uchun rol o‘zgarishi darhol kuchga kiradi.
2. **Telefon va email bir xil oqim: 6 xonali kod.** Email uchun “sehrli havola” o‘rniga kod
   tanlandi — foydalanuvchi uchun bir xil tajriba va Auth.js adapter jadvallari kerak emas
   (oldingi rejadagi Account/Session/VerificationToken jadvallari qo‘shilmadi).
3. **Kod xavfsizligi:** HMAC-SHA256 hash (AUTH_SECRET bilan), 5 daqiqa, 5 urinish, bir marta
   ishlatiladi (atomik), raqam bo‘yicha 1/daqiqa va 5/soat, IP bo‘yicha 20/soat.
4. **Rozilik (TZ 17)** kirish formasida majburiy belgi; vaqti `User.consentAt` ga yoziladi.
   Google orqali kirganlar rozilikni profil sahifasida beradi.
5. **SMS/Email adapterlari:** mock (log), Eskiz.uz, SMTP, Resend. Kalit kiritilishi bilan
   haqiqiy rejimga o‘tadi.
6. **nodemailer 10.3.1** — 8-versiyadagi zaifliklar (npm audit: 3 high) tufayli; Auth.js’ning
   ixtiyoriy peer bog‘liqligi `overrides` bilan shu versiyaga yo‘naltirildi. `npm audit`: 0.
7. **Har bir kabinet sahifasi foydalanuvchini o‘zi tekshiradi** — Next.js’da layout va sahifa
   parallel render qilinadi, layout’dagi redirect sahifani to‘xtatmaydi.
8. **Sertifikat** hozircha `/sertifikat/[id]` tasdiq sahifasi (QR bilan, chop etish/PDF sifatida
   saqlash mumkin). Server tomonda PDF fayl — 5-bosqichda.
9. **Telegram** — kabinetdagi tugma bir martalik token bilan `t.me/<bot>?start=<token>` ni
   ochadi; botning o‘zi (tokenni qabul qilish, xabarlar) 5-bosqichda. Bot nomi `[BOT_NOMI]`
   bo‘lib turganida tugma faol emas.
10. **“AI bilan tuzatish”, “Yangi versiyani yuklash”, “To‘lovni amalga oshirish”** tugmalari
    4- va 6-bosqich sahifalariga olib boradi (hozircha ular hali yo‘q).

## 4-bosqich — Yuborish va to‘lov

1. **Yuborish sahifasi Ekran 6 dagidek** kabinetning chap ustunisiz (route group `(submit)`).
2. **Qadamlar bitta sahifada**, yuqoridagi 6 ta qadam to‘ldirilganini ko‘rsatadi; o‘ng ustunda
   to‘lov kartasi. Hammuallif tartibi “yuqoriga/pastga” tugmalari bilan (sudrab o‘zgartirish
   o‘rniga — klaviatura bilan ham ishlaydi, TZ 17).
3. **Annotatsiya inglizcha maydoni qo‘shildi** — Ekran 6 da bitta annotatsiya, lekin TZ 16
   o‘zbek va ingliz tilida talab qiladi.
4. **Qoralama slug’i** `qoralama-…`; haqiqiy o‘qiladigan slug nashrda (5-bosqich) beriladi.
5. **Oldindan tekshiruv:** originallik — 5 so‘zli shingllar bilan platformadagi nashrlarga
   nisbatan (TZ 10.1 da ruxsat etilgan; tashqi xizmat keyin shu funksiya ortiga ulanadi);
   shablon, hajm, adabiyotlar va APA yili — qoidalar bo‘yicha. **Fakt tekshiruvi** Xorazmiy AI
   bilan 6-bosqichda — hozir kartada “AI ulanganda” deb turadi. Kamchiliklar yuborishni
   to‘xtatmaydi (TZ 7.4).
6. **Narx `[NARX]` bo‘lsa:** sandbox rejimida namunaviy 50 000 so‘m (sahifada yozib qo‘yilgan),
   live rejimida to‘lov yopiq va “narx belgilanmagan” xabari chiqadi. Tezlashtirilgan ko‘rib
   chiqish narxi berilmaguncha bu variant ko‘rinmaydi.
7. **Payme va Click** rasmiy protokollar bo‘yicha (Payme JSON-RPC: barcha 6 metod, idempotent,
   12 soatlik timeout; Click: MD5 imzo, Prepare/Complete). **Karta** Payme checkout orqali.
   **Uzum Bank**: merchant API shartnoma va hujjatlari bilan beriladi — kalitlar va hujjat
   kelguncha sinov sahifasi ishlatiladi; adapter shu `checkoutUrl()` ortiga qo‘shiladi.
8. **100% promokod** — to‘lov provayderga bormaydi, darhol to‘langan deb belgilanadi.
9. **Fayllar** S3’da yopiq; lokal/test muhitda S3 sozlanmagan bo‘lsa `.data/uploads` va
   imzolangan, muddati cheklangan havolalar.
10. **Server Actions va proxy hajm chegarasi** 12 MB ga oshirildi (10 MB fayl uchun).

## 5-bosqich — Tahririyat oqimi

1. **Admin va taqrizchi paneli faqat o‘zbek tilida** (xodimlar interfeysi, TZ 5 da “indekslanmaydi”);
   ommaviy sayt va muallif kabineti uch tilda qoladi.
2. **Navbat — pg-boss** (TZ 4 dagi variantlardan biri): o‘sha PostgreSQL’da ishlaydi, Redis
   kerak emas. Redis xizmati docker compose’da keyingi kesh/limit uchun qoldi.
3. **PDF — Chromium (Playwright) alohida `worker` konteynerida** (rasmiy
   `mcr.microsoft.com/playwright:v1.63.0-noble`), veb-ilova image’i yengil qoladi. PDF
   metama’lumoti (sarlavha, mualliflar, kalit so‘zlar) `pdf-lib` bilan yoziladi.
4. **`/maqola/[slug]/pdf`** — tayyor PDF bo‘lsa fayl (yuklab olishlar sanaladi), bo‘lmasa
   chop etish ko‘rinishiga (`/chop`) yo‘naltiradi. PDF havolalari oddiy `<a>` — prefetch
   yuklab olishlar sonini buzmasligi uchun.
5. **Holat o‘tishlari jadval bilan cheklangan** (`TRANSITIONS`); nashr faqat ACCEPTED dan va
   jurnal soni tanlangan bo‘lsa. Muallif o‘z maqolasiga taqrizchi bo‘la olmaydi; admin o‘zidan
   admin rolini ololmaydi va o‘zini bloklay olmaydi.
6. **Eksport “Excel”** — UTF-8 BOM’li CSV (Excel to‘g‘ri ochadi, qo‘shimcha kutubxonasiz).
7. **Telegram** — webhook `secret_token` bilan himoyalangan; token bo‘lmasa xabarlar logga
   yoziladi (mock).
8. **Akademiya darslarini tahrirlash** — 7-bosqichda; hozircha admin’da ro‘yxat.

## 6-bosqich — Xorazmiy AI

1. **Model — `claude-opus-5-5`** (Admin → Sozlamalar → `ai.model` dan o‘zgaradi). Barcha
   funksiyalar bitta modelda, vazifaga qarab `effort` (da’vo ajratish va chat — `low`, qolgani —
   `medium`): bir model — bitta prompt kesh. Avvalgi `ai.modelMain/ai.modelFast` o‘rniga.
   Siyosat sababli rad etilsa server avtomatik zaxira modelga o‘tkazadi (`fallbacks: "default"`).
2. **Akademik halollik (TZ 10.2) saqlandi:** AI bo‘limni muallif o‘rniga noldan yozmaydi — reja,
   savollar, maslahat, tahrir, tekshiruv va bitta namuna jumla beradi. Buyurtmachi boshqacha
   qaror qilsa, bilim bazasidagi “Akademik halollik” yozuvi va `features.ts` vazifalari o‘zgaradi.
3. **Manba qoidasi kodda majburiy:** model ko‘rsatgan URL shu so‘rovdagi web search
   natijalarida bo‘lmasa olib tashlanadi; manbasiz “Noto‘g‘ri” **va “To‘g‘ri”** ham “Manba kerak”
   bo‘ladi (TZ faqat “Noto‘g‘ri” uchun talab qiladi; tasdiqsiz “to‘g‘ri” ham ishonchsiz).
4. **Strukturali javob** — xulosalar `submit_verdicts` strict vositasi (web search bilan bir
   so‘rovda), qolganlari structured outputs; hammasi qo‘shimcha zod bilan tekshiriladi.
5. **Bir tekshiruvda ko‘pi bilan N ta da’vo** (`ai.maxClaimsPerCheck`, 20) — xarajat nazorati;
   kesilgan xatboshi keshlanmaydi va keyingi safar to‘liq tekshiriladi.
6. **Nima “tekshiruv” hisoblanadi:** fakt tekshiruvi, tahrir, reja, yozishga yordam, tarjima —
   limitdan; chat va manba qidiruvi — faqat daqiqalik rate limit; originallik va iqtiboslar —
   AI’siz, bepul. Xato bo‘lsa tekshiruv qaytariladi.
7. **Mehmon kaliti** — IP + `srj_device` cookie xeshi (xom IP saqlanmaydi). Rate limit xotirada
   (bitta ilova nusxasi uchun); bir nechta nusxada Redis’ga ko‘chiriladi.
8. **Muharrir — TipTap (ProseMirror)**; qoralama TipTap JSON + oddiy matn sifatida saqlanadi.
   Kutilayotgan takliflar (insertion) qabul qilinmaguncha AI va eksport muallif matnini ko‘radi.
9. **Iqtibos uslubi — APA 7** (TZ 16); yili yo‘q manba “n.d.”. Matndagi havola tekshiruvi APA va
   raqamli [1] uslubni tushunadi.
10. **AI paketi** (“Limitni oshirish”) — `Payment.purpose = AI_PACKAGE`, to‘langanda
    `User.aiCredits` ga `ai.packageChecks` qo‘shiladi; narx `pricing.aiPackage` (sandbox’da demo).
11. **“O‘qitish”** — bilim bazasi + jurnal namunalari + fikr-mulohaza + eval (README). Model
    fine-tuning qilinmaydi.
12. **Ekran 1 hero kartasi** dizayndagidek namunaviy qoldi; “Matnimni tekshirish” tugmasi
    `/xorazmiy-ai#sinov` dagi haqiqiy bepul sinovga olib boradi.

## 7-bosqich — Akademiya va qo‘shimchalar

1. **Dars** — matn (oddiy belgilash: `## ` sarlavha, `- ` ro‘yxat, `**qalin**`; HTML yo‘q — XSS xavfi
   yo‘q), ixtiyoriy video (faqat YouTube — `youtube-nocookie.com` — va Vimeo `dnt=1` embed), namuna va
   mashq. Seed darslar faqat yo‘q bo‘lsa yaratiladi — admin tahriri ustidan yozilmaydi.
2. **“Xorazmiy AI bilan mashq”** — dars mashqi bilan yangi qoralama ochadi (ish maydoni, Ekran 3).
   Kirmagan foydalanuvchi kirishdan keyin shu darsga qaytadi.
3. **Progress** — muallif “Darsni tugatdim” bilan belgilaydi (`LessonProgress`); kabinetda va
   Akademiyada ko‘rinadi.
4. **Shablon** `/shablon/maqola-shabloni.docx` — statik fayl emas, so‘rovda yaratiladi:
   Sozlamalardagi talablar (so‘z soni, manbalar) avtomatik kiradi va shablon tuzilma tekshiruvidan o‘tadi.
5. **OTMlar reytingi** `/otm-reytingi` — nashr qilingan maqolalar soni (har maqola muassasaga bir marta),
   so‘ng iqtiboslar va ko‘rishlar; yil bo‘yicha filtr. Muassasa — maqoladagi yoki profildagi nom
   (vergulgacha qismi); `[Muassasa nomi]` kabi placeholderlar hisobga olinmaydi, shuning uchun seed’da
   reyting bo‘sh va tushuntirish ko‘rsatiladi.
6. **Tanlovlar** `/tanlovlar` — oddiy statik sahifa (Admin → Sahifalar), muddat va mukofotlar placeholder.
7. **Telegram-bot buyruqlari**: `/maqolalar`, `/qidiruv`, `/son`, `/darslar`, `/holat`, `/yordam`;
   oddiy matn — qidiruv. Yangi son nashr qilinganda Telegram’ni ulagan barcha foydalanuvchilarga
   xabar (`issue.announce` vazifasi; email bilan ommaviy yuborilmaydi).
8. **Bosh sahifadagi “Platformada yana” kartalari** tegishli sahifalarga havola bo‘ldi; footer
   dizayndagidek o‘zgarmadi, yangi sahifalar sitemap’da.

## 8-bosqich — Sifat va deploy

1. **E2E — Playwright** (`@playwright/test` 1.63). Har rol uchun bitta kirish qilinadi va sessiya
   qayta ishlatiladi, chunki OTP yuborish limitlangan. Testlar CI’ning alohida `e2e` job’ida
   `next start` (production build) va seed qilingan bazaga qarshi ishlaydi.
2. **Lighthouse** mobil profil bilan, Playwright Chromium’i orqali o‘lchanadi. Qidiruv natijalari
   sahifasi ataylab `noindex` (SEO amaliyoti), shuning uchun uning o‘rniga `/maqolalar` o‘lchanadi.
3. **Tezlik:**
   - Lora va Inter shriftlari variable variantga o‘tkazildi: har subset uchun bitta fayl, `latin-ext`
     va italic olib tashlandi (o‘zbek lotini uchun `latin` yetadi).
   - Inter preload qilinmaydi: LCP elementi Lora sarlavha bo‘lgani uchun tarmoq unga beriladi.
   - Natija: 9 ta shrift (319 KB) o‘rniga 2 ta preload; bosh sahifa LCP 4,3 s → ~2,7 s,
     performance 85 → 96.
4. **Kontrast:** `gold-text` rangi `#a16207` dan `#9a5d06` ga ozgina to‘qlashtirildi — blue-50 fonida
   4,5:1 (WCAG AA) bo‘lishi uchun. Ko‘z bilan farqi deyarli sezilmaydi.
5. **CSP** skriptlarni cheklamaydi (Next inline bootstrap); qolgan direktivalar va sarlavhalar
   `next.config.ts` da. Tafsilot `docs/security.md` da.
6. **Production compose** (`docker-compose.prod.yml`):
   - tashqariga faqat Caddy (HTTPS, Let’s Encrypt) ochiladi;
   - baza, Redis va MinIO faqat ichki tarmoqda;
   - `SEED_DEMO=false` — demo maqolalar va akkauntlar yuklanmaydi.
7. **Zaxira nusxa:** `pg_dump` (custom format) va MinIO fayllari har kuni cron orqali olinadi,
   14 kun saqlanadi. Tiklash — `pg_restore --clean`. Lokal sinovda dump → yangi bazaga tiklash
   xatosiz o‘tdi (qidiruv indeksi va triggerlar bilan).

## 9-bosqich — AI variantlari va to‘liq uch tillilik (buyurtmachi talabi)

Buyurtmachi qarori: “AI yozmaydi, u yordam beradi. Kelishmay qolgan, ma’nosi to‘g‘ri kelmagan
joylarini aniqlab, shu yerlarini to‘g‘rilasa zo‘r chiqadi deb variantlar berishi kerak. Sayt 3 tilda
ish yuritishi kerak.”

1. **Tahrir = topish + variantlar.** AI ikki darajada tekshiradi:
   - til: imlo, punktuatsiya, uslub, atama;
   - ma’no va mantiq: `meaning` (ma’nosi noto‘g‘ri chiqqan yoki kontekstga zid jumla) va `logic` (zid da’volar, dalildan kelib chiqmaydigan xulosa, uzilgan bog‘lanish).

   Ma’no va mantiq xatolarida 2–3 ta variant beriladi. Muallif variantni tanlaydi, u matnda tracked change bo‘lib turadi, keyin qabul yoki rad etiladi. Variantlar yangi ma’lumot, raqam yoki manba qo‘shmaydi (eval buni tekshiradi). Bo‘limni noldan yozish taqiqlanganicha qoladi (TZ 10.2).

2. **AI javob tili — interfeys tili** (uz/ru/en). Muallif matnidan ko‘chirmalar va tuzatishlar esa matnning o‘z tilida qoladi. Til qatori user xabarida turadi — tizim prompti (va prompt kesh) uchala til uchun bitta. Fakt tekshiruvi keshi kalitiga til qo‘shildi.
3. **Model javobidagi maydonlar tildan mustaqil nomlandi** (`explanation`, `reason`, `notes`; avval `_uz`).
4. **Akademiya darslari uch tilda.** `Lesson.translations` (ru/en); bo‘sh maydonda o‘zbekcha ko‘rsatiladi. Seed 6 ta darsning ruscha va inglizcha matnini qo‘shadi. Admin’da har til uchun alohida maydonlar bor.
5. **Shablon** `?til=ru|en` bilan, **Telegram-bot** esa foydalanuvchining sayt tilida yoki Telegram ilovasi tilida javob beradi. Kirish kodi (SMS/email) sahifa tilida yuboriladi.
6. **Admin va taqrizchi panellari uch tilda** (`messages/*.json` → `admin.*`).
   - Panellar `[locale]` yo‘lidan tashqarida, shuning uchun til `staff_locale` cookie’da saqlanadi va paneldagi “O‘zb / Рус / Eng” tugmalari bilan o‘zgaradi.
   - Maqola sarlavhasi va annotatsiyasi panel tilida ko‘rsatiladi (tarjimasi bo‘lsa).
   - CSV eksport ham panel tilida.
   - 5-bosqichdagi “panellar faqat o‘zbekcha” qarori bekor qilindi.
7. **Topilgan xato tuzatildi:** qo‘lyozma tekshiruvi ruscha “Введение” sarlavhasini tanimas edi (JavaScript’dagi `\b` kirill harflarida ishlamaydi).
