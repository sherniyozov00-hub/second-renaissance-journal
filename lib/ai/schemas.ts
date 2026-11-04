import { z } from "zod";

/**
 * Shapes of Xorazmiy AI answers (TZ 10.3). The model returns them through
 * structured outputs or a strict tool; every answer is validated again here
 * before it reaches the database or the browser. Client-safe module.
 */

export const VERDICTS = ["correct", "incorrect", "needs_source"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const ClaimsSchema = z.object({
  claims: z
    .array(
      z.object({
        /** Exact substring of the paragraph. */
        text: z.string().min(3).max(400),
        /** Why it is checkable: number, date, name, cause, cited result. */
        kind: z.enum(["number", "date", "name", "cause", "cited", "other"]),
      }),
    )
    .max(12),
});

export const SourceSchema = z.object({
  title: z.string().min(1).max(300),
  url: z.string().max(600),
  publisher: z.string().max(200).nullable(),
  year: z.number().int().min(1000).max(2100).nullable(),
});
export type FactSource = z.infer<typeof SourceSchema>;

/** Input of the `submit_verdicts` tool the model calls after searching. */
export const VerdictsSchema = z.object({
  verdicts: z.array(
    z.object({
      id: z.string().max(20),
      verdict: z.enum(VERDICTS),
      explanation: z.string().min(1).max(800),
      correction: z.string().max(400).nullable(),
      sources: z.array(SourceSchema).max(5),
    }),
  ),
});
export type ModelVerdict = z.infer<typeof VerdictsSchema>["verdicts"][number];

/** What we store per claim and send to the browser. */
export type FactResult = {
  id: string;
  paragraph: number;
  text: string;
  verdict: Verdict;
  explanation: string;
  correction: string | null;
  sources: FactSource[];
  /** Set when the platform changed the model's verdict (TZ 10.2 rules). */
  downgraded?: "no_source" | "unverified_source";
};

export type FactSummary = { correct: number; incorrect: number; needs_source: number };

export type FactEvent =
  | { type: "start"; paragraphs: number; mock: boolean }
  | { type: "progress"; paragraph: number; claims: number; cached: boolean }
  | { type: "result"; result: FactResult }
  | { type: "done"; summary: FactSummary; checkId: string | null; truncated: boolean }
  | { type: "error"; code: AiErrorCode };

export type AiErrorCode =
  | "quota"
  | "premium_limit"
  | "too_long"
  | "empty"
  | "rate_limit"
  | "unavailable"
  | "refused"
  | "forbidden"
  | "premium_required"
  | "daily_limit";

export const EditsSchema = z.object({
  edits: z
    .array(
      z.object({
        paragraph: z.number().int().min(0),
        /** Exact substring of that paragraph to replace. */
        original: z.string().min(1).max(800),
        /** The best fix — shown as a tracked change. */
        replacement: z.string().max(800),
        /** Other ways to fix it; the author picks one ("variantlar"). */
        alternatives: z.array(z.string().max(800)).max(2),
        kind: z.enum([
          "spelling",
          "punctuation",
          "style",
          "clarity",
          "terminology",
          "academic",
          // Meaning: the sentence says something other than the author means, or is wrong in context.
          "meaning",
          // Logic: a contradiction, a conclusion that does not follow, a broken link between sentences.
          "logic",
        ]),
        /** Why, in the author's interface language. */
        reason: z.string().min(1).max(400),
      }),
    )
    .max(30),
});
export type EditSuggestion = z.infer<typeof EditsSchema>["edits"][number] & { id: string };

export const PlanSchema = z.object({
  research_question: z.string().max(600),
  hypothesis: z.string().max(600).nullable(),
  sections: z
    .array(
      z.object({
        title: z.string().max(120),
        purpose: z.string().max(600),
        points: z.array(z.string().max(300)).max(8),
        sample_sentence: z.string().max(300).nullable(),
      }),
    )
    .max(10),
  keywords: z.array(z.string().max(60)).max(8),
  next_steps: z.array(z.string().max(300)).max(6),
});
export type Plan = z.infer<typeof PlanSchema>;

export const AssistSchema = z.object({
  summary: z.string().max(800),
  strengths: z.array(z.string().max(300)).max(5),
  questions: z.array(z.string().max(300)).max(8),
  advice: z
    .array(
      z.object({
        issue: z.string().max(300),
        how_to_fix: z.string().max(600),
        sample_sentence: z.string().max(300).nullable(),
      }),
    )
    .max(8),
});
export type Assist = z.infer<typeof AssistSchema>;

/** "Tekshirib ber": the review agent's report on a draft. */
export const REVIEW_CATEGORIES = [
  "numbers",
  "facts",
  "consistency",
  "method",
  "claims",
  "structure",
  "sources",
  "language",
] as const;
export const ReviewSchema = z.object({
  summary: z.string().max(1000),
  strengths: z.array(z.string().max(300)).max(5),
  issues: z
    .array(
      z.object({
        category: z.enum(REVIEW_CATEGORIES),
        severity: z.enum(["high", "medium", "low"]),
        quote: z.string().max(400).nullable(),
        problem: z.string().max(700),
        how_to_fix: z.string().max(700),
        sources: z.array(z.object({ title: z.string().max(300), url: z.string().max(600) })).max(3),
      }),
    )
    .max(15),
  next_steps: z.array(z.string().max(300)).max(5),
});
export type Review = z.infer<typeof ReviewSchema>;
export type ReviewIssue = Review["issues"][number];

export const TranslateSchema = z.object({
  title_en: z.string().max(400),
  abstract_en: z.string().max(4000),
  title_ru: z.string().max(400),
  abstract_ru: z.string().max(4000),
  notes: z.array(z.string().max(300)).max(5),
});
export type Translation = z.infer<typeof TranslateSchema>;

/** Bibliography entry built in the workspace (Draft.references). */
export type DraftReference = {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  journal: string | null;
  doi: string | null;
  url: string;
  /** DOI confirmed by Crossref (TZ 10.2); unverified entries are labelled. */
  verified: boolean;
};

export type ScholarItem = DraftReference & {
  abstract: string | null;
  source: "openalex" | "crossref" | "semanticscholar";
  citedBy: number | null;
};

export type ChatMessage = { role: "user" | "assistant"; text: string };

export const AI_FEATURES = [
  "plan",
  "assist",
  "edit",
  "sources",
  "factcheck",
  "originality",
  "citations",
  "translate",
  "chat",
  "review",
  "mentor",
] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

/** Interface language: AI explanations come back in it (the text keeps its own language). */
export const AI_LANGS = ["uz", "ru", "en"] as const;
export type AiLang = (typeof AI_LANGS)[number];
export const parseLang = (v: unknown): AiLang =>
  AI_LANGS.includes(v as AiLang) ? (v as AiLang) : "uz";
