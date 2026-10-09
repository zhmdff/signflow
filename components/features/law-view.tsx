"use client";

import { AiKeyNotice } from "@/components/ai-key-notice";
import { QuoteBlock, SuggestedWording } from "@/components/citation";
import { PageHeader } from "@/components/page-header";
import { ReviewNotice } from "@/components/review-notice";
import { Badge, ConfidenceLabel, KindBadge, SeverityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";
import { EmptyState, ErrorNote, LoadingBlock, Spinner } from "@/components/ui/states";
import { useLawScan, type ImpactGroup } from "@/hooks/use-law-scan";
import { cn, formatDate } from "@/lib/format";
import { SAMPLE_LAWS } from "@/lib/samples";
import type { LawRule } from "@/lib/types";
import { useUiStore } from "@/stores/ui-store";

function RuleCard({ rule }: { rule: LawRule }) {
  return (
    <li className="grid grid-cols-[2.5rem_1fr] gap-2 px-5 py-4">
      <span className="font-mono text-xs leading-6 text-accent">{rule.id}</span>
      <div className="min-w-0">
        <p className="font-medium">{rule.obligation}</p>
        <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">Applies to</dt>
            <dd>{rule.appliesTo}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Effective</dt>
            <dd>{formatDate(rule.effectiveDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Penalty</dt>
            <dd>{rule.penalty ?? "Not stated"}</dd>
          </div>
        </dl>
        <p className={cn("mt-2 border-l-2 pl-3 font-display text-base leading-snug text-ink-soft", rule.quoteVerified ? "border-ink/25" : "border-dashed border-major")}>
          “{rule.quote}”
          {!rule.quoteVerified && (
            <span className="mt-0.5 block font-sans text-[11px] font-medium text-major">
              Not found in the law text. Check before relying on it.
            </span>
          )}
        </p>
      </div>
    </li>
  );
}

function ImpactGroupCard({ group, rules }: { group: ImpactGroup; rules: Map<string, LawRule> }) {
  const openViewer = useUiStore((s) => s.openViewer);
  const { contract, impacts } = group;
  return (
    <Card className="animate-rise-in overflow-hidden">
      <header className="flex flex-wrap items-center gap-2 border-b border-line bg-paper/60 px-5 py-3">
        <button
          type="button"
          onClick={() => openViewer(contract.id)}
          className="font-display text-2xl leading-none hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          {contract.counterparty}
        </button>
        <KindBadge kind={contract.kind} />
        <span className="ml-auto text-xs text-muted">
          {impacts.length} conflicting clause{impacts.length === 1 ? "" : "s"}
        </span>
      </header>
      <ul className="divide-y divide-line">
        {impacts.map((impact, i) => {
          const rule = rules.get(impact.ruleId);
          return (
            <li key={i} className="space-y-3 px-5 py-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <SeverityBadge severity={impact.risk} />
                <Badge tone="accent">Rule {impact.ruleId}</Badge>
                <ConfidenceLabel confidence={impact.confidence} />
                {rule?.effectiveDate && (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium">
                    <Icon name="clock" className="size-3.5" />
                    Amend by {formatDate(rule.effectiveDate)}
                  </span>
                )}
              </div>
              <QuoteBlock contract={contract} quote={impact.quote} label="Conflicting clause" />
              <p className="text-sm text-ink-soft">{impact.explanation}</p>
              <SuggestedWording label="Suggested amendment" text={impact.suggestedAmendment} />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function LawView() {
  const { lawText, setLawText, status, result, error, groups, scannedCount, scan } = useLawScan();
  const running = status === "loading";
  const rules = new Map(result?.rules.map((r) => [r.id, r]));

  return (
    <>
      <PageHeader eyebrow="Check 02" title="Law scanner">
        Paste the text of a new law or amendment. SignFlow extracts its rules, then checks every stored contract
        clause against them.
      </PageHeader>

      <AiKeyNotice />

      <Card className="mb-8 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Try a sample</span>
          {SAMPLE_LAWS.map((law) => (
            <button
              key={law.id}
              type="button"
              disabled={running}
              onClick={() => setLawText(law.text)}
              className="rounded-full border border-line bg-paper px-3 py-1 text-[13px] text-ink-soft transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
            >
              {law.title}
            </button>
          ))}
        </div>
        <textarea
          value={lawText}
          onChange={(e) => setLawText(e.target.value)}
          rows={9}
          disabled={running}
          aria-label="Law text"
          placeholder="Paste the law text here."
          className="w-full resize-y rounded-md border border-line bg-paper px-3 py-2.5 font-mono text-[13px] leading-relaxed placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="accent" onClick={() => scan({ force: result !== null })} disabled={running || lawText.trim().length < 40}>
            {running ? <Spinner /> : <Icon name={result ? "refresh" : "law"} />}
            {running ? "Scanning" : result ? "Scan again" : `Scan ${scannedCount} contracts`}
          </Button>
          <span className="text-xs text-muted">Your own terms template is not scanned, only signed contracts.</span>
        </div>
      </Card>

      {error && (
        <div className="mb-6">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {running && (
        <LoadingBlock
          title="Reading the law, then every contract"
          detail="Step 1 extracts the rules. Step 2 checks each clause against them and verifies the quotes. Usually 15 to 40 seconds."
        />
      )}

      {result && !running && (
        <div className="space-y-8">
          <Card className="p-5">
            <h2 className="font-display text-3xl leading-tight">{result.lawTitle}</h2>
            <p className="mt-1 text-sm text-muted">
              {result.rules.length} rule{result.rules.length === 1 ? "" : "s"} extracted. {groups.length} of{" "}
              {scannedCount} contracts affected, {result.impacts.length} clause
              {result.impacts.length === 1 ? "" : "s"} to amend.
            </p>
            <div className="mt-4">
              <ReviewNotice stats={result.stats} usage={result.usage} cached={result.cached} />
            </div>
          </Card>

          <section>
            <SectionTitle>Rules found in the law</SectionTitle>
            {result.rules.length === 0 ? (
              <EmptyState icon="law" title="No rules found">
                This text does not seem to create obligations. Check that you pasted the operative articles.
              </EmptyState>
            ) : (
              <Card>
                <ul className="divide-y divide-line">
                  {result.rules.map((rule) => (
                    <RuleCard key={rule.id} rule={rule} />
                  ))}
                </ul>
              </Card>
            )}
          </section>

          {result.rules.length > 0 && (
            <section>
              <SectionTitle>Affected contracts, highest risk first</SectionTitle>
              {groups.length === 0 ? (
                <EmptyState icon="check" title="No conflicts found">
                  None of the {scannedCount} contracts has a clause that breaches these rules.
                </EmptyState>
              ) : (
                <div className="space-y-3">
                  {groups.map((group) => (
                    <ImpactGroupCard key={group.contract.id} group={group} rules={rules} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {status === "idle" && !result && (
        <EmptyState icon="law" title="Nothing scanned yet">
          Choose a sample above or paste a law. The “no work after 9pm” sample hits both employee and partner
          contracts.
        </EmptyState>
      )}
    </>
  );
}
