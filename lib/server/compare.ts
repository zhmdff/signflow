import type {
  CompareResult,
  Confidence,
  Contract,
  Finding,
  MissingClause,
  Severity,
  Topic,
} from "@/lib/types";
import { callModel } from "./ai";
import { QUOTE_RULES, renderContract } from "./prompts";
import { compareSchema } from "./schemas";
import { cached, cacheKey, contractHash, readCache } from "./store";
import { citationStats, verifyQuote } from "./verify";

type RawQuote = { clauseId: string; text: string } | null;
type Raw = {
  summary: string;
  findings: {
    topic: Topic;
    severity: Severity;
    confidence: Confidence;
    ourPosition: string;
    theirPosition: string;
    ourQuote: RawQuote;
    theirQuote: RawQuote;
    explanation: string;
    suggestedWording: string;
  }[];
  missingClauses: {
    topic: Topic;
    severity: Severity;
    ourQuote: RawQuote;
    why: string;
    suggestedWording: string;
  }[];
};

const SYSTEM = `You are a contract analyst acting for the company whose standard terms are given as OUR TERMS. You compare a PARTNER CONTRACT against OUR TERMS and report where the partner contract departs from them to the company's disadvantage.

Work topic by topic: liability, payment_terms, termination, renewal, ip, confidentiality, penalties, governing_law, data_protection, subcontracting.
- Report a finding only where the partner contract conflicts with OUR TERMS. Do not report topics where it matches or is better for the company.
- One finding per conflict. If one topic has two separate conflicts in different clauses, report both.
- If OUR TERMS require something and the partner contract has no clause on it at all, report it under missingClauses, not findings.
- Severity: critical = uncapped or one-sided financial exposure, loss of ownership, or being locked in; major = clear departure with real cost; minor = small deviation.
- Confidence reflects how clearly the texts conflict.
- suggestedWording is ready-to-paste clause text in the partner contract's own party names.

${QUOTE_RULES}`;

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, major: 1, minor: 2 };

const comparisonKey = (contract: Contract, terms: Contract) =>
  cacheKey("compare", contractHash(contract), contractHash(terms));

/** The stored comparison for these two documents as they are now, if one exists. No model call. */
export function savedComparison(contract: Contract, terms: Contract): CompareResult | null {
  const hit = readCache<Omit<CompareResult, "cached">>(comparisonKey(contract, terms));
  return hit ? { ...hit, cached: true } : null;
}

export async function compareContract(
  contract: Contract,
  terms: Contract,
  opts: { force?: boolean } = {},
): Promise<CompareResult> {
  return cached(
    "compare",
    comparisonKey(contract, terms),
    async (): Promise<Omit<CompareResult, "cached">> => {
      const prompt = `OUR TERMS
${renderContract(terms)}

PARTNER CONTRACT
${renderContract(contract)}

Compare the PARTNER CONTRACT against OUR TERMS.`;
      const { data, usage } = await callModel<Raw>(prompt, compareSchema, { feature: "compare", system: SYSTEM });

      const findings: Finding[] = (data.findings ?? [])
        .map((f) => ({
          ...f,
          ourQuote: verifyQuote(terms, f.ourQuote),
          theirQuote: verifyQuote(contract, f.theirQuote),
        }))
        .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

      const missingClauses: MissingClause[] = (data.missingClauses ?? [])
        .map((m) => ({ ...m, ourQuote: verifyQuote(terms, m.ourQuote) }))
        .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

      return {
        contractId: contract.id,
        termsId: terms.id,
        summary: data.summary ?? "",
        findings,
        missingClauses,
        stats: citationStats([
          ...findings.flatMap((f) => [f.ourQuote, f.theirQuote]),
          ...missingClauses.map((m) => m.ourQuote),
        ]),
        usage,
      };
    },
    opts,
  );
}
