"use client";

import { useState } from "react";
import { AiKeyNotice } from "@/components/ai-key-notice";
import { QuoteBlock, SuggestedWording } from "@/components/citation";
import { PageHeader } from "@/components/page-header";
import { ReviewNotice } from "@/components/review-notice";
import { Badge, ConfidenceLabel, KindBadge, SeverityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible } from "@/components/ui/collapsible";
import { Icon } from "@/components/ui/icons";
import { EmptyState, ErrorNote, LoadingBlock, Spinner } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { useLawScan, type ImpactGroup } from "@/hooks/use-law-scan";
import { cn, formatDate } from "@/lib/format";
import { SAMPLE_LAWS } from "@/lib/samples";
import type { LawImpact, LawRule } from "@/lib/types";

function RuleRow({ rule }: { rule: LawRule }) {
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
        <p
          className={cn(
            "mt-3 border-l-2 pl-3 text-sm leading-relaxed text-ink-soft",
            rule.quoteVerified ? "border-ink/25" : "border-dashed border-major",
          )}
        >
          “{rule.quote}”
          {!rule.quoteVerified && (
            <span className="mt-0.5 block text-[11px] font-medium text-major">
              Not found in the law text. Check before relying on it.
            </span>
          )}
        </p>
      </div>
    </li>
  );
}

/** One clause can break several rules. It is shown once, with every rule it breaks. */
function byClause(impacts: LawImpact[]): { impact: LawImpact; ruleIds: string[] }[] {
  const merged = new Map<string, { impact: LawImpact; ruleIds: string[] }>();
  for (const impact of impacts) {
    const entry = merged.get(impact.quote.clauseId);
    if (entry) {
      if (!entry.ruleIds.includes(impact.ruleId)) entry.ruleIds.push(impact.ruleId);
    } else {
      // Impacts arrive worst first, so the first one seen for a clause carries its highest risk.
      merged.set(impact.quote.clauseId, { impact, ruleIds: [impact.ruleId] });
    }
  }
  return [...merged.values()];
}

function AffectedContract({
  group,
  rules,
  defaultOpen,
}: {
  group: ImpactGroup;
  rules: Map<string, LawRule>;
  defaultOpen: boolean;
}) {
  const { contract } = group;
  const clauses = byClause(group.impacts);

  return (
    <Collapsible
      defaultOpen={defaultOpen}
      summary={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <SeverityBadge severity={group.impacts[0].risk} />
          <span className="font-semibold">{contract.counterparty}</span>
          <KindBadge kind={contract.kind} />
          <span className="text-sm text-muted">
            {clauses.length} clause{clauses.length === 1 ? "" : "s"} to amend
          </span>
        </div>
      }
    >
      <ul className="-my-5 divide-y divide-line">
        {clauses.map(({ impact, ruleIds }) => {
          const deadline = ruleIds.map((id) => rules.get(id)?.effectiveDate).find(Boolean);
          return (
            <li key={impact.quote.clauseId} className="space-y-3 py-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {ruleIds.map((id) => (
                  <Badge key={id} tone="accent">
                    Rule {id}
                  </Badge>
                ))}
                <ConfidenceLabel confidence={impact.confidence} />
                {deadline && (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium">
                    <Icon name="clock" className="size-3.5" />
                    Amend by {formatDate(deadline)}
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
    </Collapsible>
  );
}

type View = "scan" | "history";
type ResultTab = "affected" | "rules";

export function LawView() {
  const { lawText, setLawText, status, result, error, groups, scannedCount, scan, history, open, removeScan } =
    useLawScan();
  const [view, setView] = useState<View>("scan");
  const [tab, setTab] = useState<ResultTab>("affected");
  const running = status === "loading";
  const rules = new Map(result?.rules.map((r) => [r.id, r]));

  return (
    <>
      <PageHeader title="Law scanner">
        Paste a new law or amendment. SignFlow works out its rules, then checks every contract against them.
      </PageHeader>

      <AiKeyNotice />

      <Tabs
        label="Law scanner views"
        className="mb-6"
        value={view}
        onChange={setView}
        items={[
          { value: "scan", label: "Scan" },
          { value: "history", label: "Previous scans", count: history.length },
        ]}
      />

      {view === "history" &&
        (history.length === 0 ? (
          <EmptyState icon="clock" title="No scans yet">
            Every scan is saved here so you can reopen it without running it again.
          </EmptyState>
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {history.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      void open(item.id);
                      setView("scan");
                      setTab("affected");
                    }}
                    className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span className="block truncate font-medium hover:text-accent">{item.title}</span>
                    <span className="block text-xs text-muted">
                      {formatDate(item.at.slice(0, 10))} · {item.rules} rules · {item.impacts} clauses to amend
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeScan(item.id)}
                    aria-label={`Delete scan: ${item.title}`}
                    className="rounded-md p-1.5 text-muted hover:bg-critical-soft hover:text-critical focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <Icon name="trash" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))}

      {view === "scan" && (
        <>
          {result && !running ? (
            // Once there is a result, the input steps aside for it.
            <Card className="mb-6 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="heading text-xl leading-tight">{result.lawTitle}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {result.rules.length} rule{result.rules.length === 1 ? "" : "s"} found. {groups.length} of{" "}
                    {scannedCount} contracts affected.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => scan({ force: true })}>
                    <Icon name="refresh" />
                    Scan again
                  </Button>
                  <Button variant="secondary" onClick={() => setLawText("")}>
                    <Icon name="plus" />
                    New scan
                  </Button>
                </div>
              </div>
              <div className="mt-4">
                <ReviewNotice stats={result.stats} usage={result.usage} cached={result.cached} />
              </div>
            </Card>
          ) : (
            <Card className="mb-6 p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted">Try a sample:</span>
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
                className="w-full resize-y rounded-lg border border-line bg-paper px-3 py-2.5 font-mono text-[13px] leading-relaxed placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button onClick={() => scan()} disabled={running || lawText.trim().length < 40}>
                  {running ? <Spinner /> : <Icon name="law" />}
                  {running ? "Scanning" : `Scan ${scannedCount} contracts`}
                </Button>
                <span className="text-xs text-muted">Your own terms are not scanned, only signed contracts.</span>
              </div>
            </Card>
          )}

          {error && (
            <div className="mb-6">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          {running && (
            <LoadingBlock
              title="Reading the law, then every contract"
              detail="Step 1 works out the rules. Step 2 checks each contract and verifies the quotes. Usually 15 to 40 seconds."
            />
          )}

          {result && !running && (
            <>
              <Tabs
                label="Result sections"
                variant="underline"
                className="mb-5"
                value={tab}
                onChange={setTab}
                items={[
                  { value: "affected", label: "Affected contracts", count: groups.length },
                  { value: "rules", label: "Rules in the law", count: result.rules.length },
                ]}
              />

              {tab === "affected" &&
                (groups.length === 0 ? (
                  <EmptyState icon="check" title="No conflicts found">
                    None of the {scannedCount} contracts has a clause that breaks these rules.
                  </EmptyState>
                ) : (
                  <div className="space-y-3">
                    {groups.map((group, i) => (
                      <AffectedContract key={group.contract.id} group={group} rules={rules} defaultOpen={i === 0} />
                    ))}
                  </div>
                ))}

              {tab === "rules" &&
                (result.rules.length === 0 ? (
                  <EmptyState icon="law" title="No rules found">
                    This text does not seem to create obligations. Check that you pasted the operative articles.
                  </EmptyState>
                ) : (
                  <Card>
                    <ul className="divide-y divide-line">
                      {result.rules.map((rule) => (
                        <RuleRow key={rule.id} rule={rule} />
                      ))}
                    </ul>
                  </Card>
                ))}
            </>
          )}
        </>
      )}
    </>
  );
}
