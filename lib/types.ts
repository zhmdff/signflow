export type ContractKind = "own_terms" | "employee" | "partner";

export type Clause = { id: string; heading: string; text: string };

export type ContractFields = {
  start: string | null;
  end: string | null;
  autoRenew: boolean;
  noticeDays: number | null;
  governingLaw?: string | null;
};

export type Contract = {
  id: string;
  kind: ContractKind;
  title: string;
  counterparty: string;
  clauses: Clause[];
  fields: ContractFields;
  source: "seed" | "upload";
};

export type Severity = "critical" | "major" | "minor";
export type Confidence = "high" | "medium" | "low";

/**
 * exact: found verbatim in the cited clause.
 * moved: found verbatim, but in a different clause (clauseId was corrected).
 * unverified: not found in the source, treat as a possible hallucination.
 */
export type QuoteStatus = "exact" | "moved" | "unverified";

export type Quote = { clauseId: string; text: string; status: QuoteStatus };

export type Usage = { promptTokens: number; outputTokens: number; calls: number };

export type CitationStats = { quotes: number; verified: number };

export const TOPICS = [
  "liability",
  "payment_terms",
  "termination",
  "renewal",
  "ip",
  "confidentiality",
  "penalties",
  "governing_law",
  "data_protection",
  "subcontracting",
  "other",
] as const;
export type Topic = (typeof TOPICS)[number];

export type Finding = {
  topic: Topic;
  severity: Severity;
  confidence: Confidence;
  ourPosition: string;
  theirPosition: string;
  ourQuote: Quote | null;
  theirQuote: Quote | null;
  explanation: string;
  suggestedWording: string;
};

export type MissingClause = {
  topic: Topic;
  severity: Severity;
  ourQuote: Quote | null;
  why: string;
  suggestedWording: string;
};

export type CompareResult = {
  contractId: string;
  termsId: string;
  summary: string;
  findings: Finding[];
  missingClauses: MissingClause[];
  stats: CitationStats;
  usage: Usage;
  cached: boolean;
};

export type LawRule = {
  id: string;
  obligation: string;
  appliesTo: string;
  effectiveDate: string | null;
  penalty: string | null;
  quote: string;
  quoteVerified: boolean;
};

export type LawImpact = {
  ruleId: string;
  contractId: string;
  quote: Quote;
  risk: Severity;
  confidence: Confidence;
  explanation: string;
  suggestedAmendment: string;
};

export type LawScanResult = {
  lawTitle: string;
  rules: LawRule[];
  impacts: LawImpact[];
  stats: CitationStats;
  usage: Usage;
  cached: boolean;
};

export type Citation = { contractId: string; quote: Quote };

export type AskResult = {
  answer: string;
  /** false when the contracts are silent on the question. */
  found: boolean;
  confidence: Confidence;
  citations: Citation[];
  usage: Usage;
};

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string; result?: AskResult; error?: boolean };

export type AiStatus = { configured: boolean; model: string };
