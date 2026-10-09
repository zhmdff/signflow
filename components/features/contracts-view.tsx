"use client";

import { useState } from "react";
import { AiKeyNotice } from "@/components/ai-key-notice";
import { PageHeader } from "@/components/page-header";
import { KindBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";
import { EmptyState, ErrorNote, LoadingBlock } from "@/components/ui/states";
import { UploadPanel } from "@/components/upload-panel";
import { useContractActions } from "@/hooks/use-contract-actions";
import { useContracts } from "@/hooks/use-contracts";
import { cn, formatDate, KIND_LABEL } from "@/lib/format";
import type { Contract, ContractKind } from "@/lib/types";

type Filter = "all" | ContractKind;
const FILTERS: Filter[] = ["all", "partner", "employee", "own_terms"];

function ContractRow({ contract, onRemove }: { contract: Contract; onRemove: (id: string) => void }) {
  const { view, ask, compare } = useContractActions();
  const { end, autoRenew, noticeDays } = contract.fields;

  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
      <div className="min-w-0 flex-1 basis-64">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => view(contract.id)}
            className="truncate text-left font-display text-2xl leading-tight hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            {contract.counterparty}
          </button>
          <KindBadge kind={contract.kind} />
        </div>
        <div className="truncate text-sm text-muted">{contract.title}</div>
        <div className="mt-1 flex flex-wrap gap-x-4 font-mono text-[11px] text-muted">
          <span>{contract.clauses.length} clauses</span>
          <span>{end ? `ends ${formatDate(end)}` : "open-ended"}</span>
          {noticeDays && <span>{noticeDays} days notice</span>}
          {autoRenew && <span className="text-major">auto-renews</span>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => view(contract.id)}>
          <Icon name="file" className="size-3.5" />
          Read
        </Button>
        <Button variant="secondary" size="sm" onClick={() => ask(contract.id)}>
          <Icon name="ask" className="size-3.5" />
          Ask
        </Button>
        {contract.kind === "partner" && (
          <Button variant="secondary" size="sm" onClick={() => compare(contract.id)}>
            <Icon name="compare" className="size-3.5" />
            Compare
          </Button>
        )}
        {contract.source === "upload" ? (
          <button
            type="button"
            onClick={() => onRemove(contract.id)}
            aria-label={`Delete ${contract.title}`}
            className="rounded-md p-1.5 text-muted hover:bg-critical-soft hover:text-critical focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Icon name="trash" />
          </button>
        ) : (
          <span className="w-7" />
        )}
      </div>
    </li>
  );
}

export function ContractsView() {
  const { contracts, loading, status, error, reload, remove } = useContracts();
  const { view } = useContractActions();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const count = (f: Filter) => (f === "all" ? contracts.length : contracts.filter((c) => c.kind === f).length);
  const needle = query.trim().toLowerCase();
  const shown = contracts.filter(
    (c) =>
      (filter === "all" || c.kind === filter) &&
      (!needle || `${c.counterparty} ${c.title}`.toLowerCase().includes(needle)),
  );

  return (
    <>
      <PageHeader eyebrow="Library" title="Contracts">
        Everything SignFlow has read. Add a contract here, then read it, ask about it or compare it with your terms.
      </PageHeader>

      <AiKeyNotice />

      <section className="mb-10">
        <SectionTitle>Add a contract</SectionTitle>
        <UploadPanel onUploaded={(c) => view(c.id)} />
      </section>

      <section>
        <SectionTitle>Your contracts</SectionTitle>

        {status === "error" && contracts.length === 0 ? (
          <ErrorNote
            action={
              <button type="button" onClick={reload} className="font-medium underline">
                Retry
              </button>
            }
          >
            {error}
          </ErrorNote>
        ) : loading ? (
          <LoadingBlock title="Loading contracts" />
        ) : contracts.length === 0 ? (
          <EmptyState title="No contracts yet">Upload your own terms first, then a partner contract.</EmptyState>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label="Filter by type" className="inline-flex flex-wrap rounded-md bg-line-soft p-0.5">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={filter === f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "rounded px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent",
                      filter === f ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
                    )}
                  >
                    {f === "all" ? "All" : KIND_LABEL[f]} <span className="font-mono text-[11px] text-muted">{count(f)}</span>
                  </button>
                ))}
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search contracts"
                placeholder="Search by name or title"
                className="h-9 w-full rounded-md border border-line bg-surface px-3 text-sm placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent sm:w-64"
              />
            </div>

            {error && (
              <div className="mb-3">
                <ErrorNote>{error}</ErrorNote>
              </div>
            )}

            {shown.length === 0 ? (
              <EmptyState title="Nothing matches">Try a different filter or search term.</EmptyState>
            ) : (
              <Card>
                <ul className="divide-y divide-line">
                  {shown.map((c) => (
                    <ContractRow key={c.id} contract={c} onRemove={remove} />
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </section>
    </>
  );
}
