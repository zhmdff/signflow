import type { AskResult, Citation, Confidence, Contract } from "@/lib/types";
import { callGemini } from "./gemini";
import { QUOTE_RULES, renderContract } from "./prompts";
import { askSchema } from "./schemas";
import { verifyQuote } from "./verify";

type Raw = {
  answer: string;
  found: boolean;
  confidence: Confidence;
  citations: { contractId: string; clauseId: string; quote: string }[];
};

export type Turn = { role: "user" | "assistant"; text: string };

const SYSTEM = `You answer questions about a company's contracts for HR and operations staff.
- Answer only from the contracts provided. Do not use general legal knowledge or assume what a contract "usually" says.
- Be specific: give the numbers, limits, deadlines and conditions the clauses state, and apply them to the situation in the question.
- Cite every clause you rely on.
- If the contracts do not address the question, or only part of it, say plainly which part the contract is silent on. If nothing relevant exists, set found to false and return no citations.
- If the question could refer to more than one contract, answer for each and name them.
- Do not put clause references in the answer text; they belong in citations.

${QUOTE_RULES}`;

export async function askContracts(
  question: string,
  contracts: Contract[],
  history: Turn[] = [],
): Promise<AskResult> {
  const past = history
    .slice(-6)
    .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.text}`)
    .join("\n");

  const prompt = [
    `CONTRACTS\n${contracts.map(renderContract).join("\n\n")}`,
    past && `EARLIER IN THIS CONVERSATION\n${past}`,
    `QUESTION\n${question}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { data, usage } = await callGemini<Raw>(prompt, askSchema, { system: SYSTEM });

  const byId = new Map(contracts.map((c) => [c.id, c]));
  const citations = (data.citations ?? []).flatMap((raw): Citation[] => {
    const contract = byId.get(raw.contractId);
    const quote = contract && verifyQuote(contract, { clauseId: raw.clauseId, text: raw.quote });
    return quote ? [{ contractId: raw.contractId, quote }] : [];
  });

  return {
    answer: data.answer ?? "",
    found: Boolean(data.found),
    confidence: data.confidence ?? "low",
    citations,
    usage,
  };
}
