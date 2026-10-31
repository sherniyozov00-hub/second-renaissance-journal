import type { DocNode } from "@/lib/ai/doc";
import { draftToDocx } from "@/lib/ai/docx-export";

/**
 * The journal's .docx template (TZ 15, 16): the required structure with a
 * short instruction under every heading. Numbers come from Settings.
 */
export type TemplateRequirements = {
  minWords: number;
  maxWords: number;
  minReferences: number;
};

const h = (text: string): DocNode => ({
  type: "heading",
  attrs: { level: 2 },
  content: [{ type: "text", text }],
});
const p = (text: string, italic = false): DocNode => ({
  type: "paragraph",
  content: [{ type: "text", text, ...(italic ? { marks: [{ type: "italic" }] } : {}) }],
});
const b = (label: string, text: string): DocNode => ({
  type: "paragraph",
  content: [
    { type: "text", text: `${label} `, marks: [{ type: "bold" }] },
    { type: "text", text },
  ],
});

type Lang = "uz" | "ru" | "en";

/** Template text per language; {min}/{max}/{refs} come from Settings. */
const TEXT: Record<Lang, Record<string, string>> = {
  uz: {
    title: "[Maqola sarlavhasi]",
    authors: "[Muallif Ismi Familiyasi¹, Hammuallif Ismi Familiyasi²]",
    aff1: "¹ [Muassasa (OTM) nomi, shahar, mamlakat], ORCID: 0000-0000-0000-0000, email",
    aff2: "² [Muassasa nomi, shahar, mamlakat]",
    abstract: "Annotatsiya.",
    abstractHint: "[150–250 so‘z: maqsad, usul, asosiy natija raqam bilan, xulosa.]",
    keywords: "Kalit so‘zlar:",
    keywordsHint: "[5–7 ta so‘z, vergul bilan]",
    abstractEn: "Abstract.",
    abstractEnHint: "[Annotatsiyaning inglizcha tarjimasi, 150–250 so‘z.]",
    keywordsEn: "Keywords:",
    keywordsEnHint: "[5–7 words]",
    intro: "1. Kirish",
    introHint:
      "[Mavzuning dolzarbligi (raqam va manba bilan), ma’lum bo‘lgan tadqiqotlar, hali o‘rganilmagan jihat va tadqiqot savoli yoki gipoteza. Oxirgi xatboshida maqsad.]",
    methods: "2. Materiallar va usullar",
    methodsHint:
      "[Joy, vaqt, ob’ekt, namuna hajmi, asboblar, o‘lchov va statistik tahlil usullari — boshqa tadqiqotchi takrorlay oladigan darajada.]",
    results: "3. Natijalar",
    resultsHint:
      "[Topilgan natijalar izohsiz; har bir jadval va rasmga matnda havola bering (1-jadval).]",
    table: "1-jadval.",
    tableHint: "[Jadval nomi — jadval ustida] (birliklar ustun sarlavhasida)",
    col1: "Ko‘rsatkich",
    col2: "1-guruh",
    col3: "2-guruh",
    source: "Manba: [muallif ma’lumotlari yoki manba]",
    figure: "1-rasm.",
    figureHint: "[Rasm nomi — rasm ostida]. Manba: [ … ]",
    discussion: "4. Muhokama",
    discussionHint:
      "[Natijalar nimani anglatadi, boshqa tadqiqotlar bilan solishtirish (manba bilan), cheklovlar, amaliy ahamiyat.]",
    conclusion: "5. Xulosa",
    conclusionHint:
      "[Tadqiqot savoliga aniq javob, asosiy raqamli natija, tavsiyalar. Yangi ma’lumot kiritilmaydi.]",
    refs: "Foydalanilgan adabiyotlar",
    refsHint:
      "[Kamida {refs} ta manba, APA 7 formatida, alifbo tartibida; iloji bo‘lsa DOI bilan, bir qismi xalqaro.]",
    ref1: "Familiya, I. I., & Familiya, I. (Yil). Maqola nomi. Jurnal nomi, jild(son), betlar. https://doi.org/10.xxxx/xxxxx",
    ref2: "Familiya, I. (Yil). Kitob nomi. Nashriyot.",
    rules:
      "[Talablar: maqola hajmi {min}–{max} so‘z (adabiyotlarsiz), Times New Roman 14, 1,5 interval, .docx, 10 MB gacha. Ushbu qavsli izohlarni yuborishdan oldin o‘chiring.]",
  },
  ru: {
    title: "[Название статьи]",
    authors: "[Имя Фамилия автора¹, Имя Фамилия соавтора²]",
    aff1: "¹ [Название организации (вуза), город, страна], ORCID: 0000-0000-0000-0000, email",
    aff2: "² [Название организации, город, страна]",
    abstract: "Аннотация.",
    abstractHint: "[150–250 слов: цель, метод, главный результат с числом, вывод.]",
    keywords: "Ключевые слова:",
    keywordsHint: "[5–7 слов через запятую]",
    abstractEn: "Abstract.",
    abstractEnHint: "[Английский перевод аннотации, 150–250 слов.]",
    keywordsEn: "Keywords:",
    keywordsEnHint: "[5–7 words]",
    intro: "1. Введение",
    introHint:
      "[Актуальность темы (с числами и источниками), известные исследования, неизученный аспект и исследовательский вопрос или гипотеза. В последнем абзаце — цель.]",
    methods: "2. Материалы и методы",
    methodsHint:
      "[Место, время, объект, объём выборки, приборы, методы измерений и статистического анализа — настолько подробно, чтобы работу можно было повторить.]",
    results: "3. Результаты",
    resultsHint:
      "[Полученные результаты без интерпретации; ссылайтесь в тексте на каждую таблицу и рисунок (таблица 1).]",
    table: "Таблица 1.",
    tableHint: "[Название таблицы — над таблицей] (единицы — в заголовке столбца)",
    col1: "Показатель",
    col2: "Группа 1",
    col3: "Группа 2",
    source: "Источник: [данные автора или источник]",
    figure: "Рисунок 1.",
    figureHint: "[Название рисунка — под рисунком]. Источник: [ … ]",
    discussion: "4. Обсуждение",
    discussionHint:
      "[Что означают результаты, сравнение с другими исследованиями (со ссылками), ограничения, практическая значимость.]",
    conclusion: "5. Заключение",
    conclusionHint:
      "[Чёткий ответ на исследовательский вопрос, главный числовой результат, рекомендации. Без новых данных.]",
    refs: "Список литературы",
    refsHint:
      "[Не менее {refs} источников в формате APA 7, в алфавитном порядке; по возможности с DOI, часть — международные.]",
    ref1: "Фамилия, И. О., & Фамилия, И. (Год). Название статьи. Название журнала, том(номер), страницы. https://doi.org/10.xxxx/xxxxx",
    ref2: "Фамилия, И. (Год). Название книги. Издательство.",
    rules:
      "[Требования: объём {min}–{max} слов (без литературы), Times New Roman 14, интервал 1,5, .docx, до 10 МБ. Удалите эти пояснения в скобках перед отправкой.]",
  },
  en: {
    title: "[Article title]",
    authors: "[Author First Last¹, Co-author First Last²]",
    aff1: "¹ [Institution (university), city, country], ORCID: 0000-0000-0000-0000, email",
    aff2: "² [Institution, city, country]",
    abstract: "Abstract.",
    abstractHint: "[150–250 words: aim, method, main result with a number, conclusion.]",
    keywords: "Keywords:",
    keywordsHint: "[5–7 words, comma-separated]",
    abstractEn: "Annotatsiya.",
    abstractEnHint: "[The abstract in Uzbek, 150–250 words.]",
    keywordsEn: "Kalit so‘zlar:",
    keywordsEnHint: "[5–7 ta so‘z]",
    intro: "1. Introduction",
    introHint:
      "[Why the topic matters (with numbers and sources), what is known, the gap, and the research question or hypothesis. State the aim in the last paragraph.]",
    methods: "2. Materials and methods",
    methodsHint:
      "[Site, period, object, sample size, instruments, measurement and statistical methods — in enough detail for another researcher to repeat the study.]",
    results: "3. Results",
    resultsHint:
      "[What you found, without interpretation; refer to every table and figure in the text (Table 1).]",
    table: "Table 1.",
    tableHint: "[Table title — above the table] (units in the column heading)",
    col1: "Indicator",
    col2: "Group 1",
    col3: "Group 2",
    source: "Source: [author’s data or source]",
    figure: "Figure 1.",
    figureHint: "[Figure title — below the figure]. Source: [ … ]",
    discussion: "4. Discussion",
    discussionHint:
      "[What the results mean, comparison with other studies (with citations), limitations, practical value.]",
    conclusion: "5. Conclusion",
    conclusionHint:
      "[A clear answer to the research question, the main numerical result, recommendations. No new data.]",
    refs: "References",
    refsHint:
      "[At least {refs} sources in APA 7, in alphabetical order; with DOIs where possible, some international.]",
    ref1: "Surname, I. I., & Surname, I. (Year). Article title. Journal Name, volume(issue), pages. https://doi.org/10.xxxx/xxxxx",
    ref2: "Surname, I. (Year). Book title. Publisher.",
    rules:
      "[Requirements: {min}–{max} words (without references), Times New Roman 14, 1.5 line spacing, .docx, up to 10 MB. Delete these bracketed notes before submitting.]",
  },
};

export function templateDoc(r: TemplateRequirements, lang: Lang = "uz"): DocNode {
  const x = TEXT[lang];
  const fill = (s: string) =>
    s
      .replace("{min}", String(r.minWords))
      .replace("{max}", String(r.maxWords))
      .replace("{refs}", String(r.minReferences));
  return {
    type: "doc",
    content: [
      p(x.authors!),
      p(x.aff1!),
      p(x.aff2!),
      b(x.abstract!, x.abstractHint!),
      b(x.keywords!, x.keywordsHint!),
      b(x.abstractEn!, x.abstractEnHint!),
      b(x.keywordsEn!, x.keywordsEnHint!),
      h(x.intro!),
      p(x.introHint!, true),
      h(x.methods!),
      p(x.methodsHint!, true),
      h(x.results!),
      p(x.resultsHint!, true),
      b(x.table!, x.tableHint!),
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [x.col1!, x.col2!, x.col3!].map((c) => ({
              type: "tableHeader",
              content: [p(c)],
            })),
          },
          {
            type: "tableRow",
            content: ["…", "…", "…"].map((c) => ({ type: "tableCell", content: [p(c)] })),
          },
        ],
      },
      p(x.source!, true),
      b(x.figure!, x.figureHint!),
      h(x.discussion!),
      p(x.discussionHint!, true),
      h(x.conclusion!),
      p(x.conclusionHint!, true),
      h(x.refs!),
      p(fill(x.refsHint!), true),
      p(x.ref1!),
      p(x.ref2!),
      p(fill(x.rules!), true),
    ],
  };
}

export function templateDocx(r: TemplateRequirements, lang: Lang = "uz") {
  return draftToDocx({ title: TEXT[lang].title!, body: templateDoc(r, lang), references: [] });
}
