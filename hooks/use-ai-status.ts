"use client";

import { useEffect } from "react";
import { useUiStore } from "@/stores/ui-store";

/** Whether a Gemini key is configured on the server. Null until known. */
export function useAiStatus() {
  const ai = useUiStore((s) => s.ai);
  const loadAi = useUiStore((s) => s.loadAi);
  useEffect(() => {
    void loadAi();
  }, [loadAi]);
  return ai;
}
