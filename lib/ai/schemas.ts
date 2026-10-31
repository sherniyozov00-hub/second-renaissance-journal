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
      explanation_uz: z.string().min(1).max(800),
      correction_uz: z.string().max(400).nullable(),
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
  "quota" | "too_long" | "empty" | "rate_limit" | "unavailable" | "refused" | "forbidden";

export const EditsSchema = z.object({
  edits: z
    .array(
      z.object({
        paragraph: z.number().int().min(0),
        /** Exact substring of that paragraph to replace (may be empty only for pure insertions). */
        original: z.string().min(1).max(500),
        replacement: z.string().max(500),
        kind: z.enum(["spelling", "punctuation", "style", "clarity", "terminology", "academic"]),
        reason_uz: z.string().min(1).max(300),
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

export const TranslateSchema = z.object({
  title_en: z.string().max(400),
  abstract_en: z.string().max(4000),
  title_ru: z.string().max(400),
  abstract_ru: z.string().max(4000),
  notes_uz: z.array(z.string().max(300)).max(5),
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
] as const;
export type AiFeature = (typeof AI_FEATURES)[number];
