"use client";

import { useEffect, useMemo } from "react";
import { useContractsStore } from "@/stores/contracts-store";

/** The contract library. Loads once; every page shares the same copy. */
export function useContracts() {
  const contracts = useContractsStore((s) => s.contracts);
  const status = useContractsStore((s) => s.status);
  const error = useContractsStore((s) => s.error);
  const load = useContractsStore((s) => s.load);
  const remove = useContractsStore((s) => s.remove);

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({
      contracts,
      status,
      error,
      loading: status === "idle" || status === "loading",
      ownTerms: contracts.find((c) => c.kind === "own_terms") ?? null,
      partners: contracts.filter((c) => c.kind === "partner"),
      employees: contracts.filter((c) => c.kind === "employee"),
      byId: new Map(contracts.map((c) => [c.id, c])),
      reload: () => load({ force: true }),
      remove,
    }),
    [contracts, status, error, load, remove],
  );
}

export function useUpload() {
  const upload = useContractsStore((s) => s.upload);
  const uploading = useContractsStore((s) => s.uploading);
  const error = useContractsStore((s) => s.uploadError);
  const clearError = useContractsStore((s) => s.clearUploadError);
  return { upload, uploading, error, clearError };
}
