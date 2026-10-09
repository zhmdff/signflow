"use client";

import { useRouter } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { useCompareStore } from "@/stores/compare-store";
import { useUiStore } from "@/stores/ui-store";

/** The things you can do with one contract, from anywhere it is listed. */
export function useContractActions() {
  const router = useRouter();
  const openViewer = useUiStore((s) => s.openViewer);
  const closeViewer = useUiStore((s) => s.closeViewer);
  const setScope = useChatStore((s) => s.setScope);
  const selectForCompare = useCompareStore((s) => s.select);

  return {
    view: (contractId: string) => openViewer(contractId),
    /** Opens the chat with the search narrowed to this contract. */
    ask: (contractId: string) => {
      setScope(contractId);
      closeViewer();
      router.push("/dashboard/ask");
    },
    compare: (contractId: string) => {
      selectForCompare(contractId);
      closeViewer();
      router.push("/dashboard/compare");
    },
  };
}
