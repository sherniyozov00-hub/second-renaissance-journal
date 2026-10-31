# Ish holati (progress)

Buyurtmachi ko‘rsatmasi: barcha bosqichlarni (0–8) oxirigacha mustaqil bajarish; har bosqich
alohida PR, CI yashil bo‘lgach merge; limit tugasa — yangilanganda shu fayldan davom etish
(avtomatik eslatma har 5 soatda shu sessiyaga keladi).

Branch: `claude/second-renaissance-journal-5ibpnu`. Har bosqich merge bo‘lgach branch
`main` dan qayta boshlanadi.

| Bosqich                               | Holat                     | PR  |
| ------------------------------------- | ------------------------- | --- |
| 0. Asos                               | Merge qilindi             | #1  |
| 1. Ommaviy sayt (Ekran 1, 2, 4), i18n | Merge qilindi             | #2  |
| 2. Qidiruv va SEO (Ekran 5)           | Merge qilindi             | #3  |
| 3. Kirish va kabinet (Ekran 7)        | Merge qilindi             | #4  |
| 4. Yuborish va to‘lov (Ekran 6)       | Merge qilindi             | #5  |
| 5. Tahririyat oqimi, admin (Ekran 8)  | Merge qilindi             | #6  |
| 6. Xorazmiy AI (Ekran 3) + “o‘qitish” | Merge qilindi             | #7  |
| 7. Akademiya va qo‘shimchalar         | Merge qilindi             | #8  |
| 8. Sifat va deploy                    | PR ochildi, CI kutilmoqda | #9  |

## Xorazmiy AI’ni “o‘qitish” rejasi (buyurtmachi talabi, 6-bosqich)

Model og‘irliklari qayta o‘qitilmaydi (Claude API’da bu yo‘q va kerak ham emas). Buning
o‘rniga AI har bir maqola turini **bilim bazasi + namunalar + fikr-mulohaza** orqali o‘rganadi:

1. **Bilim bazasi (`AiKnowledge`)** — har bir maqola turi (tadqiqot/IMRAD, adabiyotlar sharhi,
   keys-stadi, ilmiy-ommabop) va yo‘nalish bo‘yicha: tuzilma, har bo‘limning vazifasi, talablar
   (TZ 16), tipik xatolar, tekshiruv ro‘yxati, yaxshi/yomon namunalar. Admin paneldan
   tahrirlanadi, versiyalanadi. Akademiya darslari ham shu bazaga kiradi.
2. **Namunalar (few-shot)** — tahririyat qabul qilgan nashr maqolalari tur va yo‘nalish bo‘yicha
   qidirilib (pg full-text, keyin embedding), so‘rovga namuna sifatida qo‘shiladi. Platformada
   maqola ko‘paygan sari AI yaxshilanadi.
3. **Fikr-mulohaza** — muallif tuzatishni qabul/rad etgani, muharrir izohlari saqlanadi;
   admin “yaxshi javob” deb belgilaganlari namunalar to‘plamiga o‘tadi.
4. **Baholash to‘plami (eval)** — har tur uchun oltin test holatlari (ma’lum xatoli bo‘limlar,
   javobi ma’lum faktlar). CI’da mock bilan, kalit bo‘lsa haqiqiy API bilan ishlatiladi;
   har o‘zgarishdan keyin sifat pasaymaganini ko‘rsatadi.
5. **Akademik halollik (TZ 10.2) saqlanadi:** AI reja tuzadi, tushuntiradi, tahrir taklif
   qiladi, tekshiradi va namuna jumla beradi, lekin bo‘limni muallif o‘rniga noldan yozmaydi.
   Buni o‘zgartirish faqat buyurtmachi qarori bilan.
