import { connection } from "next/server";
import { aiStatus } from "@/lib/server/ai";

export async function GET() {
  // Keys are read from the environment at request time, not at build time.
  await connection();
  return Response.json(aiStatus());
}
