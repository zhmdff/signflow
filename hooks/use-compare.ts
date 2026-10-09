"use client";

import { useEffect } from "react";
import { IDLE_ENTRY, useCompareStore } from "@/stores/compare-store";
import { useContracts } from "./use-contracts";

export function useCompare() {
  const { partners, ownTerms, loading } = useContracts();
  const selectedId = useCompareStore((s) => s.selectedId);
  const select = useCompareStore((s) => s.select);
  const run = useCompareStore((s) => s.run);

  // Fall back to the first partner contract when nothing valid is selected.
  const selected = partners.find((c) => c.id === selectedId) ?? partners[0] ?? null;
  useEffect(() => {
    if (selected && selected.id !== selectedId) select(selected.id);
  }, [selected, selectedId, select]);

  const entry = useCompareStore((s) => (selected ? s.entries[selected.id] : undefined)) ?? IDLE_ENTRY;

  return {
    partners,
    ownTerms,
    loadingContracts: loading,
    selected,
    select,
    ...entry,
    run: (opts?: { force?: boolean }) => (selected ? run(selected.id, opts) : Promise.resolve()),
  };
}
