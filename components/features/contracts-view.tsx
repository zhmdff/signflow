"use client";

import Link from "next/link";
import { useState } from "react";
import { AddContractDrawer } from "@/components/add-contract-drawer";
import { AiKeyNotice } from "@/components/ai-key-notice";
import { PageHeader } from "@/components/page-header";
import { KindBadge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";
import { EmptyState, ErrorNote, LoadingBlock } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { useContractActions } from "@/hooks/use-contract-actions";
import { useContracts } from "@/hooks/use-contracts";
import { formatDate } from "@/lib/format";
import type { Contract, ContractKind } from "@/lib/types";

type Filter = "all" | ContractKind;
const FILTER_LABEL: Record<Filter, string> = {
  all: "All",
  partner: "Partner",
  employee: "Employee",
  own_terms: "Our terms",
};

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
            className="truncate text-left font-semibold hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            {contract.counterparty}
          </button>
          <KindBadge kind={contract.kind} />
        </div>
        <div className="truncate text-sm text-muted">{contract.title}</div>
        <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted">
          <span>{contract.clauses.length} clauses</span>
          <span>{end ? `Ends ${formatDate(end)}` : "Open-ended"}</span>
          {noticeDays && <span>{noticeDays} days notice</span>}
          {autoRenew && <span className="font-medium text-major">Auto-renews</span>}
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
        {contract.kind === "own_terms" && (
          <Link href="/dashboard/terms" className={buttonClass("secondary", "sm")}>
            <Icon name="edit" className="size-3.5" />
            Edit
          </Link>
        )}
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
  const [adding, setAdding] = useState(false);

  const count = (f: Filter) => (f === "all" ? contracts.length : contracts.filter((c) => c.kind === f).length);
  const needle = query.trim().toLowerCase();
  const shown = contracts.filter(
    (c) =>
      (filter === "all" || c.kind === filter) &&
      (!needle || `${c.counterparty} ${c.title}`.toLowerCase().includes(needle)),
  );

  const addButton = (
    <Button onClick={() => setAdding(true)}>
      <Icon name="plus" />
      Add contract
    </Button>
  );

  return (
    <>
      <PageHeader title="Contracts" actions={addButton}>
        Everything SignFlow has read. Open one to read it, ask about it or compare it with your terms.
      </PageHeader>

      <AiKeyNotice />

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
        <EmptyState title="No contracts yet" action={addButton}>
          Add your first contract to get started.
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Tabs
              label="Filter by type"
              value={filter}
              onChange={setFilter}
              items={(Object.keys(FILTER_LABEL) as Filter[]).map((f) => ({ value: f, label: FILTER_LABEL[f], count: count(f) }))}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search contracts"
              placeholder="Search by name or title"
              className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent sm:w-64"
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

      <AddContractDrawer open={adding} onClose={() => setAdding(false)} onUploaded={(c) => view(c.id)} />
    </>
  );
}
