# The Second Renaissance of Uzbekistan

Yosh olimlar uchun elektron ilmiy jurnal va **Xorazmiy AI** ilmiy yordamchisi.

- To‘liq texnik topshiriq: [`docs/TZ.pdf`](docs/TZ.pdf)
- Tasdiqlangan ekranlar: [`docs/design/`](docs/design/)
- Qabul qilingan qarorlar jurnali: [`docs/decisions.md`](docs/decisions.md)

## Stek

Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · PostgreSQL 16 + Prisma 7 ·
Redis · S3 (lokalda MinIO) · Docker · GitHub Actions. Batafsil — TZ 4-bo‘lim.

## Tez ishga tushirish (Docker)

Faqat Docker kerak. `.env` faylisiz ham ishlaydi (dev standart qiymatlari bilan):

```bash
docker compose up --build
```

So‘ng <http://localhost:3000> ni oching. Holatni tekshirish: <http://localhost:3000/api/health>.

`migrate` xizmati ishga tushishda migratsiyalarni qo‘llaydi va seed ma’lumotlarni yuklaydi
(takroriy ishga tushirish xavfsiz). Seed’ni o‘chirish: `.env` da `SEED_ON_START=false`.

| Xizmat     | Manzil                                                                                |
| ---------- | ------------------------------------------------------------------------------------- |
| Sayt       | http://localhost:3000                                                                 |
| PostgreSQL | localhost:5432 (`journal` / `journal`)                                                |
| Redis      | localhost:6379                                                                        |
| MinIO (S3) | API http://localhost:9000, konsol http://localhost:9001 (`minioadmin` / `minioadmin`) |

To‘xtatish: `docker compose down` (ma’lumotlar bilan birga o‘chirish: `docker compose down -v`).

## Lokal ishlab chiqish (Node.js 22)

```bash
cp .env.example .env
docker compose up -d postgres redis minio   # faqat infratuzilma
npm install                                 # Prisma Client ham generatsiya qilinadi
npm run db:deploy                           # migratsiyalar
npm run db:seed                             # namuna ma’lumotlar
npm run dev                                 # http://localhost:3000
```

### Buyruqlar

| Buyruq                     | Vazifa                                      |
| -------------------------- | ------------------------------------------- |
| `npm run dev`              | Dev server                                  |
| `npm run build`            | Production build                            |
| `npm run lint`             | ESLint                                      |
| `npm run typecheck`        | TypeScript tekshiruvi                       |
| `npm run format`           | Prettier bilan formatlash                   |
| `npm test`                 | Unit testlar (Vitest)                       |
| `npm run test:integration` | Integratsion testlar (seed qilingan baza)   |
| `npm run ai:eval`          | Xorazmiy AI sifat to‘plami (eval)           |
| `npm run db:migrate`       | Sxema o‘zgarganda yangi migratsiya yaratish |
| `npm run db:deploy`        | Migratsiyalarni qo‘llash                    |
| `npm run db:seed`          | Seed ma’lumotlar                            |
| `npm run db:reset`         | Bazani tozalab, qaytadan qurish             |

## Seed ma’lumotlar

- 12 ta yo‘nalish (TZ 2-bo‘lim), 1 ta jurnal soni (2026, 1-son)
- 12 ta nashr qilingan namuna maqola + 3 ta jarayondagi maqola (taqrizda, tuzatish kerak,
  to‘lov kutilmoqda). Maqola matnlari — namuna, haqiqiy tadqiqot emas.
- Foydalanuvchilar: `admin@example.com` (admin + muharrir), `editor@example.com`,
  `reviewer@example.com`, `author@example.com` (Aziza Karimova). Kirish 3-bosqichda qo‘shiladi.
- 6 ta Akademiya darsi, 7 ta statik sahifa, Sozlamalar.

## Placeholderlar

`[NARX]`, `[RAQAM]` (ISSN), `[EMAIL]`, `[TELEFON]`, `[KANAL]`, `[DOMEN]`, `[MUDDAT]`,
`[BOT_NOMI]`, `[MXIK KODI]`, `[QAYTARISH SHARTLARI]` kabi qiymatlar kodga yozilmagan —
ular `Setting` jadvalida turadi (ro‘yxat: `lib/settings/registry.ts`) va admin paneldagi
Sozlamalardan o‘zgartiriladi. Seed mavjud sozlamalarni qayta yozmaydi.

Maxfiy kalitlar (API, to‘lov, SMS) hech qachon commit qilinmaydi — nomlari
[`.env.example`](.env.example) da.

## Loyiha tuzilmasi

```
app/          Next.js sahifalar va API
components/   UI komponentlar (dizayn tizimi)
lib/          db, matn (o‘zbek normalizatsiyasi, slug), sozlamalar, ...
prisma/       schema.prisma, migrations/, seed.ts, seed-data/
messages/     uz.json, ru.json, en.json
docs/         TZ.pdf, design/*.png, decisions.md
tests/        unit (Vitest)
```

## Dizayn

Ranglar, shriftlar, radiuslar — `app/globals.css` dagi `@theme` tokenlari (TZ 12-bo‘lim).
Logotip: `public/brand/*.svg` va `components/brand/logo.tsx`. Sayt nomi bitta konfiguratsiya
qiymati: `SITE_NAME` (`lib/site.ts`).

## Qidiruv

PostgreSQL to‘liq matnli qidiruv (TZ 8): `Article.search_vector` (A — sarlavha, kalit so‘zlar,
mualliflar; B — annotatsiya; C — to‘liq matn) va `search_text` (trigram, xato yozishga
chidamli). Ikkalasini ham DB triggerlari avtomatik yangilaydi (`prisma/migrations/*_full_text_search`).
O‘zbekcha normalizatsiya SQL’da `uz_search_norm()` va kodda `lib/search/normalize.ts` —
ikkalasi bir xil ishlashi shart. Kirill so‘rovlar lotinga transliteratsiya qilinadi.

```bash
npm run test:integration   # seed qilingan bazada qidiruv qabul testlari
```

## SEO va Google’da indekslanish

Har bir sahifada: `<title>`, `description`, canonical, `hreflang` (uz/ru/en/x-default), Open
Graph, Twitter Card. Maqola sahifasida Google Scholar `citation_*` teglari va `ScholarlyArticle`
JSON-LD; muallif sahifasida `ProfilePage`; bosh sahifada `Periodical` + `WebSite`/`SearchAction`.
`/sitemap.xml` har so‘rovda bazadan quriladi (yangi nashr darhol tushadi), `/robots.txt` admin,
kabinet va API’ni yopadi.

Ishga tushirgandan keyin (domen ulangach):

1. `.env` da `NEXT_PUBLIC_SITE_URL=https://<domen>` ni o‘rnating va qayta ishga tushiring.
2. **Google Search Console** → “Mulk qo‘shish” → “URL prefiksi” → “HTML teg” usuli. Teg ichidagi
   `content` qiymatini Admin → Sozlamalar → `seo.googleVerification` ga yozing, so‘ng
   “Tasdiqlash”ni bosing.
3. Search Console → Sitemaps → `sitemap.xml` ni yuboring.
4. **Bing Webmaster Tools** → xuddi shunday, kod → `seo.bingVerification`; sitemap’ni yuboring.
5. Maqola sahifasini <https://search.google.com/test/rich-results> da tekshiring.
6. Google Scholar uchun alohida ro‘yxatdan o‘tish shart emas: `citation_*` teglari va ochiq PDF
   yetarli; indekslash vaqtini Google belgilaydi.

## Kirish (autentifikatsiya)

Auth.js (`auth.ts`): telefon yoki email + 6 xonali bir martalik kod, Google (kalitlar berilsa).
Kodlar bazada faqat hash ko‘rinishida saqlanadi, 5 daqiqa amal qiladi, 5 marta noto‘g‘ri
kiritilsa bloklanadi; bir raqamga daqiqasiga 1 ta, soatiga 5 ta kod yuboriladi.

- `SMS_PROVIDER=mock` (standart) — SMS yuborilmaydi, kod ilova logiga yoziladi:
  `docker compose logs app | grep sms:mock`. Haqiqiy SMS: `SMS_PROVIDER=eskiz` va Eskiz kalitlari.
- Email kodlari: `SMTP_URL` yoki `RESEND_API_KEY`; ikkalasi bo‘sh bo‘lsa kod logga yoziladi.
- Demo va testlar uchun mock rejimda `OTP_MOCK_CODE=123456` qo‘yish mumkin (production’da bo‘sh qoldiring).

Seed foydalanuvchilar (kirish — telefon + kod):

| Rol                | Telefon      | Email                |
| ------------------ | ------------ | -------------------- |
| Admin + muharrir   | 90 000 00 01 | admin@example.com    |
| Muharrir           | 90 000 00 02 | editor@example.com   |
| Taqrizchi          | 90 000 00 03 | reviewer@example.com |
| Muallif (Aziza K.) | 90 000 00 04 | author@example.com   |

## Maqola yuborish va to‘lov

`/kabinet/yuborish` (Ekran 6): qoralama har 10 soniyada va maydondan chiqqanda saqlanadi;
`.docx` (10 MB gacha, makrossiz) S3’ga yuklanadi; oldindan tekshiruv — originallik (platformadagi
maqolalar bilan), shablon bo‘limlari, hajm, adabiyotlar soni va APA formati.

To‘lov — `PAYMENTS_MODE`:

- `sandbox` (standart): “To‘lash” sinov sahifasiga olib boradi, tasdiqlansa maqola
  `UNDER_REVIEW` ga o‘tadi. Narx `[NARX]` bo‘lib turganida namunaviy 50 000 so‘m ishlatiladi.
- `live`: Payme (`/api/payments/payme`, JSON-RPC Merchant API) va Click
  (`/api/payments/click/prepare`, `/complete`). Kalitlar `.env` da; kassa sozlamalarida shu
  manzillarni ko‘rsating. Karta (Uzcard/Humo/Visa) Payme checkout orqali.
- Fiskal chek uchun MXIK va o‘lchov birligi kodi Sozlamalardan (`payments.mxikCode`,
  `payments.unitCode`) Payme chekiga yuboriladi.

## Tahririyat, admin va taqrizchi panellari

- **`/admin`** (muharrir va admin, Ekran 8): boshqaruv paneli, maqolalar jadvali (filtr,
  qidiruv, CSV eksport), maqola kartasi (versiyalar, originallik, taqrizlar, izohlar, AuditLog,
  taqrizchi biriktirish, tuzatishga qaytarish, qabul, rad, son/betlar/DOI, nashrdan oldin
  ko‘rinish, nashr), jurnal sonlari, kategoriyalar, mualliflar, taqrizchilar (yuklama, muddati
  o‘tganlar), to‘lovlar (qaytarish, promokodlar), sahifalar va SEO, foydalanuvchilar va rollar,
  sozlamalar. Har bir muhim amal `AuditLog` ga yoziladi.
- **`/taqriz`** (taqrizchi): biriktirilgan maqolalar, ko‘r taqriz — muallif ma’lumotlari
  ko‘rsatilmaydi; 4 mezon bo‘yicha baho (1–5), izoh va tavsiya.
- Nashrda: o‘qiladigan slug, nashr sanasi, har bir hammuallifga sertifikat, PDF (Chromium bilan,
  matnli, metama’lumotli) — `public/pdf/<slug>.pdf`, sertifikat PDF — `certificates/<id>.pdf`.

## Fon vazifalari (worker) va xabarnomalar

`worker` xizmati (`npm run worker`, docker compose’da avtomatik) pg-boss navbatidan PDF va
xabarnoma vazifalarini bajaradi. Lokal ishlab chiqishda worker’siz ishlash uchun
`JOBS_MODE=inline` + `APP_INTERNAL_URL=http://localhost:3000`.

Xabarnomalar (status o‘zgarishi, muharrir izohi, to‘lov, nashr) — email va Telegram.
Telegram botni ulash:

```bash
# .env: TELEGRAM_BOT_TOKEN=..., TELEGRAM_WEBHOOK_SECRET=<tasodifiy satr>, Sozlamalar → telegram.botName
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://<domen>/api/telegram/webhook" -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

Muallif kabinetdagi “Telegram-botni ulang” tugmasini bosadi → bot `/start <token>` ni oladi va
hisob ulanadi.

## Xorazmiy AI (6-bosqich)

- **Ish maydoni** — `/kabinet/yozish` (qoralamalar) va `/kabinet/yozish/[id]` (Ekran 3): chapda
  8 ta asbob, o‘rtada muharrir (fakt belgilari va tracked changes), o‘ngda Tekshiruv / Manbalar /
  Tahrir / Chat. Qoralama avtomatik saqlanadi, `.docx` yuklanadi va yuklab olinadi, “Jurnalga
  yuborish” Ekran 6 ga qo‘lyozma bilan o‘tkazadi.
- **Fakt tekshiruvi** (`/api/ai/factcheck`, NDJSON oqim): xatboshilar → da’volar → har xatboshi uchun
  Claude + web search → `submit_verdicts` (zod bilan tekshiriladi). Platforma qoidasi: qidiruvda
  haqiqatda topilmagan manba olib tashlanadi; manbasiz “noto‘g‘ri”/“to‘g‘ri” → “manba kerak”.
  O‘zgarmagan xatboshilar keshdan (AiCheck, hash).
- **Manbalar** — OpenAlex, Crossref, Semantic Scholar; DOI Crossref orqali tasdiqlanadi.
- **Limitlar** — mehmon: kuniga N ta (IP + qurilma cookie, IP xeshlanadi), 1 500 belgi; muallif: oyiga
  N ta, keyin sotib olingan paket (`/kabinet/ai-paket`); to‘langan maqola uchun cheksiz. Hammasi
  Admin → Sozlamalar (`ai.*`, `pricing.aiPackage`). Har chaqiruv tokeni va narxi AiCheck’da.
- **Kalitsiz ishlash** — `ANTHROPIC_API_KEY` bo‘lmasa yoki `AI_MODE=mock` — oflayn mock (“sinov rejimi”).
  Tarmoq yopiq muhitda `SCHOLAR_MODE=mock`.

### AI’ni “o‘qitish”

Model og‘irliklari qayta o‘qitilmaydi; AI har so‘rovda quyidagilardan o‘rganadi:

1. **Bilim bazasi** (Admin → Xorazmiy AI) — har maqola turi (tadqiqot/IMRAD, sharh, keys-stadi,
   ilmiy-ommabop) uchun qo‘llanma va tekshiruv ro‘yxati, o‘zbek ilmiy uslubi, jurnal talablari,
   fakt tekshiruvi usuli, akademik halollik qoidalari, namunalar. Tahririyat tahrirlaydi — AI
   bir daqiqa ichida yangi qoidaga amal qiladi.
2. **Jurnal namunalari** — shu tur va yo‘nalishdagi eng ko‘p o‘qilgan nashr qilingan maqolalar
   tuzilmasi so‘rovga qo‘shiladi: platforma o‘sgan sari AI yaxshilanadi.
3. **Fikr-mulohaza** — muallif qabul/rad etgan tahrirlar va “foydali/foydasiz” baholar saqlanadi;
   tahririyat yaxshi javobni bir bosishda namunaga aylantiradi.
4. **Eval** — `tests/ai-eval/cases.ts` dagi oltin holatlar. `npm run ai:eval` CI’da mock bilan
   (platforma qoidalari), kalit bilan esa haqiqiy Claude + web search bilan ishlaydi va narxini
   ko‘rsatadi. Bilim bazasi yoki promptni o‘zgartirgandan keyin ishga tushiring.

## Akademiya, reyting, tanlovlar, Telegram-bot (7-bosqich)

- `/akademiya` — darslar (progress bilan), shablon, yo‘nalishlar bo‘yicha namuna maqolalar;
  `/akademiya/[slug]` — matn, video, namuna, “Xorazmiy AI bilan mashq”, “Darsni tugatdim”.
  Darslar Admin → Akademiya darslari’da tahrirlanadi.
- `/shablon/maqola-shabloni.docx` — jurnal shabloni (talablar Sozlamalardan).
- `/otm-reytingi` — OTMlar reytingi; `/tanlovlar` — tanlovlar sahifasi (Admin → Sahifalar).
- Telegram-bot: `/maqolalar`, `/qidiruv <so‘z>`, `/son`, `/darslar`, `/holat`, `/yordam`. Yangi son
  nashr qilinganda bot obunachilarga xabar yuboradi (worker).
