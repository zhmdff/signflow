import { create } from "zustand";
import { api, errorMessage } from "@/lib/api";
import type { AsyncStatus, CompareResult } from "@/lib/types";

export type CompareEntry = { status: AsyncStatus; result: CompareResult | null; error: string | null };

type CompareState = {
  selectedId: string | null;
  /** Results are kept per contract, so switching contracts or pages does not re-run the comparison. */
  entries: Record<string, CompareEntry>;
  select: (contractId: string | null) => void;
  /** Fetches a comparison saved on the server, if there is one. Never calls a model. */
  loadSaved: (contractId: string) => Promise<void>;
  run: (contractId: string, opts?: { force?: boolean }) => Promise<void>;
  reset: () => void;
};

export const IDLE_ENTRY: CompareEntry = { status: "idle", result: null, error: null };

// Contracts whose saved comparison has been looked up, so each is asked for once.
const looked = new Set<string>();

export const useCompareStore = create<CompareState>()((set, get) => ({
  selectedId: null,
  entries: {},

  select: (selectedId) => set({ selectedId }),

  reset: () => {
    looked.clear();
    set({ entries: {} });
  },

  loadSaved: async (contractId) => {
    if (looked.has(contractId) || get().entries[contractId]) return;
    looked.add(contractId);
    try {
      const result = await api.savedComparison(contractId);
      // A run started in the meantime wins.
      if (result && !get().entries[contractId]) {
        set((s) => ({ entries: { ...s.entries, [contractId]: { status: "ready", result, error: null } } }));
      }
    } catch {
      // Nothing saved is shown as "ready to compare"; a real failure surfaces when the user runs it.
    }
  },

  run: async (contractId, { force = false } = {}) => {
    const current = get().entries[contractId];
    if (current?.status === "loading") return;
    const patch = (entry: CompareEntry) => set((s) => ({ entries: { ...s.entries, [contractId]: entry } }));

    patch({ status: "loading", result: current?.result ?? null, error: null });
    try {
      patch({ status: "ready", result: await api.compare(contractId, force), error: null });
    } catch (err) {
      patch({ status: "error", result: current?.result ?? null, error: errorMessage(err) });
    }
  },
}));
