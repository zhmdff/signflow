import { compareContract } from "@/lib/server/compare";
import { HttpError, readJson, respond } from "@/lib/server/respond";
import { getContract, getOwnTerms } from "@/lib/server/store";

export async function POST(request: Request) {
  return respond(async () => {
    const { contractId, force } = await readJson<{ contractId?: string; force?: boolean }>(request);
    if (!contractId) throw new HttpError("contractId is required.");

    const [contract, terms] = await Promise.all([getContract(contractId), getOwnTerms()]);
    if (!contract) throw new HttpError("Contract not found.", 404);
    if (!terms) throw new HttpError("Upload your own terms first: there is nothing to compare against.", 409);
    if (contract.kind !== "partner") throw new HttpError("Only partner contracts can be compared with your terms.");

    return compareContract(contract, terms, { force });
  });
}
