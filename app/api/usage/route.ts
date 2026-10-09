import { connection } from "next/server";
import { respond } from "@/lib/server/respond";
import { usageSummary } from "@/lib/server/usage";

export async function GET() {
  await connection();
  return respond(async () => usageSummary());
}
