import type { Usage, UsageRow, UsageSummary } from "@/lib/types";
import { db } from "./db";

/** What an AI call was for. Usage is reported per feature. */
export type Feature = "ingest" | "compare" | "law_rules" | "law_impacts" | "ask";

export function logUsage(feature: Feature, usage: Usage, cached: boolean): void {
  if (usage.promptTokens + usage.outputTokens === 0) return;
  db()
    .prepare(
      "INSERT INTO usage (at, feature, model, prompt_tokens, output_tokens, cached) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(new Date().toISOString(), feature, usage.model ?? null, usage.promptTokens, usage.outputTokens, cached ? 1 : 0);
}

export function usageSummary(): UsageSummary {
  const rows = db()
    .prepare(
      `SELECT feature,
              SUM(cached = 0) AS calls,
              SUM(CASE WHEN cached = 0 THEN prompt_tokens ELSE 0 END) AS promptTokens,
              SUM(CASE WHEN cached = 0 THEN output_tokens ELSE 0 END) AS outputTokens,
              SUM(cached = 1) AS cacheHits,
              SUM(CASE WHEN cached = 1 THEN prompt_tokens + output_tokens ELSE 0 END) AS tokensSaved
       FROM usage GROUP BY feature ORDER BY feature`,
    )
    .all() as UsageRow[];

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
