import type {
  Confidence,
  Contract,
  LawImpact,
  LawRule,
  LawScanResult,
  LawScanSummary,
  Severity,
  Usage,
} from "@/lib/types";
import { addUsage, callModel } from "./ai";
import { db } from "./db";
import { QUOTE_RULES, renderContract } from "./prompts";
import { lawImpactSchema, lawRulesSchema } from "./schemas";
import { cached, cacheKey, contractHash, readCache, writeCache } from "./store";
import { logUsage } from "./usage";
import { appearsIn, citationStats, verifyQuote } from "./verify";

type RawRules = { lawTitle: string; rules: Omit<LawRule, "quoteVerified">[] };
type RawImpact = {
  ruleId: string;
  contractId: string;
  clauseId: string;
  quote: string;
  risk: Severity;
  confidence: Confidence;
  explanation: string;
  suggestedAmendment: string;
};
type Extracted = { lawTitle: string; rules: LawRule[]; usage: Usage };
/** What one contract's check against one set of rules found, and what it cost. */
type ContractCheck = { impacts: LawImpact[]; usage: Usage };

const RULES_SYSTEM = `You read a law, regulation or amendment and extract the rules it creates.
- One rule per distinct obligation or prohibition. Skip definitions, recitals and procedural text.
- obligation is one plain sentence a manager could act on.
- effectiveDate and penalty come only from the text. Use null when the text does not state them.
- quote is copied character for character from the law text.`;

const IMPACT_SYSTEM = `You check a company's contracts against new legal rules and report every clause that would breach a rule once it takes effect.
- Check every contract against every rule. A clause conflicts if performing it as written would breach the rule.
- Include indirect conflicts: a partner contract that obliges the company to have its own staff do something the rule forbids is a conflict.
- Do not report clauses that already comply, and do not report a contract merely because it is on the same subject.
- Risk: critical = the clause requires what the rule forbids; major = the clause permits or will likely lead to a breach; minor = wording needs tidying.
- suggestedAmendment is ready-to-paste replacement wording for the clause.

${QUOTE_RULES}`;

const RISK_ORDER: Record<Severity, number> = { critical: 0, major: 1, minor: 2 };
const NO_USAGE: Usage = { promptTokens: 0, outputTokens: 0, calls: 0 };

const share = (usage: Usage, parts: number): Usage => ({
  ...usage,
  promptTokens: Math.round(usage.promptTokens / parts),
  outputTokens: Math.round(usage.outputTokens / parts),
});

/**
 * Step A turns the law into rules, once per law text. Step B checks contracts
 * against those rules and is stored per contract, so a later scan only pays
 * for contracts that are new or have changed.
 */
export async function scanLaw(
  lawText: string,
  contracts: Contract[],
  opts: { force?: boolean } = {},
): Promise<LawScanResult> {
  const text = lawText.trim();

  const extracted = await cached(
    "law_rules",
    cacheKey("law-rules", text),
    async (): Promise<Extracted> => {
      const { data, usage } = await callModel<RawRules>(
        `Extract the rules from this law text.\n\n<law>\n${text}\n</law>`,
        lawRulesSchema,
        { feature: "law_rules", system: RULES_SYSTEM },
      );
      const rules = (data.rules ?? []).map((r, i) => ({
        ...r,
        id: r.id || `R${i + 1}`,
        quoteVerified: appearsIn(text, r.quote ?? ""),
      }));
      return { lawTitle: data.lawTitle ?? "Law text", rules, usage };
    },
    opts,
  );
  const { rules } = extracted;
  let usage = extracted.cached ? NO_USAGE : extracted.usage;

  const checkKey = (contract: Contract) => cacheKey("law-check", rules, contractHash(contract));
  const checks = new Map<string, ContractCheck>();
  const unchecked: Contract[] = [];

  if (rules.length > 0) {
    for (const contract of contracts) {
      const hit = opts.force ? undefined : readCache<ContractCheck>(checkKey(contract));
      if (hit) {
        checks.set(contract.id, hit);
        logUsage("law_impacts", hit.usage, true);
      } else {
        unchecked.push(contract);
      }
    }
  }

  if (unchecked.length > 0) {
    const ruleList = rules
      .map(
        (r) =>
          `[${r.id}] ${r.obligation} Applies to: ${r.appliesTo}. Effective: ${r.effectiveDate ?? "not stated"}.`,
      )
      .join("\n");
    const checked = await callModel<{ impacts: RawImpact[] }>(
      `RULES\n${ruleList}\n\nCONTRACTS\n${unchecked.map(renderContract).join("\n\n")}\n\nList every clause that conflicts with a rule.`,
      lawImpactSchema,
      { feature: "law_impacts", system: IMPACT_SYSTEM },
    );
    usage = addUsage(usage, checked.usage);

    const ruleIds = new Set(rules.map((r) => r.id));
    for (const contract of unchecked) {
      const impacts = (checked.data.impacts ?? [])
        .filter((raw) => raw.contractId === contract.id && ruleIds.has(raw.ruleId))
        .flatMap((raw): LawImpact[] => {
          const quote = verifyQuote(contract, { clauseId: raw.clauseId, text: raw.quote });
          if (!quote) return [];
          return [
            {
              ruleId: raw.ruleId,
              contractId: contract.id,
              quote,
              risk: raw.risk,
              confidence: raw.confidence,
              explanation: raw.explanation,
              suggestedAmendment: raw.suggestedAmendment,
            },
          ];
        });
      // The batch's cost is split evenly, as an estimate of what re-checking one contract would cost.
      const check = { impacts, usage: share(checked.usage, unchecked.length) };
      checks.set(contract.id, check);
      writeCache(checkKey(contract), check);
    }
  }

  const impacts = contracts
    .flatMap((c) => checks.get(c.id)?.impacts ?? [])
    .sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk]);

  const result: LawScanResult = {
    id: cacheKey("scan", text),
    lawTitle: extracted.lawTitle,
    rules,
    impacts,
    stats: citationStats(impacts.map((i) => i.quote)),
    usage,
    cached: usage.calls === 0,
  };

  db()
    .prepare(
      `INSERT INTO law_scans (id, at, title, law_text, result) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET at = excluded.at, title = excluded.title, result = excluded.result`,
    )
    .run(result.id, new Date().toISOString(), result.lawTitle, text, JSON.stringify(result));

  return result;
}

export function listLawScans(): LawScanSummary[] {
  const rows = db().prepare("SELECT id, at, title, result FROM law_scans ORDER BY at DESC").all() as {
    id: string;
    at: string;
    title: string;
    result: string;
  }[];
  return rows.map((row) => {
    const result = JSON.parse(row.result) as LawScanResult;
    return { id: row.id, at: row.at, title: row.title, rules: result.rules.length, impacts: result.impacts.length };
  });
}

/** A past scan exactly as it was shown then. Contracts may have changed since. */
export function getLawScan(id: string): { lawText: string; result: LawScanResult } | undefined {
  const row = db().prepare("SELECT law_text, result FROM law_scans WHERE id = ?").get(id) as
    | { law_text: string; result: string }
    | undefined;
  return row ? { lawText: row.law_text, result: { ...(JSON.parse(row.result) as LawScanResult), cached: true } } : undefined;
}

export function deleteLawScan(id: string): void {
  db().prepare("DELETE FROM law_scans WHERE id = ?").run(id);
}
