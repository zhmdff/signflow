import type { Clause, Contract, ContractFields, ContractKind, Usage } from "@/lib/types";
import { callModel } from "./ai";
import type { Part } from "./ai-shared";
import { contractMetaSchema, ingestSchema } from "./schemas";
import { splitClauses } from "./split";
import { listContracts, saveContract, slugify } from "./store";

type Meta = { title: string; counterparty: string; kind: ContractKind; fields: ContractFields };
type Extracted = Meta & { clauses: Clause[] };

const META_RULES = `- counterparty is the other side, never the Company itself, unless the document is the Company's own standard terms.
- kind: "own_terms" for the Company's own standard terms, "employee" for employment contracts, "partner" for everything else.
- Dates are ISO YYYY-MM-DD. Use null when the document does not state a value. Never guess.
- autoRenew is true if the contract renews or rolls over by itself unless someone objects.
- noticeDays: if autoRenew is true, it is the number of days before the end of the term by which notice of non-renewal must be given. A shorter notice period for terminating at any time does not count. Search the whole document for it, including clauses on notices and general provisions: a renewal clause often says only "in accordance with clause X". If autoRenew is false, it is the termination notice period.`;

const META_SYSTEM = `You read a contract for a contract review tool used by Araz Retail Group LLC ("the Company") and report its key facts.
${META_RULES}`;

const FULL_SYSTEM = `You convert contracts into structured data for a contract review tool used by Araz Retail Group LLC ("the Company").
- Split the document into its clauses at the most detailed numbered level: 4.1 and 4.2 are two clauses, not one clause 4. Keep each clause's text verbatim and complete; do not summarise.
- Use the printed clause numbers as ids. If the document has none, number the clauses 1, 2, 3 in order.
${META_RULES}`;

export type IngestInput =
  | { text: string; kind?: ContractKind }
  | { file: { mimeType: string; base64: string }; kind?: ContractKind };

export type IngestResult = {
  contract: Contract;
  usage: Usage;
  /** Who split the clauses. "code" means the model only extracted the header facts. */
  splitBy: "code" | "model";
};

/** Turns pasted text or an uploaded PDF into a stored Contract. */
export async function ingestContract(input: IngestInput): Promise<IngestResult> {
  // Retyping a contract as JSON is most of what an upload costs, so code does the
  // splitting whenever the numbering is clear enough.
  const split = "text" in input ? splitClauses(input.text) : null;

  let meta: Meta;
  let clauses: Clause[];
  let usage: Usage;

  if ("text" in input && split) {
    const result = await callModel<Meta>(
      `Report the key facts of this contract.\n\n<document>\n${input.text}\n</document>`,
      contractMetaSchema,
      { feature: "ingest", system: META_SYSTEM, temperature: 0 },
    );
    meta = result.data;
    clauses = split;
    usage = result.usage;
  } else {
    const parts: Part[] =
      "text" in input
        ? [{ text: `Extract this contract.\n\n<document>\n${input.text}\n</document>` }]
        : [
            { inlineData: { mimeType: input.file.mimeType, data: input.file.base64 } },
            { text: "Extract the contract in the attached file." },
          ];
    const result = await callModel<Extracted>(parts, ingestSchema, {
      feature: "ingest",
      system: FULL_SYSTEM,
      temperature: 0,
    });
    meta = result.data;
    clauses = (result.data.clauses ?? [])
      .filter((c) => c.text?.trim())
      .map((c, i) => ({ id: c.id?.trim() || String(i + 1), heading: c.heading?.trim() ?? "", text: c.text.trim() }));
    usage = result.usage;
  }

  if (clauses.length === 0) {
    throw new Error("No clauses could be extracted. Is this a contract?");
  }

  const kind = input.kind ?? meta.kind ?? "partner";
  const taken = new Set((await listContracts()).map((c) => c.id));
  const base = `${kind === "own_terms" ? "terms" : kind}-${slugify(meta.counterparty || meta.title) || "contract"}`;
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;

  const contract: Contract = {
    id,
    kind,
    title: meta.title?.trim() || "Untitled contract",
    counterparty: meta.counterparty?.trim() || "Unknown party",
    clauses,
    fields: {
      start: meta.fields?.start ?? null,
      end: meta.fields?.end ?? null,
      autoRenew: Boolean(meta.fields?.autoRenew),
      noticeDays: meta.fields?.noticeDays ?? null,
      governingLaw: meta.fields?.governingLaw ?? null,
    },
    source: "upload",
  };

  await saveContract(contract);
  return { contract, usage, splitBy: split ? "code" : "model" };
}
