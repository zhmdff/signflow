"use client";

import { useState } from "react";
import { AiKeyNotice } from "@/components/ai-key-notice";
import { QuoteBlock, SuggestedWording } from "@/components/citation";
import { ContractSelect } from "@/components/contract-select";
import { PageHeader } from "@/components/page-header";
import { ReviewNotice } from "@/components/review-notice";
import { ConfidenceLabel, SeverityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";
import { EmptyState, ErrorNote, LoadingBlock, Spinner } from "@/components/ui/states";
import { UploadPanel } from "@/components/upload-panel";
import { useCompare } from "@/hooks/use-compare";
import { cn, TOPIC_LABEL } from "@/lib/format";
import type { CompareResult, Contract, Finding, MissingClause, Severity } from "@/lib/types";
import { useUiStore } from "@/stores/ui-store";

const EDGE: Record<Severity, string> = {
  critical: "border-l-critical",
  major: "border-l-major",
  minor: "border-l-minor",
};

const COUNT_TEXT: Record<Severity, string> = {
  critical: "text-critical",
  major: "text-major",
  minor: "text-minor",
};

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
      <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{label}</div>
      <p className="text-sm">{text}</p>
      {quote && <QuoteBlock contract={contract} quote={quote} />}
    </div>
  );
}

function FindingCard({ finding, terms, partner }: { finding: Finding; terms: Contract; partner: Contract }) {
  return (
    <Card className={cn("animate-rise-in border-l-4 p-5", EDGE[finding.severity])}>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="font-display text-2xl leading-none">{TOPIC_LABEL[finding.topic]}</h3>
        <SeverityBadge severity={finding.severity} />
        <ConfidenceLabel confidence={finding.confidence} />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Position label="Our terms" text={finding.ourPosition} contract={terms} quote={finding.ourQuote} />
        <Position label="Their contract" text={finding.theirPosition} contract={partner} quote={finding.theirQuote} />
      </div>
      <p className="mt-4 text-sm text-ink-soft">{finding.explanation}</p>
      <div className="mt-4">
        <SuggestedWording text={finding.suggestedWording} />
      </div>
    </Card>
  );
}

function MissingCard({ missing, terms }: { missing: MissingClause; terms: Contract }) {
  return (
    <Card className={cn("animate-rise-in border-l-4 border-dashed p-5", EDGE[missing.severity])}>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="font-display text-2xl leading-none">{TOPIC_LABEL[missing.topic]}</h3>
        <SeverityBadge severity={missing.severity} />
        <span className="text-xs text-muted">Not in their contract</span>
      </div>
      <p className="mb-3 text-sm text-ink-soft">{missing.why}</p>
      {missing.ourQuote && <QuoteBlock contract={terms} quote={missing.ourQuote} label="We require" />}
      <div className="mt-4">
        <SuggestedWording label="Clause to add" text={missing.suggestedWording} />
      </div>
    </Card>
  );
}

function Results({ result, terms, partner }: { result: CompareResult; terms: Contract; partner: Contract }) {
  const count = (s: Severity) => result.findings.filter((f) => f.severity === s).length;
  const clean = result.findings.length === 0 && result.missingClauses.length === 0;

  return (
    <div className="space-y-8">
      <Card className="p-5">
        <p className="font-display text-2xl leading-snug">{result.summary}</p>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-4">
          {(["critical", "major", "minor"] as const).map((s) => (
            <div key={s} className="flex items-baseline gap-2">
              <dd className={cn("font-display text-3xl leading-none tabular-nums", count(s) > 0 && COUNT_TEXT[s])}>
                {count(s)}
              </dd>
              <dt className="text-sm text-muted">{s}</dt>
            </div>
          ))}
          <div className="flex items-baseline gap-2">
            <dd className="font-display text-3xl leading-none tabular-nums">{result.missingClauses.length}</dd>
            <dt className="text-sm text-muted">missing</dt>
          </div>
        </dl>
        <div className="mt-4">
          <ReviewNotice stats={result.stats} usage={result.usage} cached={result.cached} />
        </div>
      </Card>

      {clean && (
        <EmptyState icon="check" title="No conflicts found">
          Nothing in this contract departs from your terms. A reviewer should still read it before signing.
        </EmptyState>
      )}

      {result.findings.length > 0 && (
        <section>
          <SectionTitle>Mismatches, most serious first</SectionTitle>
          <div className="space-y-3">
            {result.findings.map((f, i) => (
              <FindingCard key={i} finding={f} terms={terms} partner={partner} />
            ))}
          </div>
        </section>
      )}

      {result.missingClauses.length > 0 && (
        <section>
          <SectionTitle>Clauses we require that are missing</SectionTitle>
          <div className="space-y-3">
            {result.missingClauses.map((m, i) => (
              <MissingCard key={i} missing={m} terms={terms} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function CompareView() {
  const { partners, ownTerms, loadingContracts, selected, select, status, result, error, run } = useCompare();
  const [uploadOpen, setUploadOpen] = useState(false);
  const openViewer = useUiStore((s) => s.openViewer);
  const running = status === "loading";

  return (
    <>
      <PageHeader eyebrow="Check 01" title="Compare with our terms">
        Pick a partner contract. SignFlow reads it against your standard terms topic by topic and quotes both sides
        of every mismatch.
      </PageHeader>

      <AiKeyNotice />

      {loadingContracts ? (
        <LoadingBlock title="Loading contracts" />
      ) : (
        <>
          <Card className="mb-3 flex flex-wrap items-end gap-4 p-5">
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
                    Our terms, {ownTerms.clauses.length} clauses
                  </button>
                ) : (
                  <span className="text-sm text-critical">No terms uploaded</span>
                )}
              </div>
            </div>
            <Button variant="accent" onClick={() => run({ force: result !== null })} disabled={!selected || !ownTerms || running}>
              {running ? <Spinner /> : <Icon name={result ? "refresh" : "compare"} />}
              {running ? "Comparing" : result ? "Run again" : "Compare"}
            </Button>
          </Card>

          <div className="mb-8">
            <button
              type="button"
              onClick={() => setUploadOpen((v) => !v)}
              aria-expanded={uploadOpen}
              className="inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Icon name="upload" className="size-3.5" />
              {uploadOpen ? "Hide upload" : "Upload a new partner contract"}
            </button>
            {uploadOpen && (
              <div className="mt-3">
                <UploadPanel
                  defaultKind="partner"
                  lockKind
                  onUploaded={(c) => {
                    select(c.id);
                    setUploadOpen(false);
                  }}
                />
              </div>
            )}
          </div>

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
            <EmptyState title="Upload your own terms first">
              The comparison needs your standard terms as the reference. Add them from the overview page.
            </EmptyState>
          ) : partners.length === 0 ? (
            <EmptyState title="No partner contracts yet">Upload one above to compare it with your terms.</EmptyState>
          ) : result && selected ? (
            <div className={cn(running && "opacity-50")}>
              <Results result={result} terms={ownTerms} partner={selected} />
            </div>
          ) : (
            !running &&
            !error && (
              <EmptyState icon="compare" title="Ready to compare">
                {selected?.counterparty} has {selected?.clauses.length} clauses. Your terms have{" "}
                {ownTerms.clauses.length}. Results are cached, so a second run is instant.
              </EmptyState>
            )
          )}
        </>
      )}
    </>
  );
}
