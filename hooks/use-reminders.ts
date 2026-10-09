"use client";

import { useMemo } from "react";
import { buildReminders } from "@/lib/reminders";
import { useContracts } from "./use-contracts";
import { useToday } from "./use-today";

export function useReminders() {
  const { contracts, loading, error, status } = useContracts();
  const today = useToday();

  return useMemo(() => {
    const reminders = today ? buildReminders(contracts, today) : [];
    return {
      today,
      reminders,
      openEnded: contracts.filter((c) => c.kind !== "own_terms" && !c.fields.end),
      counts: {
        red: reminders.filter((r) => r.status === "red").length,
        amber: reminders.filter((r) => r.status === "amber").length,
        green: reminders.filter((r) => r.status === "green").length,
      },
      loading: loading || !today,
      failed: status === "error",
      error,
    };
  }, [contracts, today, loading, status, error]);
}
