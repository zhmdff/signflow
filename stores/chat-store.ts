import { create } from "zustand";
import { api, errorMessage } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

type ChatState = {
  /** The conversation as saved on the server, plus any unanswered or failed turn from this session. */
  messages: ChatMessage[];
  loaded: boolean;
  pending: boolean;
  /** Null searches every contract. */
  scopeId: string | null;
  load: () => Promise<void>;
  setScope: (scopeId: string | null) => void;
  send: (question: string) => Promise<void>;
  clear: () => Promise<void>;
};

let localId = 0;
const newLocalId = () => `local-${++localId}`;

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  loaded: false,
  pending: false,
  scopeId: null,

  load: async () => {
    if (get().loaded) return;
    set({ loaded: true });
    try {
      const saved = await api.chat();
      // Keep anything typed before the history arrived.
      set((s) => ({ messages: [...saved, ...s.messages] }));
    } catch {
      set({ loaded: false });
    }
  },

  setScope: (scopeId) => set({ scopeId }),

  send: async (question) => {
    const text = question.trim();
    if (!text || get().pending) return;

    // Shown at once; swapped for the server's copy when the answer arrives.
    const draft: ChatMessage = { id: newLocalId(), role: "user", text };
    set((s) => ({ pending: true, messages: [...s.messages, draft] }));
    try {
      const stored = await api.ask(text, get().scopeId);
      set((s) => ({ pending: false, messages: [...s.messages.filter((m) => m.id !== draft.id), ...stored] }));
    } catch (err) {
      const failure: ChatMessage = { id: newLocalId(), role: "assistant", text: errorMessage(err), error: true };
      set((s) => ({ pending: false, messages: [...s.messages, failure] }));
    }
  },

  clear: async () => {
    const previous = get().messages;
    set({ messages: [] });
    try {
      await api.clearChat();
    } catch {
      set({ messages: previous });
    }
  },
}));
