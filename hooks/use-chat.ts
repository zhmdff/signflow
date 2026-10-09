"use client";

import { useChatStore } from "@/stores/chat-store";

export function useChat() {
  const messages = useChatStore((s) => s.messages);
  const pending = useChatStore((s) => s.pending);
  const scopeId = useChatStore((s) => s.scopeId);
  const setScope = useChatStore((s) => s.setScope);
  const send = useChatStore((s) => s.send);
  const clear = useChatStore((s) => s.clear);
  return { messages, pending, scopeId, setScope, send, clear };
}
