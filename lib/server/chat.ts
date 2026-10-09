import type { AskResult, ChatMessage } from "@/lib/types";
import { db } from "./db";

type Row = { id: number; role: "user" | "assistant"; text: string; result: string | null };

const toMessage = (row: Row): ChatMessage =>
  row.role === "user"
    ? { id: String(row.id), role: "user", text: row.text }
    : { id: String(row.id), role: "assistant", text: row.text, result: row.result ? (JSON.parse(row.result) as AskResult) : undefined };

export function listMessages(): ChatMessage[] {
  return (db().prepare("SELECT id, role, text, result FROM chat_messages ORDER BY id").all() as Row[]).map(toMessage);
}

export function addMessage(role: "user" | "assistant", text: string, result?: AskResult): ChatMessage {
  const { lastInsertRowid } = db()
    .prepare("INSERT INTO chat_messages (at, role, text, result) VALUES (?, ?, ?, ?)")
    .run(new Date().toISOString(), role, text, result ? JSON.stringify(result) : null);
  return toMessage({ id: Number(lastInsertRowid), role, text, result: result ? JSON.stringify(result) : null });
}

export function clearMessages(): void {
  db().prepare("DELETE FROM chat_messages").run();
}
