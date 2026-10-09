import { create } from "zustand";
import { api, errorMessage, type UploadInput } from "@/lib/api";
import type { Contract } from "@/lib/types";

export type AsyncStatus = "idle" | "loading" | "ready" | "error";

type ContractsState = {
  contracts: Contract[];
  status: AsyncStatus;
  error: string | null;
  uploading: boolean;
  uploadError: string | null;
  load: (opts?: { force?: boolean }) => Promise<void>;
  upload: (input: UploadInput) => Promise<Contract | null>;
  remove: (id: string) => Promise<void>;
  clearUploadError: () => void;
};

export const useContractsStore = create<ContractsState>()((set, get) => ({
  contracts: [],
  status: "idle",
  error: null,
  uploading: false,
  uploadError: null,

  load: async ({ force = false } = {}) => {
    const { status } = get();
    if (status === "loading" || (status === "ready" && !force)) return;
    set({ status: "loading", error: null });
    try {
      set({ contracts: await api.contracts(), status: "ready" });
    } catch (err) {
      set({ status: "error", error: errorMessage(err) });
    }
  },

  upload: async (input) => {
    set({ uploading: true, uploadError: null });
    try {
      const { contract } = await api.upload(input);
      set((s) => ({
        uploading: false,
        contracts: [...s.contracts.filter((c) => c.id !== contract.id), contract],
      }));
      return contract;
    } catch (err) {
      set({ uploading: false, uploadError: errorMessage(err) });
      return null;
    }
  },

  remove: async (id) => {
    const previous = get().contracts;
    set({ contracts: previous.filter((c) => c.id !== id) });
    try {
      await api.removeContract(id);
    } catch (err) {
      set({ contracts: previous, error: errorMessage(err) });
    }
  },

  clearUploadError: () => set({ uploadError: null }),
}));
