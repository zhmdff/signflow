import type { Clause, Contract, ContractFields, ContractKind, Usage } from "@/lib/types";
import { callGemini, type GeminiPart } from "./gemini";
import { ingestSchema } from "./schemas";
import { listContracts, saveContract, slugify } from "./store";

type Extracted = {
  title: string;
  counterparty: string;
  kind: ContractKind;
  clauses: Clause[];
  fields: ContractFields;
};

const SYSTEM = `You convert contracts into structured data for a contract review tool used by Araz Retail Group LLC ("the Company").
- Split the document into its clauses. Keep each clause's text verbatim and complete; do not summarise.
- Use the printed clause numbers as ids. If the document has none, number the clauses 1, 2, 3 in order.
- counterparty is the other side, never the Company itself, unless the document is the Company's own standard terms.
- kind: "own_terms" for the Company's own standard terms, "employee" for employment contracts, "partner" for everything else.
- Dates are ISO YYYY-MM-DD. Use null when the document does not state a value. Never guess.
- noticeDays is the notice needed to stop an automatic renewal if there is one, otherwise the termination notice period.`;

export type IngestInput =
  | { text: string; kind?: ContractKind }
  | { file: { mimeType: string; base64: string }; kind?: ContractKind };

/** Turns pasted text or an uploaded PDF into a stored Contract. */
export async function ingestContract(input: IngestInput): Promise<{ contract: Contract; usage: Usage }> {
  const parts: GeminiPart[] =
    "text" in input
      ? [{ text: `Extract this contract.\n\n<document>\n${input.text}\n</document>` }]
      : [
          { inlineData: { mimeType: input.file.mimeType, data: input.file.base64 } },
          { text: "Extract the contract in the attached file." },
        ];

  const { data, usage } = await callGemini<Extracted>(parts, ingestSchema, { system: SYSTEM, temperature: 0 });

  const clauses = (data.clauses ?? []).filter((c) => c.text?.trim());
  if (clauses.length === 0) {
    throw new Error("No clauses could be extracted. Is this a contract?");
  }

  const kind = input.kind ?? data.kind ?? "partner";
  const taken = new Set((await listContracts()).map((c) => c.id));
  const base = `${kind === "own_terms" ? "terms" : kind}-${slugify(data.counterparty || data.title) || "contract"}`;
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;

  const contract: Contract = {
    id,
    kind,
    title: data.title?.trim() || "Untitled contract",
    counterparty: data.counterparty?.trim() || "Unknown party",
    clauses: clauses.map((c, i) => ({
      id: c.id?.trim() || String(i + 1),
      heading: c.heading?.trim() ?? "",
      text: c.text.trim(),
    })),
    fields: {
      start: data.fields?.start ?? null,
      end: data.fields?.end ?? null,
      autoRenew: Boolean(data.fields?.autoRenew),
      noticeDays: data.fields?.noticeDays ?? null,
      governingLaw: data.fields?.governingLaw ?? null,
    },
    source: "upload",
  };

  await saveContract(contract);
  return { contract, usage };
}
