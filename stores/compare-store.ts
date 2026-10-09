import { create } from "zustand";
import { api, errorMessage } from "@/lib/api";
import type { CompareResult } from "@/lib/types";
import type { AsyncStatus } from "./contracts-store";

export type CompareEntry = { status: AsyncStatus; result: CompareResult | null; error: string | null };

type CompareState = {
  selectedId: string | null;
  /** Results are kept per contract, so switching contracts or pages does not re-run the comparison. */
  entries: Record<string, CompareEntry>;
  select: (contractId: string | null) => void;
  run: (contractId: string, opts?: { force?: boolean }) => Promise<void>;
};

export const IDLE_ENTRY: CompareEntry = { status: "idle", result: null, error: null };

export const useCompareStore = create<CompareState>()((set, get) => ({
  selectedId: null,
  entries: {},

  select: (selectedId) => set({ selectedId }),

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
