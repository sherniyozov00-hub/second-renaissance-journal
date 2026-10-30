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

| Buyruq               | Vazifa                                      |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Dev server                                  |
| `npm run build`      | Production build                            |
| `npm run lint`       | ESLint                                      |
| `npm run typecheck`  | TypeScript tekshiruvi                       |
| `npm run format`     | Prettier bilan formatlash                   |
| `npm test`           | Unit testlar (Vitest)                       |
| `npm run db:migrate` | Sxema o‘zgarganda yangi migratsiya yaratish |
| `npm run db:deploy`  | Migratsiyalarni qo‘llash                    |
| `npm run db:seed`    | Seed ma’lumotlar                            |
| `npm run db:reset`   | Bazani tozalab, qaytadan qurish             |

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
