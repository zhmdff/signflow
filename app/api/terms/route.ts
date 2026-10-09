import { HttpError, readJson, respond } from "@/lib/server/respond";
import { getOwnTerms, saveContract } from "@/lib/server/store";
import { clauseProblems, type TermsInput } from "@/lib/terms";
import type { Clause, Contract } from "@/lib/types";

/** Creates or replaces the company's own terms. */
export async function PUT(request: Request) {
  return respond(async () => {
    const body = await readJson<Partial<TermsInput>>(request);

    const title = String(body.title ?? "").trim();
    const counterparty = String(body.counterparty ?? "").trim();
    if (!title || !counterparty) throw new HttpError("Company name and title are required.");
    if (!Array.isArray(body.clauses) || body.clauses.length === 0) {
      throw new HttpError("Add at least one rule.");
    }

    const clauses: Clause[] = body.clauses.map((c) => ({
      id: String(c?.id ?? "").trim(),
      heading: String(c?.heading ?? "").trim(),
      text: String(c?.text ?? "").trim(),
    }));
    const problem = clauseProblems(clauses).find((p) => p !== null);
    if (problem) throw new HttpError(problem);

    const existing = await getOwnTerms();
    const contract: Contract = {
      id: existing?.id ?? "own-terms",
      kind: "own_terms",
      title,
      counterparty,
      clauses,
      fields: existing?.fields ?? { start: null, end: null, autoRenew: false, noticeDays: null },
      source: existing?.source ?? "upload",
    };

    await saveContract(contract);
    return { contract };
  });
}
