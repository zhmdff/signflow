import { TOPICS } from "@/lib/types";
import type { Schema } from "./gemini";

const str = (description?: string): Schema => ({ type: "STRING", description });
const nullableStr = (description?: string): Schema => ({ type: "STRING", nullable: true, description });
const oneOf = (values: readonly string[], description?: string): Schema => ({
  type: "STRING",
  enum: values,
  description,
});
const obj = (properties: Record<string, Schema>, optional: string[] = []): Schema => ({
  type: "OBJECT",
  properties,
  required: Object.keys(properties).filter((k) => !optional.includes(k)),
});
const list = (items: Schema): Schema => ({ type: "ARRAY", items });

const severity = oneOf(["critical", "major", "minor"]);
const confidence = oneOf(["high", "medium", "low"]);
const topic = oneOf(TOPICS);
const isoDate = "ISO date YYYY-MM-DD, or null if the document does not state it";

const quote = (side: string): Schema => ({
  ...obj({
    clauseId: str(`Clause id exactly as it appears in ${side}`),
    text: str(`Verbatim excerpt copied character for character from that clause of ${side}`),
  }),
  nullable: true,
});

export const ingestSchema = obj({
  title: str("Document title"),
  counterparty: str("The other party: the partner company or the employee's full name"),
  kind: oneOf(["own_terms", "employee", "partner"]),
  clauses: list(
    obj({
      id: str("Clause number or letter as printed, e.g. 4.2. Number sequentially if unnumbered."),
      heading: str("Short heading for the clause"),
      text: str("Full clause text, verbatim"),
    }),
  ),
  fields: obj({
    start: nullableStr(isoDate),
    end: nullableStr(isoDate),
    autoRenew: { type: "BOOLEAN" },
    noticeDays: {
      type: "INTEGER",
      nullable: true,
      description: "Days of notice needed to terminate or to prevent renewal",
    },
    governingLaw: nullableStr(),
  }),
});

export const compareSchema = obj({
  summary: str("Two sentences on whether this contract can be signed as is"),
  findings: list(
    obj({
      topic,
      severity,
      confidence,
      ourPosition: str("What our terms require, in one sentence"),
      theirPosition: str("What the partner contract says, in one sentence"),
      ourQuote: quote("OUR TERMS"),
      theirQuote: quote("the PARTNER CONTRACT"),
      explanation: str("Why this matters to the company, in one or two sentences"),
      suggestedWording: str("Replacement clause wording that would bring the contract in line"),
    }),
  ),
  missingClauses: list(
    obj({
      topic,
      severity,
      ourQuote: quote("OUR TERMS"),
      why: str("What is missing and why it matters"),
      suggestedWording: str("Clause wording to add"),
    }),
  ),
});

export const lawRulesSchema = obj({
  lawTitle: str("Short title of the law or amendment"),
  rules: list(
    obj({
      id: str("R1, R2, ..."),
      obligation: str("The rule as one plain sentence"),
      appliesTo: str("Who must comply"),
      effectiveDate: nullableStr(isoDate),
      penalty: nullableStr("Penalty for non-compliance, or null if not stated"),
      quote: str("Verbatim excerpt from the law text that states this rule"),
    }),
  ),
});

export const lawImpactSchema = obj({
  impacts: list(
    obj({
      ruleId: str(),
      contractId: str("Contract id exactly as given"),
      clauseId: str("Id of the conflicting clause exactly as given"),
      quote: str("Verbatim excerpt from that clause showing the conflict"),
      risk: severity,
      confidence,
      explanation: str("Why the clause conflicts with the rule"),
      suggestedAmendment: str("Amended clause wording that would comply"),
    }),
  ),
});

export const askSchema = obj({
  answer: str("Direct answer in plain language"),
  found: {
    type: "BOOLEAN",
    description: "false if the contracts do not address the question",
  },
  confidence,
  citations: list(
    obj({
      contractId: str("Contract id exactly as given"),
      clauseId: str("Clause id exactly as given"),
      quote: str("Verbatim excerpt from that clause supporting the answer"),
    }),
  ),
});
