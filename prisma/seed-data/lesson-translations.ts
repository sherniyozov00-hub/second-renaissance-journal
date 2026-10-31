/**
 * Russian and English versions of the Akademiya lessons (TZ: the site works
 * in uz / ru / en). Keyed by lesson slug; same fields as the Uzbek lesson.
 */
type LessonText = {
  title: string;
  summary: string;
  body: string;
  example: string;
  exercise: string;
};

export const lessonTranslations: Record<string, { ru: LessonText; en: LessonText }> = {
  "maqola-tuzilmasi-imrad": {
    ru: {
      title: "Структура статьи: IMRAD",
      summary: "Введение, методы, результаты, обсуждение.",
      body: `Научная статья обычно следует структуре **IMRAD**. Она помогает читателю быстро найти нужное: рецензент читает методы, практик — результаты, студент — введение.

## Задача каждого раздела

- **Введение** — почему проблема важна, что о ней известно, что ещё не изучено, и ваш исследовательский вопрос.
- **Материалы и методы** — что, где, когда и как сделано; другой исследователь должен суметь повторить работу.
- **Результаты** — что найдено: числа, таблицы, рисунки. Без интерпретации.
- **Обсуждение** — что означают результаты, как они соотносятся с другими исследованиями, ограничения.
- **Заключение** — краткий ответ на исследовательский вопрос и рекомендации.

## Частые ошибки

- Интерпретация в разделе «Результаты» («это показывает, что…») — её место в «Обсуждении».
- В методах не указаны объём выборки и статистический метод.
- В заключении появляются новые данные.`,
      example: `Тема: «Влияние капельного орошения на урожайность хлопка».
- **Введение:** в условиях дефицита воды способ орошения определяет доход фермера; данных для малых хозяйств мало.
- **Методы:** в сезон 2025 года в двух хозяйствах на одинаковом сорте и почве сравнили капельное и бороздковое орошение.
- **Результаты:** урожайность и расход воды — в таблицах 1 и 2.
- **Обсуждение:** сравнение с международными исследованиями; один сезон — ограничение.
- **Заключение:** капельное орошение экономически оправдано для малых хозяйств.`,
      exercise: "Напишите по одному предложению для каждого раздела IMRAD по вашей теме.",
    },
    en: {
      title: "Article structure: IMRAD",
      summary: "Introduction, methods, results, discussion.",
      body: `A research article usually follows the **IMRAD** structure. It helps readers find what they need quickly: a reviewer reads the methods, a practitioner the results, a student the introduction.

## What each section does

- **Introduction** — why the problem matters, what is known, what is still unknown, and your research question.
- **Materials and methods** — what was done, where, when and how; another researcher must be able to repeat it.
- **Results** — what you found: numbers, tables, figures. No interpretation.
- **Discussion** — what the results mean, how they compare with other studies, limitations.
- **Conclusion** — a short answer to the research question and recommendations.

## Common mistakes

- Interpreting in the Results (“this shows that…”) — that belongs in the Discussion.
- Leaving out the sample size and the statistical method in the Methods.
- Adding new data in the Conclusion.`,
      example: `Topic: “The effect of drip irrigation on cotton yield”.
- **Introduction:** under water scarcity the irrigation method decides a farmer’s income; there is little data for small farms.
- **Methods:** in the 2025 season, drip and furrow irrigation were compared on two farms with the same variety and soil.
- **Results:** yield and water use in Tables 1 and 2.
- **Discussion:** comparison with international studies; a single season is a limitation.
- **Conclusion:** drip irrigation pays off economically for small farms.`,
      exercise: "Write one sentence for each IMRAD section on your own topic.",
    },
  },
  "mavzu-va-tadqiqot-savoli": {
    ru: {
      title: "Тема и исследовательский вопрос",
      summary: "От широкой темы к точному вопросу.",
      body: `Широкая тема («экономия воды») не подходит для исследования: на неё нельзя ответить в одной статье. Сузьте её до **проверяемого вопроса**.

## Четыре вопроса для сужения

- **Кто или что?** — объект: хлопок, школьники, малые предприятия.
- **Где?** — территория: Сырдарьинская область, город Ташкент.
- **Когда?** — период: 2020–2025 годы, один сезон.
- **Что вы измеряете?** — показатель: урожайность (ц/га), расход воды (м³/га), балл теста.

## Признаки хорошего вопроса

- Формулируется одним предложением.
- На него можно ответить данными.
- Ответ ещё неизвестен или спорен.`,
      example: `Широкая тема: «Экономия воды».
- Шаг 1: «Экономия воды в сельском хозяйстве».
- Шаг 2: «Капельное орошение в хлопководстве».
- Итоговый вопрос: «Как капельное орошение по сравнению с бороздковым меняет урожайность хлопка и расход воды на лугово-серозёмных почвах Сырдарьинской области?»`,
      exercise: "Сузьте свою широкую тему в три шага и запишите итоговый исследовательский вопрос.",
    },
    en: {
      title: "Topic and research question",
      summary: "From a broad topic to a precise question.",
      body: `A broad topic (“saving water”) is not researchable: no single article can answer it. Narrow it down to a **testable question**.

## Four questions that narrow a topic

- **Who or what?** — the object: cotton, school pupils, small businesses.
- **Where?** — the area: Syrdarya region, Tashkent city.
- **When?** — the period: 2020–2025, one season.
- **What do you measure?** — the indicator: yield (c/ha), water use (m³/ha), test score.

## A good question

- Fits in one sentence.
- Can be answered with data.
- Has an answer that is not yet known or is debated.`,
      example: `Broad topic: “Saving water”.
- Step 1: “Saving water in agriculture”.
- Step 2: “Drip irrigation in cotton growing”.
- Final question: “How does drip irrigation, compared with furrow irrigation, change cotton yield and water use on the meadow-sierozem soils of Syrdarya region?”`,
      exercise: "Narrow your broad topic in three steps and write the final research question.",
    },
  },
  "manbalar-va-iqtibos-apa-7": {
    ru: {
      title: "Источники и цитирование (APA 7)",
      summary: "Надёжный источник, правильная ссылка, без плагиата.",
      body: `Надёжный источник — рецензируемая журнальная статья, официальная статистика (stat.uz, ФАО, Всемирный банк) или научная книга. Википедия и блоги могут быть отправной точкой, но для цитаты найдите первоисточник.

## Ссылка в тексте (APA 7)

- Один автор: (Каримов, 2021) или Каримов (2021) отмечает…
- Два автора: (Каримов и Алиева, 2020).
- Три и более: (Каримов и др., 2019).

## В списке литературы

Фамилия, И. (Год). Название статьи. Название журнала, том(номер), страницы. https://doi.org/…

## Как избежать плагиата

- Передавайте мысль другого автора своими словами и ставьте ссылку.
- Дословная цитата — в кавычках и с номером страницы.
- У каждого числа и утверждения должен быть источник.`,
      example: `В тексте: «Капельное орошение снижает расход воды на 30–50 % (Karimov et al., 2021).»
В списке: Karimov, B., Aliyeva, D., & Smith, J. (2021). Drip irrigation and cotton yield in Central Asia. Agricultural Water Management, 245, 106–115. https://doi.org/10.xxxx/xxxxx`,
      exercise: "Запишите три источника по вашей теме в формате APA 7.",
    },
    en: {
      title: "Sources and citation (APA 7)",
      summary: "Reliable sources, correct references, no plagiarism.",
      body: `A reliable source is a peer-reviewed journal article, official statistics (stat.uz, FAO, World Bank) or a scholarly book. Wikipedia and blogs can be a starting point, but cite the original source.

## In-text citation (APA 7)

- One author: (Karimov, 2021) or Karimov (2021) notes…
- Two authors: (Karimov & Aliyeva, 2020).
- Three or more: (Karimov et al., 2019).

## In the reference list

Surname, I. (Year). Article title. Journal Name, volume(issue), pages. https://doi.org/…

## Avoiding plagiarism

- Put another author’s idea in your own words and cite it.
- A verbatim quote goes in quotation marks with the page number.
- Every number and claim needs a source.`,
      example: `In the text: “Drip irrigation cuts water use by 30–50% (Karimov et al., 2021).”
In the list: Karimov, B., Aliyeva, D., & Smith, J. (2021). Drip irrigation and cotton yield in Central Asia. Agricultural Water Management, 245, 106–115. https://doi.org/10.xxxx/xxxxx`,
      exercise: "Write three sources on your topic in APA 7 format.",
    },
  },
  "annotatsiya-va-kalit-sozlar": {
    ru: {
      title: "Аннотация и ключевые слова",
      summary: "Чтобы статью находили в Google.",
      body: `Аннотация — самая читаемая часть статьи. Многие читают только её и по ней решают, открывать ли статью.

## Аннотация (150–250 слов)

- **Цель** — одно предложение.
- **Метод** — где, какие данные, какой анализ.
- **Главный результат** — с числом.
- **Вывод** — что означает результат.

## Ключевые слова (5–7)

- Термины, которые люди вводят в поиске.
- Не повторяйте слова из заголовка — они уже индексируются.
- И общие (орошение), и точные (капельное орошение) термины.`,
      example: `Первое предложение аннотации: «В исследовании оценено влияние капельного орошения на урожайность хлопка и расход воды в Сырдарьинской области.»
Ключевые слова: экономия воды, способы орошения, хлопководство, малые фермерские хозяйства, экономическая эффективность.`,
      exercise:
        "Выберите 5 ключевых слов для своей статьи и напишите первое предложение аннотации.",
    },
    en: {
      title: "Abstract and keywords",
      summary: "So that Google finds your article.",
      body: `The abstract is the most-read part of an article. Many readers read only the abstract and decide from it whether to open the article.

## Abstract (150–250 words)

- **Aim** — one sentence.
- **Method** — where, what data, what analysis.
- **Main result** — with a number.
- **Conclusion** — what the result means.

## Keywords (5–7)

- Terms people type into search.
- Do not repeat words from the title — they are indexed already.
- Both general (irrigation) and specific (drip irrigation) terms.`,
      example: `First sentence of the abstract: “The study assessed the effect of drip irrigation on cotton yield and water use in Syrdarya region.”
Keywords: water saving, irrigation methods, cotton growing, small farms, economic efficiency.`,
      exercise: "Choose 5 keywords for your article and write the first sentence of the abstract.",
    },
  },
  "jadval-va-rasmlar": {
    ru: {
      title: "Таблицы и рисунки",
      summary: "Подпись, нумерация, указание источника.",
      body: `Таблица показывает точные числа, рисунок (график) — тенденции и сравнение. Не повторяйте одни и те же данные и в таблице, и на графике.

## Правила

- Каждый объект нумеруется: таблица 1, таблица 2; рисунок 1, рисунок 2.
- **Подпись таблицы — сверху**, подпись рисунка — снизу.
- В тексте есть ссылка на каждый объект: «(таблица 1)».
- Единицы измерения — в заголовке столбца.
- Под рисунком из другого источника указывается источник.`,
      example: `Таблица 1. Урожайность хлопка и расход воды по способу орошения (2025 г.)
- Столбцы: Способ | Урожайность, ц/га | Расход воды, м³/га
- Источник: данные автора.`,
      exercise: "Оформите один из своих результатов в виде таблицы и напишите подпись.",
    },
    en: {
      title: "Tables and figures",
      summary: "Captions, numbering, sources.",
      body: `A table shows exact numbers; a figure (chart) shows trends and comparisons. Do not show the same data in both a table and a chart.

## Rules

- Each is numbered: Table 1, Table 2; Figure 1, Figure 2.
- **A table caption goes above**, a figure caption below.
- The text refers to each one: “(Table 1)”.
- Units go in the column heading.
- A figure taken from another source credits it underneath.`,
      example: `Table 1. Cotton yield and water use by irrigation method (2025)
- Columns: Method | Yield, c/ha | Water use, m³/ha
- Source: author’s data.`,
      exercise: "Turn one of your results into a table and write its caption.",
    },
  },
  "taqrizchiga-javob-yozish": {
    ru: {
      title: "Ответ рецензенту",
      summary: "Точный и вежливый ответ на замечания.",
      body: `Рецензия — возможность улучшить статью. Ответное письмо должно облегчить работу рецензента.

## Структура

- Короткая благодарность.
- Каждое замечание отдельно: само замечание → ваш ответ → что и где изменено в тексте (раздел, страница).
- Если вы не согласны — вежливо объясните причину с доводами и источником.

## Чего не делать

- Не оставляйте замечание без ответа.
- Не пишите «рецензент неправильно понял» — сделайте текст яснее.`,
      example: `Замечание: «В методах не указан объём выборки.»
Ответ: «Спасибо. В раздел 2.1 добавлены объём выборки (n = 48 участков) и способ отбора (с. 4).»`,
      exercise: "Напишите ответ из двух предложений на примерное замечание.",
    },
    en: {
      title: "Responding to reviewers",
      summary: "A clear and polite answer to comments.",
      body: `A review is a chance to improve the article. Your response letter should make the reviewer’s work easier.

## Structure

- A short thank-you.
- Each comment separately: the comment → your answer → what changed in the text and where (section, page).
- If you disagree, explain why politely, with arguments and a source.

## Don’t

- Leave a comment unanswered.
- Write “the reviewer misunderstood” — make the text clearer instead.`,
      example: `Comment: “The methods do not state the sample size.”
Answer: “Thank you. Section 2.1 now gives the sample size (n = 48 plots) and how they were selected (p. 4).”`,
      exercise: "Write a two-sentence answer to a sample reviewer comment.",
    },
  },
};
