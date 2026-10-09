import type { Confidence, Contract, LawImpact, LawRule, LawScanResult, Severity } from "@/lib/types";
import { addUsage, callGemini } from "./gemini";
import { QUOTE_RULES, renderContract } from "./prompts";
import { lawImpactSchema, lawRulesSchema } from "./schemas";
import { cacheKey, readCache, writeCache } from "./store";
import { appearsIn, citationStats, verifyQuote } from "./verify";

type RawRules = { lawTitle: string; rules: Omit<LawRule, "quoteVerified">[] };
type RawImpacts = {
  impacts: {
    ruleId: string;
    contractId: string;
    clauseId: string;
    quote: string;
    risk: Severity;
    confidence: Confidence;
    explanation: string;
    suggestedAmendment: string;
  }[];
};

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

export async function scanLaw(
  lawText: string,
  contracts: Contract[],
  opts: { force?: boolean } = {},
): Promise<LawScanResult> {
  const key = cacheKey("law", lawText.trim(), contracts);
  if (!opts.force) {
    const hit = await readCache<LawScanResult>(key);
    if (hit) return { ...hit, cached: true };
  }

  // Step A: law text -> rules.
  const extracted = await callGemini<RawRules>(
    `Extract the rules from this law text.\n\n<law>\n${lawText}\n</law>`,
    lawRulesSchema,
    { system: RULES_SYSTEM },
  );
  const rules: LawRule[] = (extracted.data.rules ?? []).map((r, i) => ({
    ...r,
    id: r.id || `R${i + 1}`,
    quoteVerified: appearsIn(lawText, r.quote ?? ""),
  }));

  let usage = extracted.usage;
  let impacts: LawImpact[] = [];

  // Step B: rules x contracts -> conflicting clauses.
  if (rules.length > 0 && contracts.length > 0) {
    const ruleList = rules
      .map(
        (r) =>
          `[${r.id}] ${r.obligation} Applies to: ${r.appliesTo}. Effective: ${r.effectiveDate ?? "not stated"}.`,
      )
      .join("\n");
    const checked = await callGemini<RawImpacts>(
      `RULES\n${ruleList}\n\nCONTRACTS\n${contracts.map(renderContract).join("\n\n")}\n\nList every clause that conflicts with a rule.`,
      lawImpactSchema,
      { system: IMPACT_SYSTEM },
    );
    usage = addUsage(usage, checked.usage);

    const byId = new Map(contracts.map((c) => [c.id, c]));
    const ruleIds = new Set(rules.map((r) => r.id));
    impacts = (checked.data.impacts ?? [])
      .flatMap((raw): LawImpact[] => {
        const contract = byId.get(raw.contractId);
        const quote = contract && verifyQuote(contract, { clauseId: raw.clauseId, text: raw.quote });
        // An impact that names an unknown contract or rule cannot be shown to a reviewer.
        if (!quote || !ruleIds.has(raw.ruleId)) return [];
        return [
          {
            ruleId: raw.ruleId,
            contractId: raw.contractId,
            quote,
            risk: raw.risk,
            confidence: raw.confidence,
            explanation: raw.explanation,
            suggestedAmendment: raw.suggestedAmendment,
          },
        ];
      })
      .sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk]);
  }

  const result: LawScanResult = {
    lawTitle: extracted.data.lawTitle ?? "Law text",
    rules,
    impacts,
    stats: citationStats(impacts.map((i) => i.quote)),
    usage,
    cached: false,
  };

  await writeCache(key, result);
  return result;
}
