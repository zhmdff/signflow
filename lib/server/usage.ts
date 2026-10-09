import type { Usage, UsageRow, UsageSummary } from "@/lib/types";
import { query } from "./db";

/** What an AI call was for. Usage is reported per feature. */
export type Feature = "ingest" | "compare" | "law_rules" | "law_impacts" | "ask";

export async function logUsage(feature: Feature, usage: Usage, cached: boolean): Promise<void> {
  if (usage.promptTokens + usage.outputTokens === 0) return;
  try {
    await query(
      "INSERT INTO usage (feature, model, prompt_tokens, output_tokens, cached) VALUES ($1, $2, $3, $4, $5)",
      [feature, usage.model ?? null, usage.promptTokens, usage.outputTokens, cached],
    );
  } catch (err) {
    // Bookkeeping must never fail the request it is counting.
    console.error("Could not log usage:", err instanceof Error ? err.message : err);
  }
}

export async function usageSummary(): Promise<UsageSummary> {
  const rows = await query<UsageRow>(
    `SELECT feature,
            (count(*) FILTER (WHERE NOT cached))::int AS calls,
            COALESCE(sum(prompt_tokens) FILTER (WHERE NOT cached), 0)::int AS "promptTokens",
            COALESCE(sum(output_tokens) FILTER (WHERE NOT cached), 0)::int AS "outputTokens",
            (count(*) FILTER (WHERE cached))::int AS "cacheHits",
            COALESCE(sum(prompt_tokens + output_tokens) FILTER (WHERE cached), 0)::int AS "tokensSaved"
     FROM usage GROUP BY feature ORDER BY feature`,
  );

  const total = rows.reduce(
    (sum, r) => ({
      feature: "total",
      calls: sum.calls + r.calls,
      promptTokens: sum.promptTokens + r.promptTokens,
      outputTokens: sum.outputTokens + r.outputTokens,
      cacheHits: sum.cacheHits + r.cacheHits,
      tokensSaved: sum.tokensSaved + r.tokensSaved,
    }),
    { feature: "total", calls: 0, promptTokens: 0, outputTokens: 0, cacheHits: 0, tokensSaved: 0 },
  );
  return { byFeature: rows, total };
}
