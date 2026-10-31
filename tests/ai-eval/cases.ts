import type { ArticleType } from "@/generated/prisma/client";
import type { Verdict } from "@/lib/ai/schemas";

/**
 * Golden cases for Xorazmiy AI (stage 6 "training"). `npm run ai:eval` runs
 * them after every change to prompts or the knowledge base. Cases marked
 * `liveOnly` need ANTHROPIC_API_KEY (real web search); the rest also run
 * offline in CI against the mock, which guards the platform rules.
 */

export type FactCase = {
  name: string;
  articleType: ArticleType;
  text: string;
  /** Claim substring → expected verdict. */
  expect: { claim: string; verdict: Verdict }[];
  liveOnly?: boolean;
};

export type PlanCase = {
  name: string;
  articleType: ArticleType;
  title: string;
  /** Section names that must appear (case-insensitive substring). */
  sections: string[];
  liveOnly?: boolean;
};

export type EditCase = {
  name: string;
  text: string;
  /** Substrings that a good edit set must touch. */
  mustTouch: string[];
  liveOnly?: boolean;
};

export const FACT_CASES: FactCase[] = [
  {
    name: "Ekran 3 namunasi",
    articleType: "RESEARCH",
    text: "Paxta O‘zbekistonning asosiy qishloq xo‘jaligi ekinlaridan biri hisoblanadi. Tomchilatib sug‘orish 2010-yilda ixtiro qilingan va bugun ko‘plab mamlakatlarda qo‘llaniladi.\nTadqiqotlarga ko‘ra, bu usul suvni 70% gacha tejaydi.",
    expect: [
      { claim: "Paxta O‘zbekistonning asosiy", verdict: "correct" },
      { claim: "2010-yilda ixtiro qilingan", verdict: "incorrect" },
      { claim: "70% gacha", verdict: "needs_source" },
    ],
  },
  {
    name: "Tarixiy sanalar",
    articleType: "POPULAR",
    text: "Muhammad ibn Muso al-Xorazmiy XV asrda Samarqandda yashagan olim bo‘lib, algebra faniga asos solgan. Amir Temur 1336-yilda Kesh yaqinida tug‘ilgan.",
    expect: [
      { claim: "XV asrda", verdict: "incorrect" },
      { claim: "1336-yilda", verdict: "correct" },
    ],
    liveOnly: true,
  },
  {
    name: "Geografiya va statistika",
    articleType: "REVIEW",
    text: "O‘zbekistonning poytaxti Toshkent shahri hisoblanadi. Orol dengizi 1960-yildan beri hajmining katta qismini yo‘qotgan.",
    expect: [
      { claim: "poytaxti Toshkent", verdict: "correct" },
      { claim: "Orol dengizi", verdict: "correct" },
    ],
    liveOnly: true,
  },
];

export const PLAN_CASES: PlanCase[] = [
  {
    name: "IMRAD reja",
    articleType: "RESEARCH",
    title: "Tomchilatib sug‘orishning paxta hosildorligiga ta’siri",
    sections: ["kirish", "usul", "natija", "muhokama", "xulosa"],
  },
  {
    name: "Sharh rejasi",
    articleType: "REVIEW",
    title: "O‘zbekistonda suv tejovchi texnologiyalar bo‘yicha tadqiqotlar sharhi",
    sections: ["kirish", "usul", "muhokama", "xulosa"],
    liveOnly: true,
  },
  {
    name: "Keys-stadi rejasi",
    articleType: "CASE_STUDY",
    title: "Farg‘ona vodiysidagi fermer xo‘jaligida issiqxona loyihasi",
    sections: ["holat", "tahlil", "xulosa"],
    liveOnly: true,
  },
];

export const EDIT_CASES: EditCase[] = [
  {
    name: "Ortiqcha kirish so‘zi va imlo",
    text: "Ushbu maqolada biz shuni ko‘rib chiqamizki tomchilatib sug‘orishning kichik xo'jaliklar uchun qanchalik o‘zini oqlashi baholanadi.",
    mustTouch: ["biz shuni ko‘rib chiqamizki", "xo'jaliklar"],
  },
];
