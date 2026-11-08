import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { getSecret } from "@/lib/secrets";
import { getSettings } from "@/lib/settings/get";
import { spendOf, type Spend } from "./pricing";
import type { AiErrorCode } from "./schemas";

/**
 * The only place that talks to the Claude API (TZ 10.4: the key stays on the
 * server). Without ANTHROPIC_API_KEY — or with AI_MODE=mock — every feature
 * runs a deterministic mock so the workspace, tests and CI work offline; the
 * UI labels such answers "sinov rejimi".
 */
export async function aiMode(): Promise<"live" | "mock"> {
  if (process.env.AI_MODE === "mock") return "mock";
  return (await getSecret("ANTHROPIC_API_KEY")) ? "live" : "mock";
}

export class AiError extends Error {
  constructor(public code: AiErrorCode) {
    super(code);
  }
}

let client: { key: string; impl: Anthropic } | null = null;
/** The key comes from the environment or the admin panel (Integratsiyalar). */
export async function anthropic(): Promise<Anthropic> {
  const apiKey = await getSecret("ANTHROPIC_API_KEY");
  if (client?.key !== apiKey)
    client = { key: apiKey, impl: new Anthropic({ apiKey, timeout: 180_000, maxRetries: 2 }) };
  return client.impl;
}

export async function aiModel(): Promise<string> {
  const s = await getSettings();
  return String(s["ai.model"] || "claude-opus-5-5");
}

/** Model for the fact check: searching and comparing numbers needs no large model. */
export async function factCheckModel(): Promise<string> {
  const s = await getSettings();
  return String(s["ai.factcheckModel"] || (await aiModel()));
}

/** Web search tool: dynamic filtering (fewer tokens) where the model supports it. */
export function webSearchTool(model: string, maxUses: number): Anthropic.Beta.BetaToolUnion {
  return model.startsWith("claude-haiku")
    ? { type: "web_search_20250305", name: "web_search", max_uses: maxUses }
    : { type: "web_search_20260209", name: "web_search", max_uses: maxUses };
}

/**
 * Server-side refusal fallback: if the model declines for policy reasons, the
 * API reruns the request on the model's default fallback. Models without
 * fallbacks simply ignore "default".
 */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export type Effort = "low" | "medium" | "high";

/**
 * Stable instructions first, marked for prompt caching (tools → system → messages).
 * One-hour TTL: the system prompt (persona + knowledge base, ~10k tokens) is
 * shared by every author writing the same article type, and on a small site
 * requests that share it are usually 5–60 minutes apart — the window where
 * the 1-hour entry pays for its 2× write.
 */
export function systemBlocks(text: string): Anthropic.Beta.BetaTextBlockParam[] {
  return [{ type: "text", text, cache_control: { type: "ephemeral", ttl: "1h" } }];
}

/**
 * One structured call: the answer must match `schema` (structured outputs)
 * and is validated again with zod. Returns the parsed value and its cost.
 */
export async function structured<S extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: S;
  effort: Effort;
  maxTokens?: number;
  /** Defaults to the "ai.model" setting. */
  model?: string;
}): Promise<{ data: z.infer<S>; spend: Spend; model: string }> {
  const model = opts.model ?? (await aiModel());
  try {
    const res = await (
      await anthropic()
    ).beta.messages.parse({
      model,
      max_tokens: opts.maxTokens ?? 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: systemBlocks(opts.system),
      output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
      messages: [{ role: "user", content: opts.prompt }],
    });
    const spend = spendOf(model, res.usage);
    if (res.stop_reason === "refusal") throw new AiError("refused");
    const parsed = opts.schema.safeParse(res.parsed_output);
    if (!parsed.success) throw new AiError("unavailable");
    return { data: parsed.data, spend, model: res.model ?? model };
  } catch (e) {
    throw toAiError(e);
  }
}

/** Plain-text answer (chat). */
export async function textAnswer(opts: {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  effort: Effort;
}): Promise<{ text: string; spend: Spend; model: string }> {
  const model = await aiModel();
  try {
    const res = await (
      await anthropic()
    ).beta.messages.create({
      model,
      max_tokens: 8000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: systemBlocks(opts.system),
      output_config: { effort: opts.effort },
      messages: opts.messages,
    });
    if (res.stop_reason === "refusal") throw new AiError("refused");
    const text = res.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("")
      .trim();
    return { text, spend: spendOf(model, res.usage), model: res.model ?? model };
  } catch (e) {
    throw toAiError(e);
  }
}

export function toAiError(e: unknown): AiError {
  if (e instanceof AiError) return e;
  if (e instanceof Anthropic.RateLimitError) return new AiError("rate_limit");
  console.error("[ai]", e);
  return new AiError("unavailable");
}
