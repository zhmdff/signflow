import { create } from "zustand";
import { api, errorMessage } from "@/lib/api";
import type { LawScanResult } from "@/lib/types";
import type { AsyncStatus } from "./contracts-store";

type LawState = {
  lawText: string;
  status: AsyncStatus;
  result: LawScanResult | null;
  error: string | null;
  setLawText: (lawText: string) => void;
  scan: (opts?: { force?: boolean }) => Promise<void>;
  reset: () => void;
};

export const useLawStore = create<LawState>()((set, get) => ({
  lawText: "",
  status: "idle",
  result: null,
  error: null,

  // A result describes the text it was run on, so editing the text retires it.
  setLawText: (lawText) => set({ lawText, status: "idle", result: null, error: null }),

  scan: async ({ force = false } = {}) => {
    const { lawText, status } = get();
    if (status === "loading" || !lawText.trim()) return;
    set({ status: "loading", error: null });
    try {
      const result = await api.lawScan(lawText, force);
      // Ignore the answer if the text changed while the scan was running.
      if (get().lawText === lawText) set({ status: "ready", result });
    } catch (err) {
      if (get().lawText === lawText) set({ status: "error", error: errorMessage(err) });
    }
  },

  reset: () => set({ lawText: "", status: "idle", result: null, error: null }),
}));
