import { create } from "zustand";
import { api } from "@/lib/api";
import type { AiStatus } from "@/lib/types";

type UiState = {
  /** The contract open in the side viewer, and the clause to highlight in it. */
  viewer: { contractId: string; clauseId: string | null } | null;
  openViewer: (contractId: string, clauseId?: string | null) => void;
  closeViewer: () => void;

  ai: AiStatus | null;
  loadAi: () => Promise<void>;
};

let statusRequest: Promise<AiStatus> | null = null;

export const useUiStore = create<UiState>()((set, get) => ({
  viewer: null,
  openViewer: (contractId, clauseId = null) => set({ viewer: { contractId, clauseId } }),
  closeViewer: () => set({ viewer: null }),

  ai: null,
  loadAi: async () => {
    // Several components ask at once on page load; one request serves them all.
    if (get().ai || statusRequest) return;
    statusRequest = api.status();
    try {
      set({ ai: await statusRequest });
    } catch {
      // The status badge stays hidden; feature calls report their own errors.
    } finally {
      statusRequest = null;
    }
  },
}));
