"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { UsageSummary } from "@/lib/types";

/** Token usage and cache savings so far. Null until loaded, or if it cannot be loaded. */
export function useUsage(): UsageSummary | null {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  useEffect(() => {
    let live = true;
    api
      .usage()
      .then((u) => live && setUsage(u))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return usage;
}
