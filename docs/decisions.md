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
