import { askContracts, type Turn } from "@/lib/server/ask";
import { HttpError, readJson, respond } from "@/lib/server/respond";
import { listContracts } from "@/lib/server/store";

export async function POST(request: Request) {
  return respond(async () => {
    const { question, history, contractId } = await readJson<{
      question?: string;
      history?: Turn[];
      contractId?: string | null;
    }>(request);
    if (!question?.trim()) throw new HttpError("Ask a question.");

    const all = await listContracts();
    const contracts = contractId ? all.filter((c) => c.id === contractId) : all;
    if (contracts.length === 0) throw new HttpError("No contracts to search.", 404);

    return askContracts(question.trim(), contracts, Array.isArray(history) ? history : []);
  });
}
