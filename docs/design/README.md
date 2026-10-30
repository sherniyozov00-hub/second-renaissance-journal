# Tasdiqlangan ekranlar (TZ 12.3)

`docs/TZ.pdf` dan asl o‘lchamda chiqarilgan. Dizayn shularga **aynan** mos bo‘lishi shart.

| Fayl                                                     | Ekran                                                         | Bosqich |
| -------------------------------------------------------- | ------------------------------------------------------------- | ------- |
| `ekran-1-bosh-sahifa-desktop-1.png` … `-4.png`           | 1 — Bosh sahifa (desktop): header, hero, AI, yo‘nalishlar, maqolalar, Akademiya, “Platformada yana”, nashr jarayoni, narx, footer | 1 |
| `ekran-2-bosh-sahifa-mobil-1.png`, `-2.png`              | 2 — Bosh sahifa (mobil, 390 px), pastki tab navigatsiya       | 1       |
| `ekran-3-xorazmiy-ai-ish-maydoni.png`                    | 3 — Xorazmiy AI ish maydoni                                   | 6       |
| `ekran-4-maqola-sahifasi-1.png`, `-2.png`                | 4 — Maqola sahifasi                                           | 1       |
| `ekran-5-qidiruv-va-filtrlar.png`                        | 5 — Qidiruv natijalari va filtrlar                            | 2       |
| `ekran-6-maqola-yuborish-1.png`, `-2.png`                | 6 — Maqola yuborish (6 qadam)                                 | 4       |
| `ekran-7-muallif-kabineti.png`                           | 7 — Muallif kabineti                                          | 3       |
| `ekran-8-admin-panel.png`                                | 8 — Admin panel                                               | 5       |

## Tokenlar (TZ 12.1)

| Token           | Qiymat              | Qayerda                                              |
| --------------- | ------------------- | ---------------------------------------------------- |
| `blue-900`      | `#0B1F4D`           | Yuqori chiziq, footer, AI karta sarlavhasi, narx bloki |
| `blue-800`      | `#1E3A8A`           | Asosiy tugmalar, havolalar, faol tablar, logotip     |
| `blue-50`       | `#EEF3FB`           | Hero, Akademiya, kabinet foni                        |
| `border`        | `#DCE3EE`           | Karta va bo‘lim chegaralari                          |
| `border-strong` | `#C7D2E4`           | Input va ikkinchi darajali tugma chegaralari         |
| `ink`           | `#0F1B2D`           | Asosiy matn                                          |
| `text-2`        | `#334155`           | Ikkinchi darajali matn                               |
| `muted`         | `#475569`           | Izohlar, sana, meta                                  |
| `gold`          | `#C99A2E`           | Faqat bezak (logotip markazi, AI belgisi, joriy qadam) |
| `gold-text`     | `#A16207`           | Kategoriya yorliqlari, kichik ustki sarlavhalar      |
| `success` / bg  | `#166534` / `#DCFCE7` | “To‘g‘ri”, “Nashr qilindi”, “To‘langan”            |
| `danger` / bg   | `#B91C1C` / `#FEE2E2` | “Noto‘g‘ri”, “Rad etildi”                          |
| `warning` / bg  | `#92400E` / `#FEF3C7` | “Manba kerak”, “Tuzatish kerak”                    |
| `info-bg`       | `#DBEAFE`           | “Taqrizda”, AI qo‘shgan matn                         |

Tailwind klasslari: `bg-blue-900`, `text-gold-text`, `border-border-strong`, `bg-success-bg`, …
Radiuslar: `rounded-control` (6 px), `rounded-card` (12 px), `rounded-ai` (14 px).
Shriftlar: `font-serif` (Lora), `font-sans` (Inter).
