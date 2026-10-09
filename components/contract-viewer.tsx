"use client";

import { useEffect, useRef } from "react";
import { useContractActions } from "@/hooks/use-contract-actions";
import { useContracts } from "@/hooks/use-contracts";
import { cn, formatDate } from "@/lib/format";
import { useUiStore } from "@/stores/ui-store";
import { KindBadge } from "./ui/badge";
import { Button } from "./ui/button";
import { Icon } from "./ui/icons";

/** Side panel showing a contract's clauses. Every citation in the app opens it at its clause. */
export function ContractViewer() {
  const viewer = useUiStore((s) => s.viewer);
  const close = useUiStore((s) => s.closeViewer);
  const { byId } = useContracts();
  const { ask, compare } = useContractActions();
  const highlighted = useRef<HTMLLIElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  const contract = viewer ? byId.get(viewer.contractId) : undefined;

  useEffect(() => {
    if (!viewer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    closeButton.current?.focus();
    highlighted.current?.scrollIntoView({ block: "center" });
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer, close]);

  if (!viewer || !contract) return null;
  const { start, end, autoRenew, noticeDays } = contract.fields;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="Close contract" onClick={close} className="absolute inset-0 bg-ink/30" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={contract.title}
        className="animate-drawer-in relative flex h-full w-full max-w-xl flex-col border-l border-line bg-surface shadow-2xl"
      >
        <header className="border-b border-line px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <KindBadge kind={contract.kind} />
              <h2 className="mt-2 heading text-2xl leading-tight">{contract.title}</h2>
              <p className="mt-0.5 text-sm text-muted">{contract.counterparty}</p>
            </div>
            <button
              ref={closeButton}
              type="button"
              onClick={close}
              aria-label="Close"
              className="rounded-md p-1.5 text-muted hover:bg-line-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Icon name="close" className="size-5" />
            </button>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
            {[
              ["Start", formatDate(start)],
              ["End", end ? formatDate(end) : "Open-ended"],
              ["Notice", noticeDays ? `${noticeDays} days` : "Not stated"],
              ["Renewal", autoRenew ? "Automatic" : "Manual"],
            ].map(([term, value]) => (
              <div key={term}>
                <dt className="text-muted">{term}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </header>

        <ol className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {contract.clauses.map((clause) => {
            const active = clause.id === viewer.clauseId;
            return (
              <li
                key={clause.id}
                ref={active ? highlighted : undefined}
                className={cn(
                  "grid grid-cols-[3rem_1fr] gap-2 rounded-md px-3 py-3",
                  active && "bg-accent-soft ring-1 ring-accent/30",
                )}
              >
                <span className={cn("font-mono text-xs leading-6", active ? "text-accent" : "text-muted")}>
                  {clause.id}
                </span>
                <div className="min-w-0">
                  {clause.heading && <div className="text-sm font-semibold">{clause.heading}</div>}
                  <p className="text-[15px] leading-relaxed text-ink-soft">{clause.text}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <footer className="flex flex-wrap gap-2 border-t border-line px-6 py-4">
          <Button variant="accent" onClick={() => ask(contract.id)}>
            <Icon name="ask" />
            Ask about this contract
          </Button>
          {contract.kind === "partner" && (
            <Button variant="secondary" onClick={() => compare(contract.id)}>
              <Icon name="compare" />
              Compare with our terms
            </Button>
          )}
        </footer>
      </aside>
    </div>
  );
}
