import { create } from "zustand";
import { api, errorMessage } from "@/lib/api";
import type { AsyncStatus, LawScanResult, LawScanSummary } from "@/lib/types";

type LawState = {
  lawText: string;
  status: AsyncStatus;
  result: LawScanResult | null;
  error: string | null;
  /** Past scans saved on the server, newest first. */
  history: LawScanSummary[];
  historyLoaded: boolean;
  setLawText: (lawText: string) => void;
  scan: (opts?: { force?: boolean }) => Promise<void>;
  loadHistory: (opts?: { force?: boolean }) => Promise<void>;
  /** Shows a past scan as it was saved, without running anything. */
  open: (scanId: string) => Promise<void>;
  removeScan: (scanId: string) => Promise<void>;
};

export const useLawStore = create<LawState>()((set, get) => ({
  lawText: "",
  status: "idle",
  result: null,
  error: null,
  history: [],
  historyLoaded: false,

  // A result describes the text it was run on, so editing the text retires it.
  setLawText: (lawText) => set({ lawText, status: "idle", result: null, error: null }),

  scan: async ({ force = false } = {}) => {
    const { lawText, status } = get();
    if (status === "loading" || !lawText.trim()) return;
    set({ status: "loading", error: null });
    try {
      const result = await api.runLawScan(lawText, force);
      // Ignore the answer if the text changed while the scan was running.
      if (get().lawText === lawText) set({ status: "ready", result });
      void get().loadHistory({ force: true });
    } catch (err) {
      if (get().lawText === lawText) set({ status: "error", error: errorMessage(err) });
    }
  },

  loadHistory: async ({ force = false } = {}) => {
    if (get().historyLoaded && !force) return;
    try {
      set({ history: await api.lawScans(), historyLoaded: true });
    } catch {
      // History is a convenience; the page works without it.
    }
  },

  open: async (scanId) => {
    if (get().status === "loading") return;
    set({ status: "loading", error: null });
    try {
      const { lawText, result } = await api.lawScan(scanId);
      set({ lawText, result, status: "ready" });
    } catch (err) {
      set({ status: "error", error: errorMessage(err) });
    }
  },

  removeScan: async (scanId) => {
    set((s) => ({ history: s.history.filter((h) => h.id !== scanId) }));
    try {
      await api.removeLawScan(scanId);
    } catch {
      void get().loadHistory({ force: true });
    }
  },
}));
