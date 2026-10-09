import { connection } from "next/server";
import { compareContract, savedComparison } from "@/lib/server/compare";
import { HttpError, respond } from "@/lib/server/respond";
import { getContract, getOwnTerms } from "@/lib/server/store";

async function load(id: string) {
  const [contract, terms] = await Promise.all([getContract(id), getOwnTerms()]);
  if (!contract) throw new HttpError("Contract not found.", 404);
  if (!terms) throw new HttpError("Upload your own terms first: there is nothing to compare against.", 409);
  if (contract.kind !== "partner") throw new HttpError("Only partner contracts can be compared with your terms.");
  return { contract, terms };
}

/** The stored comparison for this contract and the current terms, or null. Never calls a model. */
export async function GET(_request: Request, ctx: RouteContext<"/api/contracts/[id]/comparison">) {
  await connection();
  return respond(async () => {
    const { contract, terms } = await load((await ctx.params).id);
    return { result: await savedComparison(contract, terms) };
  });
}

/** Runs the comparison, or returns the stored one unless `force` is set. */
export async function POST(request: Request, ctx: RouteContext<"/api/contracts/[id]/comparison">) {
  return respond(async () => {
    const { force } = (await request.json().catch(() => ({}))) as { force?: boolean };
    const { contract, terms } = await load((await ctx.params).id);
    return { result: await compareContract(contract, terms, { force }) };
  });
}
