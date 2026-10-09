import type { AskResult, Citation, Confidence, Contract } from "@/lib/types";
import { callModel } from "./ai";
import { QUOTE_RULES, renderContract } from "./prompts";
import { askSchema } from "./schemas";
import { isFollowUp, retrieveClauses } from "./search";
import { cached, cacheKey } from "./store";
import { verifyQuote } from "./verify";

type Raw = {
  answer: string;
  found: boolean;
  confidence: Confidence;
  citations: { contractId: string; clauseId: string; quote: string }[];
};

export type Turn = { role: "user" | "assistant"; text: string };

const SYSTEM = `You answer questions about a company's contracts for HR and operations staff.
- Answer only from the clauses provided. Do not use general legal knowledge or assume what a contract "usually" says.
- You are shown the clauses most relevant to the question, not always the whole contract. Never mention this; just answer from what is shown.
- Be specific: give the numbers, limits, deadlines and conditions the clauses state, and apply them to the situation in the question.
- Cite every clause you rely on.
- If the clauses do not address the question, or only part of it, say plainly which part the contract is silent on. If nothing relevant is shown, set found to false and return no citations.
- If the question could refer to more than one contract, answer for each and name them.
- Do not put clause references in the answer text; they belong in citations.

${QUOTE_RULES}`;

/** How many earlier turns are replayed to the model. */
const HISTORY_TURNS = 4;

export async function askContracts(
  question: string,
  inScope: Contract[],
  history: Turn[] = [],
  opts: { force?: boolean } = {},
): Promise<AskResult> {
  // Earlier turns are only replayed for a follow-up like "and her notice period?".
  // A question that stands alone is answered alone: cheaper, and cacheable.
  const recent = isFollowUp(question) ? history.slice(-HISTORY_TURNS) : [];
  const previousQuestion = recent.findLast((t) => t.role === "user")?.text;
  const retrieval = retrieveClauses(question, inScope, previousQuestion);

  // Same question over the same clauses is the same answer, whatever else was said before.
  const key = cacheKey("ask", question.toLowerCase(), previousQuestion ?? null, retrieval.contracts);

  return cached(
    "ask",
    key,
    async (): Promise<Omit<AskResult, "cached">> => {
      const past = recent.map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.text}`).join("\n");
      const prompt = [
        `CONTRACTS\n${retrieval.contracts.map(renderContract).join("\n\n")}`,
        past && `EARLIER IN THIS CONVERSATION\n${past}`,
        `QUESTION\n${question}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const { data, usage } = await callModel<Raw>(prompt, askSchema, { feature: "ask", system: SYSTEM });

      // Quotes are checked against the full contract, not the excerpt the model saw.
      const byId = new Map(inScope.map((c) => [c.id, c]));
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
        context: { sent: retrieval.sent, total: retrieval.total },
        usage,
      };
    },
    opts,
  );
}
