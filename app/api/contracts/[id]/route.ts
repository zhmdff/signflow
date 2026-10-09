import { HttpError, respond } from "@/lib/server/respond";
import { deleteContract, getContract } from "@/lib/server/store";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/contracts/[id]">) {
  return respond(async () => {
    const { id } = await ctx.params;
    const contract = await getContract(id);
    if (!contract) throw new HttpError("Contract not found.", 404);
    if (contract.source === "seed") throw new HttpError("Sample contracts cannot be deleted.", 403);
    await deleteContract(id);
    return { ok: true };
  });
}
