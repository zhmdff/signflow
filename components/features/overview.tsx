"use client";

import Link from "next/link";
import { AiKeyNotice } from "@/components/ai-key-notice";
import { PageHeader } from "@/components/page-header";
import { ReminderRow } from "@/components/reminder-row";
import { KindBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, SectionTitle, Stat } from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";
import { ErrorNote } from "@/components/ui/states";
import { useContractActions } from "@/hooks/use-contract-actions";
import { useContracts } from "@/hooks/use-contracts";
import { useReminders } from "@/hooks/use-reminders";
import { FEATURES } from "@/lib/nav";

export function Overview() {
  const { contracts, partners, employees, ownTerms, loading, status, error } = useContracts();
  const { reminders, counts } = useReminders();
  const { view } = useContractActions();

  const clauseCount = contracts.reduce((n, c) => n + c.clauses.length, 0);
  const urgent = reminders.filter((r) => r.status === "red" || r.status === "amber").slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Overview"
        actions={
          <Link href="/dashboard/contracts" className={buttonClass("primary")}>
            <Icon name="upload" />
            Add a contract
          </Link>
        }
      >
        Every contract is stored as clauses with ids. The four checks below all read from this one library and cite
        it.
      </PageHeader>

      <AiKeyNotice />

      {status === "error" && (
        <div className="mb-6">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {/* The 1px gaps show the line colour through, drawing the dividers at any column count. */}
      <Card className="mb-8 grid grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-4">
        <Stat label="Contracts" value={loading ? "–" : contracts.length} hint={`${partners.length} partner, ${employees.length} employee`} />
        <Stat label="Clauses indexed" value={loading ? "–" : clauseCount} hint="Each one citable" />
        <Stat
          label="Act now"
          value={<span className={counts.red > 0 ? "text-critical" : undefined}>{loading ? "–" : counts.red}</span>}
          hint="Deadlines within 30 days"
        />
        <Stat label="Our terms" value={loading ? "–" : ownTerms ? ownTerms.clauses.length : 0} hint={ownTerms ? "Rules in the playbook" : "Not uploaded yet"} />
      </Card>

      <section className="mb-10">
        <SectionTitle>Checks</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map((feature, i) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group rounded-lg border border-line bg-surface p-5 transition-colors hover:border-ink/40 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted">0{i + 1}</span>
                <Icon name="arrow" className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </div>
              <div className="mt-3 flex items-center gap-2 font-display text-2xl">
                <Icon name={feature.icon} className="size-5 text-accent" />
                {feature.title}
              </div>
              <p className="mt-1 text-sm text-muted">{feature.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {urgent.length > 0 && (
        <section className="mb-10">
          <SectionTitle
            aside={
              <Link href="/dashboard/reminders" className="text-xs font-medium text-accent hover:underline">
                All reminders
              </Link>
            }
          >
            Next deadlines
          </SectionTitle>
          <Card>
            <ul className="divide-y divide-line">
              {urgent.map((r) => (
                <ReminderRow key={r.contract.id} reminder={r} />
              ))}
            </ul>
          </Card>
        </section>
      )}

      {contracts.length > 0 && (
        <section>
          <SectionTitle
            aside={
              <Link href="/dashboard/contracts" className="text-xs font-medium text-accent hover:underline">
                Manage contracts
              </Link>
            }
          >
            Contracts
          </SectionTitle>
          <Card>
            <ul className="divide-y divide-line">
              {contracts.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-2.5">
                  <button
                    type="button"
                    onClick={() => view(c.id)}
                    className="min-w-0 truncate text-left text-sm font-medium hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {c.counterparty}
                  </button>
                  <KindBadge kind={c.kind} />
                  <span className="ml-auto hidden truncate text-sm text-muted sm:block">{c.title}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </>
  );
}
