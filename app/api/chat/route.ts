import { connection } from "next/server";
import { askContracts, type Turn } from "@/lib/server/ask";
import { addExchange, clearMessages, listMessages } from "@/lib/server/chat";
import { HttpError, readJson, respond } from "@/lib/server/respond";
import { listContracts } from "@/lib/server/store";

export async function GET() {
  await connection();
  return respond(async () => ({ messages: await listMessages() }));
}

/** Asks a question. The server holds the conversation, so the client sends only the new question. */
export async function POST(request: Request) {
  return respond(async () => {
    const { question, contractId } = await readJson<{ question?: string; contractId?: string | null }>(request);
    const text = question?.trim();
    if (!text) throw new HttpError("Ask a question.");

    const all = await listContracts();
    const inScope = contractId ? all.filter((c) => c.id === contractId) : all;
    if (inScope.length === 0) throw new HttpError("No contracts to search.", 404);

    const history: Turn[] = (await listMessages()).map((m) => ({ role: m.role, text: m.text }));
    // Stored only once answered, so a failed call does not leave a question hanging in the history.
    const result = await askContracts(text, inScope, history);
    return { messages: await addExchange(text, result) };
  });
}

export async function DELETE() {
  return respond(async () => {
    await clearMessages();
    return { ok: true };
  });
}
