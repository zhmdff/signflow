"use client";

import { PageHeader } from "@/components/page-header";
import { Card, SectionTitle, Stat } from "@/components/ui/card";
import { EmptyState, LoadingBlock } from "@/components/ui/states";
import { useUsage } from "@/hooks/use-usage";

const STEP_LABEL: Record<string, string> = {
  ingest: "Add a contract",
  compare: "Compare with our terms",
  law_rules: "Law scan: read the law",
  law_impacts: "Law scan: check contracts",
  ask: "Ask a question",
};

const n = (value: number) => value.toLocaleString("en");

export function UsageView() {
  const usage = useUsage();

  return (
    <>
      <PageHeader title="AI usage">
        What the AI has read and written so far, and how much the cache has saved. Tokens are the unit AI providers
        charge by: roughly four characters of text each.
      </PageHeader>

      {!usage ? (
        <LoadingBlock title="Loading usage" />
      ) : usage.total.calls + usage.total.cacheHits === 0 ? (
        <EmptyState icon="chart" title="Nothing used yet">
          Run a comparison, a law scan or a question and the cost will show up here.
        </EmptyState>
      ) : (
        <>
          <Card className="mb-8 grid grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-4">
            <Stat label="Tokens used" value={n(usage.total.promptTokens + usage.total.outputTokens)} hint={`${n(usage.total.outputTokens)} of them written`} />
            <Stat label="AI calls" value={n(usage.total.calls)} />
            <Stat label="Served from cache" value={n(usage.total.cacheHits)} hint="Requests that cost nothing" />
            <Stat label="Tokens saved" value={<span className="text-minor">{n(usage.total.tokensSaved)}</span>} hint="By the cache" />
          </Card>

          <SectionTitle>By step</SectionTitle>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">Step</th>
                  <th className="px-3 py-3 text-right font-medium">AI calls</th>
                  <th className="px-3 py-3 text-right font-medium">Tokens per call</th>
                  <th className="px-3 py-3 text-right font-medium">From cache</th>
                  <th className="px-5 py-3 text-right font-medium">Tokens saved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {usage.byFeature.map((row) => (
                  <tr key={row.feature}>
                    <td className="px-5 py-3 font-medium">{STEP_LABEL[row.feature] ?? row.feature}</td>
                    <td className="px-3 py-3 text-right font-mono text-[13px]">{n(row.calls)}</td>
                    <td className="px-3 py-3 text-right font-mono text-[13px]">
                      {row.calls > 0 ? n(Math.round((row.promptTokens + row.outputTokens) / row.calls)) : "–"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[13px]">{n(row.cacheHits)}</td>
                    <td className="px-5 py-3 text-right font-mono text-[13px]">{n(row.tokensSaved)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
