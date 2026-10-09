import { create } from "zustand";
import { api, errorMessage } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

type ChatState = {
  messages: ChatMessage[];
  pending: boolean;
  /** Null searches every contract. */
  scopeId: string | null;
  setScope: (scopeId: string | null) => void;
  send: (question: string) => Promise<void>;
  clear: () => void;
};

let nextId = 0;
const newId = () => `m${++nextId}`;

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  pending: false,
  scopeId: null,

  setScope: (scopeId) => set({ scopeId }),

  send: async (question) => {
    const text = question.trim();
    if (!text || get().pending) return;

    const history = get()
      .messages.filter((m) => !(m.role === "assistant" && m.error))
      .map((m) => ({ role: m.role, text: m.text }));

    set((s) => ({ pending: true, messages: [...s.messages, { id: newId(), role: "user", text }] }));
    try {
      const result = await api.ask(text, history, get().scopeId);
      set((s) => ({
        pending: false,
        messages: [...s.messages, { id: newId(), role: "assistant", text: result.answer, result }],
      }));
    } catch (err) {
      set((s) => ({
        pending: false,
        messages: [...s.messages, { id: newId(), role: "assistant", text: errorMessage(err), error: true }],
      }));
    }
  },

  clear: () => set({ messages: [] }),
}));
