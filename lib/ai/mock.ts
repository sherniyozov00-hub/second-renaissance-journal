import { uzTypography } from "@/lib/text/uz";
import type {
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

export function mockVerdict(id: string, claim: string): ModelVerdict {
  const typed = uzTypography(claim);
  const fact = DEMO_FACTS.find((f) => f.match.test(typed));
  if (fact) {
    return {
      id,
      verdict: fact.verdict,
      explanation_uz: fact.explanation,
      correction_uz: fact.correction ?? null,
      sources: fact.sources,
    };
  }
  return {
    id,
    verdict: "needs_source",
    explanation_uz: /\d/.test(claim)
      ? "Raqam uchun havola yo‘q. Rasmiy statistika yoki ilmiy maqoladan manba ko‘rsating."
      : "Da’voni tasdiqlovchi manba ko‘rsating.",
    correction_uz: null,
    sources: [],
  };
}

/** URLs the mock "retrieved", so the demo sources pass the source rule like real search results. */
export const MOCK_RETRIEVED = DEMO_FACTS.flatMap((f) => f.sources.map((s) => s.url));

const WORDY: [RegExp, string, string][] = [
  [/\s*\bbiz shuni ko‘rib chiqamizki\b/i, "", "Ortiqcha kirish so‘zi; jumla mazmuni o‘zgarmaydi."],
  [/\bshuni aytish kerakki,?\s*/i, "", "Ortiqcha kirish ibora; ilmiy matnda fikrni darhol ayting."],
  [/\bjuda ham\b/i, "", "Baholovchi so‘z ilmiy uslubga mos emas; raqam bilan ko‘rsating."],
  [/\beng zo‘r\b/i, "eng samarali", "So‘zlashuv iborasi; ilmiy atama ishlating."],
];

export function mockEdits(paragraphs: string[]): Omit<EditSuggestion, "id">[] {
  const edits: Omit<EditSuggestion, "id">[] = [];
  paragraphs.forEach((p, paragraph) => {
    for (const [re, replacement, reason] of WORDY) {
      const m = uzTypography(p).match(re);
      const original = m ? locateInParagraph(p, m[0]) : null;
      if (original)
        edits.push({ paragraph, original, replacement, kind: "style", reason_uz: reason });
    }
    for (const m of p.matchAll(/[A-Za-z]*[oOgG]['`ʻʼ’][\p{L}]+/gu)) {
      const fixed = uzTypography(m[0]);
      if (fixed !== m[0])
        edits.push({
          paragraph,
          original: m[0],
          replacement: fixed,
          kind: "spelling",
          reason_uz: "o‘ va g‘ harflari ‘ (U+2018) belgisi bilan yoziladi.",
        });
    }
    for (const m of p.matchAll(/ {2,}|\s+([,.;:])/g)) {
      edits.push({
        paragraph,
        original: m[0],
        replacement: m[1] ?? " ",
        kind: "punctuation",
        reason_uz: m[1] ? "Tinish belgisidan oldin bo‘sh joy qo‘yilmaydi." : "Ortiqcha bo‘sh joy.",
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

export function mockTranslation(title: string, abstract: string): Translation {
  return {
    title_en: `[EN] ${title}`,
    abstract_en: `[EN] ${abstract}`,
    title_ru: `[RU] ${title}`,
    abstract_ru: `[RU] ${abstract}`,
    notes_uz: ["Sinov rejimi: haqiqiy tarjima AI kaliti ulanganda ishlaydi."],
  };
}

export function mockChat(question: string): string {
  return `Sinov rejimi: Xorazmiy AI hozir oflayn ishlayapti, shuning uchun “${question.slice(0, 80)}” savoliga to‘liq javob bera olmaydi. Asboblar paneli (reja, tahrir, manbalar, originallik, iqtiboslar) ishlaydi.`;
}
