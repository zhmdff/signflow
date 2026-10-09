import { connection } from "next/server";
import { deleteLawScan, getLawScan } from "@/lib/server/law-scan";
import { HttpError, respond } from "@/lib/server/respond";

export async function GET(_request: Request, ctx: RouteContext<"/api/law-scans/[id]">) {
  await connection();
  return respond(async () => {
    const scan = await getLawScan((await ctx.params).id);
    if (!scan) throw new HttpError("Scan not found.", 404);
    return scan;
  });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/law-scans/[id]">) {
  return respond(async () => {
    await deleteLawScan((await ctx.params).id);
    return { ok: true };
  });
}
