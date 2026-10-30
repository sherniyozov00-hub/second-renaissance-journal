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
