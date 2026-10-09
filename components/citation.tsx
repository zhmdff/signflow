"use client";

import { useState } from "react";
import { cn, contractLabel } from "@/lib/format";
import type { Contract, Quote } from "@/lib/types";
import { useUiStore } from "@/stores/ui-store";
import { Icon } from "./ui/icons";

/** A clause reference that opens the contract at that clause. */
export function ClauseChip({
  contract,
  clauseId,
  short = false,
}: {
  contract: Contract;
  clauseId: string;
  /** Show only the clause id, for places where the contract is already named. */
  short?: boolean;
}) {
  const openViewer = useUiStore((s) => s.openViewer);
  return (
    <button
      type="button"
      onClick={() => openViewer(contract.id, clauseId)}
      title="Open this clause"
      className="inline-flex max-w-full items-center gap-1 rounded border border-line bg-paper px-1.5 py-0.5 text-left font-mono text-[11px] text-ink-soft transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span className="truncate">{short ? `§ ${clauseId}` : `${contractLabel(contract)}, clause ${clauseId}`}</span>
    </button>
  );
}

const STATUS_NOTE: Record<Quote["status"], string> = {
  exact: "Found verbatim",
  moved: "Found verbatim; clause number corrected",
  unverified: "Not found in the source. Check before relying on it.",
};

/** A quote from a contract with its clause link and the verifier's verdict. */
export function QuoteBlock({ contract, quote, label }: { contract: Contract; quote: Quote; label?: string }) {
  const bad = quote.status === "unverified";
  return (
    <figure className={cn("border-l-2 pl-3", bad ? "border-dashed border-major" : "border-ink/25")}>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        {label && <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</span>}
        <ClauseChip contract={contract} clauseId={quote.clauseId} short={Boolean(label)} />
      </div>
      <blockquote className={cn("text-[15px] leading-relaxed", bad && "text-ink-soft")}>
        “{quote.text}”
      </blockquote>
      <figcaption
        className={cn("mt-1 inline-flex items-center gap-1 text-[11px]", bad ? "font-medium text-major" : "text-minor")}
      >
        <Icon name={bad ? "alert" : "check"} className="size-3" />
        {STATUS_NOTE[quote.status]}
      </figcaption>
    </figure>
  );
}

/** Replacement clause text with a copy button. */
export function SuggestedWording({ label = "Suggested wording", text }: { label?: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; the text stays selectable.
    }
  }

  return (
    <div className="rounded-md border border-accent/20 bg-accent-soft/60 px-3 py-2.5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold tracking-wide text-accent uppercase">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded text-[11px] font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Icon name={copied ? "check" : "copy"} className="size-3" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-sm leading-relaxed text-ink">{text}</p>
    </div>
  );
}
