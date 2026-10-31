import { uzTypography } from "@/lib/text/uz";
import type {
  AiLang,
  Assist,
  EditSuggestion,
  FactSource,
  ModelVerdict,
  Plan,
  Translation,
} from "./schemas";
import { locateInParagraph } from "./text";

/**
 * Offline stand-in for Claude (no ANTHROPIC_API_KEY, or AI_MODE=mock):
 * deterministic, honest answers so the workspace, tests and CI run without
 * the network. It never invents a verdict it cannot back: apart from a few
 * well-known demo facts, every claim is "needs_source". Answers are labelled
 * "sinov rejimi" in the UI.
 */

type DemoFact = {
  match: RegExp;
  verdict: ModelVerdict["verdict"];
  explanation: string;
  correction?: string;
  sources: FactSource[];
};

const DEMO_FACTS: DemoFact[] = [
  {
    match: /paxta o‘zbekistonning asosiy qishloq xo‘jaligi ekinlaridan biri/i,
    verdict: "correct",
    explanation:
      "Paxta O‘zbekistonning asosiy eksport ekinlaridan biri sifatida keng qayd etilgan.",
    sources: [
      {
        title: "Agriculture in Uzbekistan",
        url: "https://en.wikipedia.org/wiki/Agriculture_in_Uzbekistan",
        publisher: "Wikipedia",
        year: null,
      },
    ],
  },
  {
    match: /tomchilatib sug‘orish 20\d\d-yilda ixtiro qilingan/i,
    verdict: "incorrect",
    explanation:
      "Zamonaviy tomchilatib sug‘orish tizimlari 1960-yillarda Isroilda keng tarqalgan. Sanani tuzatish yoki manba bilan aniqlashtirish tavsiya etiladi.",
    correction: "Tomchilatib sug‘orish 1960-yillarda Isroilda keng tarqalgan",
    sources: [
      {
        title: "Drip irrigation",
        url: "https://en.wikipedia.org/wiki/Drip_irrigation",
        publisher: "Wikipedia",
        year: null,
      },
    ],
  },
];

const CHECKABLE = /\d|birinchi|eng katta|eng ko‘p|asosiy|ixtiro|kashf|sababli|tufayli/i;

export function mockClaims(paragraph: string): { text: string }[] {
  const out: { text: string }[] = [];
  const typed = uzTypography(paragraph);
  for (const fact of DEMO_FACTS) {
    const m = typed.match(fact.match);
    const located = m ? locateInParagraph(paragraph, m[0]) : null;
    if (located) out.push({ text: located });
  }
  for (const sentence of paragraph.split(/(?<=[.!?])\s+/)) {
    const s = sentence.replace(/[.!?]+$/, "").trim();
    if (s.split(/\s+/).length < 4 || !CHECKABLE.test(s)) continue;
    if (out.some((c) => s.includes(c.text) || c.text.includes(s))) continue;
    // Prefer the clause with the number, as Ekran 3 marks "bu usul suvni 70% gacha tejaydi".
    const clause = s.split(/,\s+/).find((c) => /\d/.test(c) && c.split(/\s+/).length >= 3) ?? s;
    out.push({ text: clause.trim() });
  }
  return out.slice(0, 6);
}

const NEEDS_SOURCE = {
  number: {
    uz: "Raqam uchun havola yo‘q. Rasmiy statistika yoki ilmiy maqoladan manba ko‘rsating.",
    ru: "Для числа нет ссылки. Укажите официальную статистику или научную статью.",
    en: "The number has no reference. Cite official statistics or a scholarly article.",
  },
  claim: {
    uz: "Da’voni tasdiqlovchi manba ko‘rsating.",
    ru: "Укажите источник, подтверждающий утверждение.",
    en: "Cite a source that supports the claim.",
  },
} satisfies Record<string, L10n>;

export function mockVerdict(id: string, claim: string, lang: AiLang = "uz"): ModelVerdict {
  const typed = uzTypography(claim);
  const fact = DEMO_FACTS.find((f) => f.match.test(typed));
  if (fact) {
    return {
      id,
      verdict: fact.verdict,
      explanation: fact.explanation,
      correction: fact.correction ?? null,
      sources: fact.sources,
    };
  }
  return {
    id,
    verdict: "needs_source",
    explanation: NEEDS_SOURCE[/\d/.test(claim) ? "number" : "claim"][lang],
    correction: null,
    sources: [],
  };
}

/** URLs the mock "retrieved", so the demo sources pass the source rule like real search results. */
export const MOCK_RETRIEVED = DEMO_FACTS.flatMap((f) => f.sources.map((s) => s.url));

type L10n = Record<AiLang, string>;

const REASONS = {
  mixed: {
    uz: "Ortiqcha kirish so‘zi va ikki xil gap qurilishi aralashgan («ko‘rib chiqamizki … baholanadi») — ma’no chalkashadi. Quyidagi variantlardan birini tanlang.",
    ru: "Лишняя вводная фраза и смешаны две конструкции («рассмотрим, что … оценивается») — смысл путается. Выберите один из вариантов.",
    en: "A redundant lead-in mixes two constructions (“we consider that … is assessed”), so the meaning blurs. Pick one of the variants.",
  },
  wordy: {
    uz: "Ortiqcha kirish ibora; ilmiy matnda fikrni darhol ayting.",
    ru: "Лишняя вводная фраза: в научном тексте мысль формулируют сразу.",
    en: "Redundant lead-in: state the point directly in academic writing.",
  },
  vague: {
    uz: "Baholovchi so‘z ilmiy uslubga mos emas; raqam bilan ko‘rsating.",
    ru: "Оценочное слово не подходит научному стилю; укажите число.",
    en: "An evaluative word does not suit academic style; give a number instead.",
  },
  colloquial: {
    uz: "So‘zlashuv iborasi; ilmiy atama ishlating.",
    ru: "Разговорное выражение; используйте научный термин.",
    en: "Colloquial phrase; use a technical term.",
  },
  apostrophe: {
    uz: "o‘ va g‘ harflari ‘ (U+2018) belgisi bilan yoziladi.",
    ru: "Узбекские буквы o‘ и g‘ пишутся со знаком ‘ (U+2018).",
    en: "The Uzbek letters o‘ and g‘ are written with ‘ (U+2018).",
  },
  spaceBefore: {
    uz: "Tinish belgisidan oldin bo‘sh joy qo‘yilmaydi.",
    ru: "Перед знаком препинания пробел не ставится.",
    en: "No space before a punctuation mark.",
  },
  doubleSpace: { uz: "Ortiqcha bo‘sh joy.", ru: "Лишний пробел.", en: "Extra space." },
} satisfies Record<string, L10n>;

/** Sentence-level demo of a "meaning" finding with variants (Ekran 3 sample sentence). */
const MIXED =
  /ushbu maqolada biz shuni ko‘rib chiqamizki (.+?) (qanchalik o‘zini oqlashi) baholanadi/i;

const WORDY: [RegExp, string, keyof typeof REASONS][] = [
  [/\bshuni aytish kerakki,?\s*/i, "", "wordy"],
  [/\bjuda ham\b/i, "", "vague"],
  [/\beng zo‘r\b/i, "eng samarali", "colloquial"],
];

export function mockEdits(paragraphs: string[], lang: AiLang = "uz"): Omit<EditSuggestion, "id">[] {
  const edits: Omit<EditSuggestion, "id">[] = [];
  paragraphs.forEach((p, paragraph) => {
    const typed = uzTypography(p);
    const mixed = typed.match(MIXED);
    const sentence = mixed ? locateInParagraph(p, mixed[0]) : null;
    if (mixed && sentence) {
      const subject = mixed[1]!;
      edits.push({
        paragraph,
        original: sentence,
        replacement: `Ushbu maqolada ${subject} ${mixed[2]} baholanadi`,
        alternatives: [
          `Ushbu maqolada ${subject} iqtisodiy jihatdan ${mixed[2]} baholanadi`,
          `Maqolada ${subject.replace(/ning\b/, "")} samaradorligi baholanadi`,
        ],
        kind: "meaning",
        reason: REASONS.mixed[lang],
      });
    }
    // Without the full sentence pattern, the lead-in alone is still a style fix.
    const rules: typeof WORDY = sentence
      ? WORDY
      : [[/\s*\bbiz shuni ko‘rib chiqamizki\b/i, "", "wordy"], ...WORDY];
    for (const [re, replacement, reason] of rules) {
      const m = typed.match(re);
      const original = m ? locateInParagraph(p, m[0]) : null;
      if (original)
        edits.push({
          paragraph,
          original,
          replacement,
          alternatives: [],
          kind: "style",
          reason: REASONS[reason][lang],
        });
    }
    for (const m of p.matchAll(/[A-Za-z]*[oOgG]['`ʻʼ’][\p{L}]+/gu)) {
      const fixed = uzTypography(m[0]);
      if (fixed !== m[0])
        edits.push({
          paragraph,
          original: m[0],
          replacement: fixed,
          alternatives: [],
          kind: "spelling",
          reason: REASONS.apostrophe[lang],
        });
    }
    for (const m of p.matchAll(/ {2,}|\s+([,.;:])/g)) {
      edits.push({
        paragraph,
        original: m[0],
        replacement: m[1] ?? " ",
        alternatives: [],
        kind: "punctuation",
        reason: m[1] ? REASONS.spaceBefore[lang] : REASONS.doubleSpace[lang],
      });
    }
  });
  return edits.slice(0, 30);
}

export function mockPlan(title: string): Plan {
  return {
    research_question: `“${title}” mavzusida aniq, tekshiriladigan savol tuzing: kim/nima, qayerda, qachon, qaysi ko‘rsatkich bo‘yicha?`,
    hypothesis:
      "Gipoteza raqam bilan o‘lchanadigan kutilgan natijani aytadi (masalan, “… kamida 10 % oshiradi”).",
    sections: [
      {
        title: "Kirish",
        purpose: "Dolzarblik, ma’lum bo‘lgan narsalar, bo‘shliq va maqsad.",
        points: [
          "Muammoning ko‘lami raqam va manba bilan",
          "Oldingi 5–7 tadqiqot",
          "Tadqiqot savoli",
        ],
        sample_sentence: null,
      },
      {
        title: "Materiallar va usullar",
        purpose: "Tadqiqotni takrorlash mumkin bo‘lgan darajadagi tavsif.",
        points: ["Joy, vaqt, ob’ekt", "Namuna hajmi", "Statistik tahlil"],
        sample_sentence: null,
      },
      {
        title: "Natijalar",
        purpose: "Topilgan narsa, izohsiz, jadval va rasmlar bilan.",
        points: ["Asosiy ko‘rsatkichlar", "Jadval va rasmlarga havola"],
        sample_sentence: null,
      },
      {
        title: "Muhokama",
        purpose: "Natijalarning ma’nosi va boshqa tadqiqotlar bilan solishtirish.",
        points: ["Solishtirish", "Cheklovlar", "Amaliy ahamiyat"],
        sample_sentence: null,
      },
      {
        title: "Xulosa",
        purpose: "Tadqiqot savoliga javob va tavsiyalar.",
        points: ["Asosiy natija raqam bilan", "Tavsiya"],
        sample_sentence: null,
      },
    ],
    keywords: [],
    next_steps: [
      "Kirish uchun 5 ta xalqaro manba toping (“Xalqaro manbalar”).",
      "Usullar bo‘limini birinchi yozing — u eng aniq qism.",
    ],
  };
}

export function mockAssist(): Assist {
  return {
    summary:
      "Sinov rejimi: matn tuzilmasi bo‘yicha umumiy tavsiyalar. To‘liq tahlil AI kaliti ulanganda ishlaydi.",
    strengths: [],
    questions: [
      "Bu bo‘limda o‘quvchi qaysi savolga javob olishi kerak?",
      "Har bir raqamning manbasi ko‘rsatilganmi?",
    ],
    advice: [
      {
        issue: "Jumlalar uzunligi",
        how_to_fix: "35 so‘zdan uzun jumlalarni ikkiga bo‘ling: bir jumla — bitta fikr.",
        sample_sentence: null,
      },
    ],
  };
}

export function mockTranslation(title: string, abstract: string, lang: AiLang = "uz"): Translation {
  const note = {
    uz: "Sinov rejimi: haqiqiy tarjima AI kaliti ulanganda ishlaydi.",
    ru: "Тестовый режим: настоящий перевод работает при подключённом ключе ИИ.",
    en: "Test mode: real translation works once the AI key is connected.",
  }[lang];
  return {
    title_en: `[EN] ${title}`,
    abstract_en: `[EN] ${abstract}`,
    title_ru: `[RU] ${title}`,
    abstract_ru: `[RU] ${abstract}`,
    notes: [note],
  };
}

export function mockChat(question: string, lang: AiLang = "uz"): string {
  const q = question.slice(0, 80);
  return {
    uz: `Sinov rejimi: Xorazmiy AI hozir oflayn ishlayapti, shuning uchun “${q}” savoliga to‘liq javob bera olmaydi. Asboblar paneli (reja, tahrir, manbalar, originallik, iqtiboslar) ishlaydi.`,
    ru: `Тестовый режим: Xorazmiy AI сейчас работает офлайн и не может полностью ответить на вопрос «${q}». Панель инструментов (план, правки, источники, оригинальность, цитаты) работает.`,
    en: `Test mode: Xorazmiy AI is offline, so it cannot fully answer “${q}”. The tools (outline, edits, sources, originality, citations) still work.`,
  }[lang];
}
