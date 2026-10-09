"use client";

import { useMemo } from "react";
import type { Contract, LawImpact } from "@/lib/types";
import { useLawStore } from "@/stores/law-store";
import { useContracts } from "./use-contracts";

export type ImpactGroup = { contract: Contract; impacts: LawImpact[] };

export function useLawScan() {
  const { byId, contracts } = useContracts();
  const lawText = useLawStore((s) => s.lawText);
  const status = useLawStore((s) => s.status);
  const result = useLawStore((s) => s.result);
  const error = useLawStore((s) => s.error);
  const setLawText = useLawStore((s) => s.setLawText);
  const scan = useLawStore((s) => s.scan);

  // Impacts arrive sorted by risk, so each group and the group order keep the worst first.
  const groups = useMemo(() => {
    const map = new Map<string, ImpactGroup>();
    for (const impact of result?.impacts ?? []) {
      const contract = byId.get(impact.contractId);
      if (!contract) continue;
      const group = map.get(contract.id) ?? { contract, impacts: [] };
      group.impacts.push(impact);
      map.set(contract.id, group);
    }
    return [...map.values()];
  }, [result, byId]);

  return {
    lawText,
    setLawText,
    status,
    result,
    error,
    groups,
    scannedCount: contracts.filter((c) => c.kind !== "own_terms").length,
    scan,
  };
}
