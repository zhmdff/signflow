import { create } from "zustand";
import { api, errorMessage, type UploadInput, type UploadResult } from "@/lib/api";
import type { TermsInput } from "@/lib/terms";
import type { AsyncStatus, Contract } from "@/lib/types";
import { useCompareStore } from "./compare-store";

type ContractsState = {
  contracts: Contract[];
  status: AsyncStatus;
  error: string | null;
  uploading: boolean;
  uploadError: string | null;
  /** The most recent successful upload, for showing what it cost. */
  lastUpload: UploadResult | null;
  load: (opts?: { force?: boolean }) => Promise<void>;
  upload: (input: UploadInput) => Promise<Contract | null>;
  remove: (id: string) => Promise<void>;
  /** Saves the company's own terms. Resolves to an error message, or null on success. */
  saveTerms: (input: TermsInput) => Promise<string | null>;
  clearUploadError: () => void;
};

export const useContractsStore = create<ContractsState>()((set, get) => ({
  contracts: [],
  status: "idle",
  error: null,
  uploading: false,
  uploadError: null,
  lastUpload: null,

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
    set({ uploading: true, uploadError: null, lastUpload: null });
    try {
      const result = await api.upload(input);
      const { contract } = result;
      set((s) => ({
        uploading: false,
        lastUpload: result,
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

  saveTerms: async (input) => {
    try {
      const contract = await api.saveTerms(input);
      set((s) => ({
        contracts: [contract, ...s.contracts.filter((c) => c.id !== contract.id && c.kind !== "own_terms")],
      }));
      // Comparisons were made against the old terms, so they no longer hold.
      useCompareStore.getState().reset();
      return null;
    } catch (err) {
      return errorMessage(err);
    }
  },

  clearUploadError: () => set({ uploadError: null }),
}));
