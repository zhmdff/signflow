"use client";

import { useAiStatus } from "@/hooks/use-ai-status";
import { Icon } from "./ui/icons";

/** Explains up front why AI features will fail, instead of after a click. */
export function AiKeyNotice() {
  const ai = useAiStatus();
  if (!ai || ai.configured) return null;
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-major/30 bg-major-soft px-4 py-3 text-sm text-major">
      <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-semibold">No AI key yet.</span> Add{" "}
        <code className="font-mono text-[13px]">GEMINI_API_KEY=…</code> (or{" "}
        <code className="font-mono text-[13px]">GROQ_API_KEY=…</code>) to{" "}
        <code className="font-mono text-[13px]">.env.local</code> and restart the dev server. Until then you can
        browse contracts and reminders, but compare, law scan, ask and upload will not run.
      </p>
    </div>
  );
}
