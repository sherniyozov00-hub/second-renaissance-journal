/**
 * Cost of one Claude call in USD (TZ 10.4: tokens and price are written to
 * AiCheck; the admin panel shows the monthly total). Prices per million
 * tokens; web search is billed per search. Update when Anthropic changes
 * prices — unknown models are costed as the default model.
 */
const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
};
const WEB_SEARCH_PER_REQUEST = 10 / 1000;

export type UsageLike = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  /** Cache writes by TTL: 5-minute entries cost 1.25× input, 1-hour entries 2×. */
  cache_creation?: {
    ephemeral_5m_input_tokens?: number | null;
    ephemeral_1h_input_tokens?: number | null;
  } | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
};

export type Spend = { tokensIn: number; tokensOut: number; cost: number; searches: number };

export const NO_SPEND: Spend = { tokensIn: 0, tokensOut: 0, cost: 0, searches: 0 };

export function spendOf(model: string, u: UsageLike | null | undefined): Spend {
  if (!u) return NO_SPEND;
  const p = PRICES[model] ?? PRICES["claude-opus-5-5"]!;
  const input = u.input_tokens ?? 0;
  const created = u.cache_creation_input_tokens ?? 0;
  const created1h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  const created5m = Math.max(0, created - created1h);
  const read = u.cache_read_input_tokens ?? 0;
  const output = u.output_tokens ?? 0;
  const searches = u.server_tool_use?.web_search_requests ?? 0;
  const cost =
    (input * p.input +
      created5m * p.input * 1.25 +
      created1h * p.input * 2 +
      read * p.cacheRead +
      output * p.output) /
      1e6 +
    searches * WEB_SEARCH_PER_REQUEST;
  return {
    tokensIn: input + created + read,
    tokensOut: output,
    cost: Math.round(cost * 1e6) / 1e6,
    searches,
  };
}

export function addSpend(a: Spend, b: Spend): Spend {
  return {
    tokensIn: a.tokensIn + b.tokensIn,
    tokensOut: a.tokensOut + b.tokensOut,
    cost: Math.round((a.cost + b.cost) * 1e6) / 1e6,
    searches: a.searches + b.searches,
  };
}
