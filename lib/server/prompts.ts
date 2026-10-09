import type { Contract } from "@/lib/types";

export const QUOTE_RULES = `Rules for quotes:
- Every quote must be copied character for character from the clause you cite. Do not paraphrase, fix typos or merge sentences.
- Keep quotes short: the one sentence or phrase that proves the point.
- Use clause ids exactly as they appear in square brackets.
- If you cannot find supporting text, do not invent it.`;

/** Renders a contract so that every clause carries its id. */
export function renderContract(contract: Contract): string {
  const { start, end, autoRenew, noticeDays } = contract.fields;
  const header = [
    `id=${contract.id}`,
    `kind=${contract.kind}`,
    `title="${contract.title}"`,
    `counterparty="${contract.counterparty}"`,
    `start=${start ?? "n/a"}`,
    `end=${end ?? "n/a"}`,
    `autoRenew=${autoRenew}`,
    `noticeDays=${noticeDays ?? "n/a"}`,
  ].join(" ");
  const clauses = contract.clauses.map((c) => `[${c.id}] ${c.heading}: ${c.text}`).join("\n");
  return `<contract ${header}>\n${clauses}\n</contract>`;
}
