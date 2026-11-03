# Serverga o‘rnatish (deploy) qo‘llanmasi

Bu qo‘llanma bo‘yicha saytni istalgan Linux serverga Docker bilan qo‘yish mumkin, jumladan
O‘zbekiston hududidagi serverga (TZ 17: shaxsiy ma’lumotlar mahalliy serverda saqlanishi
talab qilinishi mumkin).

## 0. Tez o‘rnatish (bitta buyruq)

Kichik server yetadi (1 vCPU, 2 GB RAM, 20 GB disk). Serverda hech narsa yig‘ilmaydi: GitHub
Actions har `main` yangilanishida tayyor rasmni (image) `ghcr.io/sherniyozov00-hub/second-renaissance-journal`
ga joylaydi, server faqat uni yuklab oladi. Hammasi uchta konteyner: `postgres`, `app` (sayt +
PDF/xabarnoma vazifalari, ichida headless Chromium) va `caddy` (HTTPS) — diskda ~1,5 GB.

Skript 1 GB swap qo‘shadi, Docker’ni o‘rnatadi (kichik disk uchun overlay2), firewall’ni yoqadi
(22, 80, 443), maxfiy kalitlarni o‘zi yaratib `.env` ga yozadi va saytni ishga tushiradi. Oldin
domen uchun DNS’da A yozuv (`@` va `www`) server IP manziliga qaratilgan bo‘lsin.

```bash
git clone https://github.com/sherniyozov00-hub/second-renaissance-journal /opt/journal
bash /opt/journal/deploy/install.sh journal.uz +998901234567
```

Qayta ishga tushirish xavfsiz: kod va rasm yangilanadi, `.env` va ma’lumotlar saqlanadi
(yangilash ham shu buyruq). SMS xizmati (Eskiz) ulanmaguncha kirish kodini
`bash /opt/journal/deploy/sms-code.sh` ko‘rsatadi. Rasm yuklanmasa: GitHub → Packages →
`second-renaissance-journal` → Package settings → Change visibility → Public.
Quyidagi bo‘limlar xuddi shu ishni qo‘lda qilishni tushuntiradi.

## 1. Server

| Talab | Minimal                                                             | Tavsiya                           |
| ----- | ------------------------------------------------------------------- | --------------------------------- |
| OS    | Ubuntu 22.04 / 24.04 LTS (yoki Docker ishlaydigan har qanday Linux) |                                   |
| CPU   | 1 vCPU                                                              | 2 vCPU                            |
| RAM   | 2 GB                                                                | 4 GB                              |
| Disk  | 20 GB SSD                                                           | 40 GB + backup uchun alohida disk |

Domen (masalan, `journal.uz`) va `www.journal.uz` uchun DNS’da **A yozuv** server IP manziliga
qaratilgan bo‘lishi kerak. 80 va 443 portlar ochiq bo‘lsin.

## 2. Docker o‘rnatish

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # qayta kiring
docker compose version          # 2.24 yoki yangiroq bo‘lishi kerak
```

## 3. Kodni olish va sozlash

```bash
sudo mkdir -p /opt/journal && sudo chown $USER /opt/journal
git clone https://github.com/sherniyozov00-hub/second-renaissance-journal.git /opt/journal
cd /opt/journal
cp .env.example .env
```

`.env` faylida **albatta** quyidagilarni o‘zgartiring:

| O‘zgaruvchi                                                   | Nima yoziladi                                               |
| ------------------------------------------------------------- | ----------------------------------------------------------- |
| `DOMAIN`                                                      | `journal.uz` (Caddy shu domen uchun HTTPS sertifikat oladi) |
| `NEXT_PUBLIC_SITE_URL`                                        | `https://journal.uz`                                        |
| `AUTH_SECRET`                                                 | `openssl rand -base64 48` natijasi                          |
| `POSTGRES_PASSWORD`                                           | uzun tasodifiy parol (`openssl rand -hex 24`)               |
| `SEED_ADMIN_PHONE`, `SEED_ADMIN_EMAIL`                        | birinchi administratorning telefon raqami va emaili         |
| `SMS_PROVIDER=eskiz`, `SMS_ESKIZ_EMAIL`, `SMS_ESKIZ_PASSWORD` | SMS orqali kirish uchun                                     |
| `OTP_MOCK_CODE`                                               | **bo‘sh qoldiring** (faqat test uchun)                      |

Keyinroq (kalitlar olinganda) qo‘shiladi: `PAYMENTS_MODE=live` va Click/Payme kalitlari,
`ANTHROPIC_API_KEY` (Xorazmiy AI), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
`SMTP_URL` yoki `RESEND_API_KEY`, `AUTH_GOOGLE_ID/SECRET`. Hamma o‘zgaruvchilar va izohlar —
`.env.example` da. Maxfiy kalitlar faqat `.env` da, repozitoriyga hech qachon qo‘shilmaydi.

## 4. Ishga tushirish

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
curl -fsS https://journal.uz/api/health
```

Qisqartirish uchun: `alias dc='docker compose -f docker-compose.yml -f docker-compose.prod.yml'`.

Har ishga tushishda `app` konteyneri avval migratsiyalarni qo‘llaydi va boshlang‘ich
ma’lumotlarni yuklaydi: administrator, yo‘nalishlar, Akademiya darslari, sahifalar, sozlamalar,
Xorazmiy AI bilim bazasi. Production’da demo maqolalar va demo foydalanuvchilar **yuklanmaydi**
(`SEED_DEMO=false`).

Xizmatlar: `app` (sayt + PDF, sertifikat, xabarnomalar; fayllar `files` volume’ida), `postgres`,
`caddy` (HTTPS). Bazalar va fayl ombori tashqariga ochilmaydi — faqat Caddy (80/443).

## 5. Birinchi sozlash (sayt ichida)

1. `https://journal.uz/kirish` — `SEED_ADMIN_PHONE` raqami bilan kiring (SMS kodi keladi).
2. **Admin → Sozlamalar**: narxlar, ISSN, kontaktlar, MXIK kodi, AI limitlari va modeli,
   Telegram-bot nomi, Google/Bing tasdiqlash kodlari. `[NARX]`, `[ISSN]`, `[EMAIL]` kabi
   barcha placeholderlarni to‘ldiring.
3. **Admin → Sahifalar va SEO**: “Jurnal haqida”, “Tahrir hay’ati”, “Nashr siyosati”, oferta,
   maxfiylik siyosati, tanlovlar matnlari.
4. **Admin → Foydalanuvchilar**: muharrir va taqrizchilarga rol bering.
5. **Admin → Xorazmiy AI**: bilim bazasini ko‘rib chiqing; `ANTHROPIC_API_KEY` qo‘shilgach
   sifatni tekshiring (Claude API uchun to‘lov bo‘ladi, narxi oxirida chiqadi):
   lokal kompyuterda `ANTHROPIC_API_KEY=… npm run ai:eval`.
6. Telegram-bot webhook’i (README → “Fon vazifalari”).
7. Google Search Console va Bing Webmaster’ga `https://journal.uz/sitemap.xml` ni qo‘shing.

### To‘lovlarni “live” rejimga o‘tkazish

`.env`: `PAYMENTS_MODE=live`, `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY`,
`PAYME_MERCHANT_ID`, `PAYME_SECRET_KEY`. Kabinetlarda callback manzillari:

- Click: Prepare — `https://journal.uz/api/payments/click/prepare`, Complete — `https://journal.uz/api/payments/click/complete`
- Payme: `https://journal.uz/api/payments/payme`

So‘ng `dc up -d app`.

## 6. Yangilash

```bash
cd /opt/journal
./scripts/backup.sh            # avval zaxira nusxa
bash deploy/install.sh journal.uz   # kod + yangi rasm; migratsiyalar o‘zi qo‘llanadi
curl -fsS https://journal.uz/api/health
```

## 7. Zaxira nusxa (backup) — har kuni

`scripts/backup.sh` PostgreSQL bazasini (`pg_dump`, custom format) va yuklangan fayllarni
(`files` volume) `/var/backups/journal` ga saqlaydi, 14 kundan eskilarini o‘chiradi.

```bash
sudo mkdir -p /var/backups/journal && sudo chown $USER /var/backups/journal
./scripts/backup.sh            # sinab ko‘ring
crontab -e                     # har kuni 03:17 da:
17 3 * * * cd /opt/journal && ./scripts/backup.sh >> /var/log/journal-backup.log 2>&1
```

Muhim: zaxira nusxalarni **boshqa serverga ham** ko‘chiring (masalan, `rclone` yoki `rsync`
bilan har kuni), aks holda server yo‘qolsa nusxa ham yo‘qoladi. Sozlamalar:
`BACKUP_DIR`, `BACKUP_KEEP_DAYS`.

### Zaxira nusxadan tiklash

```bash
./scripts/restore.sh /var/backups/journal/db-20261031-031700.dump \
                     /var/backups/journal/files-20261031-031700.tar.gz
```

Skript tasdiq so‘raydi, saytni to‘xtatadi, bazani nusxadan to‘liq almashtiradi, fayllarni
qaytaradi va saytni qayta ishga tushiradi. Oyiga bir marta tiklashni sinov serverida tekshirib
turing.

## 8. Monitoring va loglar

- Holat: `GET /api/health` (baza ulanishi bilan) — UptimeRobot kabi xizmatga qo‘shing.
- Loglar: `dc logs -f app`, `dc logs caddy`.
- Disk: `df -h`, `docker system df`.
- AI xarajati: Admin → Xorazmiy AI (oylik).

## 9. Xavfsizlik bo‘yicha eslatmalar

- `.env` faqat server egasida (`chmod 600 .env`).
- SSH: parol bilan kirishni o‘chiring, kalit bilan kiring; `ufw allow 22,80,443/tcp && ufw enable`.
- Ilova bitta nusxada ishlaydi (AI va qidiruv limitlari xotirada). Bir nechta nusxaga
  o‘tishda limitlarni Redis’ga ko‘chirish kerak.
- Batafsil: [`docs/security.md`](security.md).
