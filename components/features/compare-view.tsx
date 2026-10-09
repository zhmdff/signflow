"use client";

import { useState } from "react";
import { AddContractDrawer } from "@/components/add-contract-drawer";
import { AiKeyNotice } from "@/components/ai-key-notice";
import { QuoteBlock, SuggestedWording } from "@/components/citation";
import { ContractSelect } from "@/components/contract-select";
import { PageHeader } from "@/components/page-header";
import { ReviewNotice } from "@/components/review-notice";
import { ConfidenceLabel, SeverityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible } from "@/components/ui/collapsible";
import { Icon } from "@/components/ui/icons";
import { EmptyState, ErrorNote, LoadingBlock, Spinner } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { useCompare } from "@/hooks/use-compare";
import { cn, TOPIC_LABEL } from "@/lib/format";
import type { CompareResult, Contract, Finding, MissingClause, Severity } from "@/lib/types";
import { useUiStore } from "@/stores/ui-store";

const COUNT_TEXT: Record<Severity, string> = {
  critical: "text-critical",
  major: "text-major",
  minor: "text-minor",
};

/** The one line a finding shows while closed: enough to decide whether to open it. */
function Summary({ topic, severity, line }: { topic: Finding["topic"]; severity: Severity; line: string }) {
  return (
    <div className="flex items-center gap-3">
      <SeverityBadge severity={severity} />
      <div className="min-w-0">
        <div className="font-semibold">{TOPIC_LABEL[topic]}</div>
        <div className="truncate text-sm text-muted">{line}</div>
      </div>
    </div>
  );
}

function Position({
  label,
  text,
  contract,
  quote,
}: {
  label: string;
  text: string;
  contract: Contract;
  quote: Finding["ourQuote"];
}) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="text-xs font-semibold text-muted">{label}</div>
      <p className="text-sm">{text}</p>
      {quote && <QuoteBlock contract={contract} quote={quote} />}
    </div>
  );
}

function FindingCard({
  finding,
  terms,
  partner,
  defaultOpen,
}: {
  finding: Finding;
  terms: Contract;
  partner: Contract;
  defaultOpen: boolean;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      summary={<Summary topic={finding.topic} severity={finding.severity} line={finding.theirPosition} />}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Position label="Our terms" text={finding.ourPosition} contract={terms} quote={finding.ourQuote} />
        <Position label="Their contract" text={finding.theirPosition} contract={partner} quote={finding.theirQuote} />
      </div>
      <p className="mt-5 text-sm text-ink-soft">{finding.explanation}</p>
      <div className="mt-4">
        <SuggestedWording text={finding.suggestedWording} />
      </div>
      <div className="mt-3">
        <ConfidenceLabel confidence={finding.confidence} />
      </div>
    </Collapsible>
  );
}

function MissingCard({ missing, terms, defaultOpen }: { missing: MissingClause; terms: Contract; defaultOpen: boolean }) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      summary={<Summary topic={missing.topic} severity={missing.severity} line={missing.why} />}
    >
      <p className="mb-4 text-sm text-ink-soft">{missing.why}</p>
      {missing.ourQuote && <QuoteBlock contract={terms} quote={missing.ourQuote} label="We require" />}
      <div className="mt-4">
        <SuggestedWording label="Clause to add" text={missing.suggestedWording} />
      </div>
    </Collapsible>
  );
}

type ResultTab = "mismatches" | "missing";

function Results({ result, terms, partner }: { result: CompareResult; terms: Contract; partner: Contract }) {
  const [tab, setTab] = useState<ResultTab>(result.findings.length === 0 && result.missingClauses.length > 0 ? "missing" : "mismatches");
  const count = (s: Severity) => result.findings.filter((f) => f.severity === s).length;
  const clean = result.findings.length === 0 && result.missingClauses.length === 0;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <p className="text-[15px] leading-relaxed">{result.summary}</p>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-4">
          {(["critical", "major", "minor"] as const).map((s) => (
            <div key={s} className="flex items-baseline gap-2">
              <dd className={cn("heading text-2xl leading-none tabular-nums", count(s) > 0 && COUNT_TEXT[s])}>
                {count(s)}
              </dd>
              <dt className="text-sm text-muted">{s}</dt>
            </div>
          ))}
          <div className="flex items-baseline gap-2">
            <dd className="heading text-2xl leading-none tabular-nums">{result.missingClauses.length}</dd>
            <dt className="text-sm text-muted">missing</dt>
          </div>
        </dl>
        <div className="mt-4">
          <ReviewNotice stats={result.stats} usage={result.usage} cached={result.cached} />
        </div>
      </Card>

      {clean ? (
        <EmptyState icon="check" title="No conflicts found">
          Nothing in this contract departs from your terms. A reviewer should still read it before signing.
        </EmptyState>
      ) : (
        <>
          <Tabs
            label="Result sections"
            variant="underline"
            value={tab}
            onChange={setTab}
            items={[
              { value: "mismatches", label: "Mismatches", count: result.findings.length },
              { value: "missing", label: "Missing clauses", count: result.missingClauses.length },
            ]}
          />

          {tab === "mismatches" &&
            (result.findings.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No clause in their contract conflicts with your terms.</p>
            ) : (
              <div className="space-y-3">
                {result.findings.map((f, i) => (
                  <FindingCard key={i} finding={f} terms={terms} partner={partner} defaultOpen={i === 0} />
                ))}
              </div>
            ))}

          {tab === "missing" &&
            (result.missingClauses.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Their contract covers everything your terms require.</p>
            ) : (
              <div className="space-y-3">
                {result.missingClauses.map((m, i) => (
                  <MissingCard key={i} missing={m} terms={terms} defaultOpen={i === 0} />
                ))}
              </div>
            ))}
        </>
      )}
    </div>
  );
}

export function CompareView() {
  const { partners, ownTerms, loadingContracts, selected, select, status, result, error, run } = useCompare();
  const [adding, setAdding] = useState(false);
  const openViewer = useUiStore((s) => s.openViewer);
  const running = status === "loading";

  return (
    <>
      <PageHeader
        title="Compare with our terms"
        actions={
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Icon name="plus" />
            Add contract
          </Button>
        }
      >
        Pick a partner contract. SignFlow reads it against your terms and quotes both sides of every mismatch.
      </PageHeader>

      <AiKeyNotice />

      {loadingContracts ? (
        <LoadingBlock title="Loading contracts" />
      ) : (
        <>
          <Card className="mb-6 flex flex-wrap items-end gap-4 p-5">
            <div className="min-w-0 flex-1 basis-64">
              <ContractSelect
                id="compare-contract"
                label="Partner contract"
                contracts={partners}
                value={selected?.id ?? null}
                onChange={select}
                disabled={running || partners.length === 0}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Against</span>
              <div className="flex h-10 items-center">
                {ownTerms ? (
                  <button
                    type="button"
                    onClick={() => openViewer(ownTerms.id)}
                    className="text-sm font-medium underline decoration-line underline-offset-4 hover:text-accent hover:decoration-accent focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    Our terms, {ownTerms.clauses.length} rules
                  </button>
                ) : (
                  <span className="text-sm text-critical">No terms set up</span>
                )}
              </div>
            </div>
            <Button onClick={() => run({ force: result !== null })} disabled={!selected || !ownTerms || running}>
              {running ? <Spinner /> : <Icon name={result ? "refresh" : "compare"} />}
              {running ? "Comparing" : result ? "Run again" : "Compare"}
            </Button>
          </Card>

          {error && (
            <div className="mb-6">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          {running && !result && (
            <LoadingBlock
              title={`Reading ${selected?.counterparty ?? "the contract"} against your terms`}
              detail="Comparing clause by clause, then checking every quote against the source. Usually 10 to 30 seconds."
            />
          )}

          {!ownTerms ? (
            <EmptyState title="Set up your terms first">
              The comparison needs your own rules as the reference. Add them on the Our terms page.
            </EmptyState>
          ) : partners.length === 0 ? (
            <EmptyState title="No partner contracts yet">Add one to compare it with your terms.</EmptyState>
          ) : result && selected ? (
            // Keyed so a different contract's result starts on its own first tab.
            <div key={selected.id} className={cn(running && "opacity-50")}>
              <Results result={result} terms={ownTerms} partner={selected} />
            </div>
          ) : (
            !running &&
            !error && (
              <EmptyState icon="compare" title="Ready to compare">
                {selected?.counterparty} has {selected?.clauses.length} clauses. Your terms have{" "}
                {ownTerms.clauses.length} rules.
              </EmptyState>
            )
          )}
        </>
      )}

      <AddContractDrawer
        open={adding}
        onClose={() => setAdding(false)}
        defaultKind="partner"
        lockKind
        onUploaded={(c) => select(c.id)}
      />
    </>
  );
}
