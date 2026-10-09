import { connection } from "next/server";
import { aiStatus } from "@/lib/server/gemini";

export async function GET() {
  // The key is read from the environment at request time, not at build time.
  await connection();
  return Response.json(aiStatus());
}
