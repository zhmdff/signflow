import type { AskResult, ChatMessage } from "@/lib/types";
import { query } from "./db";

type Row = { id: string; role: "user" | "assistant"; text: string; result: AskResult | null };

const toMessage = (row: Row): ChatMessage =>
  row.role === "user"
    ? { id: String(row.id), role: "user", text: row.text }
    : { id: String(row.id), role: "assistant", text: row.text, result: row.result ?? undefined };

export async function listMessages(): Promise<ChatMessage[]> {
  return (await query<Row>("SELECT id, role, text, result FROM chat_messages ORDER BY id")).map(toMessage);
}

/** Stores a question and its answer together, in order, in one round trip. */
export async function addExchange(question: string, result: AskResult): Promise<ChatMessage[]> {
  const rows = await query<Row>(
    `INSERT INTO chat_messages (role, text, result) VALUES ('user', $1, NULL), ('assistant', $2, $3)
     RETURNING id, role, text, result`,
    [question, result.answer, JSON.stringify(result)],
  );
  return rows.sort((a, b) => Number(a.id) - Number(b.id)).map(toMessage);
}

export async function clearMessages(): Promise<void> {
  await query("DELETE FROM chat_messages");
}
