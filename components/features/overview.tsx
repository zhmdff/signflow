"use client";

import Link from "next/link";
import { AiKeyNotice } from "@/components/ai-key-notice";
import { PageHeader } from "@/components/page-header";
import { ReminderRow } from "@/components/reminder-row";
import { buttonClass } from "@/components/ui/button";
import { Card, SectionTitle, Stat } from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";
import { ErrorNote } from "@/components/ui/states";
import { useContracts } from "@/hooks/use-contracts";
import { useReminders } from "@/hooks/use-reminders";
import { FEATURES } from "@/lib/nav";

const moreLink = "text-sm font-medium text-accent hover:underline";

/** The landing view of the dashboard: what needs attention, and where to start. Details live on their own pages. */
export function Overview() {
  const { contracts, partners, employees, ownTerms, loading, status, error } = useContracts();
  const { reminders, counts } = useReminders();

  const urgent = reminders.filter((r) => r.status === "red" || r.status === "amber").slice(0, 4);
  const dash = (value: number) => (loading ? "–" : value);

  return (
    <>
      <PageHeader
        title="Overview"
        actions={
          <Link href="/dashboard/contracts" className={buttonClass("primary")}>
            <Icon name="file" />
            Go to contracts
          </Link>
        }
      >
        What needs your attention, and where to start.
      </PageHeader>

      <AiKeyNotice />

      {status === "error" && (
        <div className="mb-6">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {/* The 1px gaps show the line colour through, drawing the dividers at any column count. */}
      <Card className="mb-10 grid grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-4">
        <Stat
          label="Act now"
          value={<span className={counts.red > 0 ? "text-critical" : undefined}>{dash(counts.red)}</span>}
          hint="Deadlines within 30 days"
        />
        <Stat
          label="Coming up"
          value={<span className={counts.amber > 0 ? "text-major" : undefined}>{dash(counts.amber)}</span>}
          hint="Within 90 days"
        />
        <Stat label="Contracts" value={dash(contracts.length)} hint={`${partners.length} partner, ${employees.length} employee`} />
        <Stat label="Our rules" value={dash(ownTerms?.clauses.length ?? 0)} hint={ownTerms ? "In our terms" : "Not set up yet"} />
      </Card>

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section className="min-w-0">
          <SectionTitle
            aside={
              <Link href="/dashboard/reminders" className={moreLink}>
                All reminders
              </Link>
            }
          >
            Needs attention
          </SectionTitle>
          <Card>
            {urgent.length > 0 ? (
              <ul className="divide-y divide-line">
                {urgent.map((r) => (
                  <ReminderRow key={r.contract.id} reminder={r} />
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-muted">
                {loading ? "Loading deadlines" : "No deadlines in the next 90 days."}
              </p>
            )}
          </Card>
        </section>

        <section className="min-w-0">
          <SectionTitle>Run a check</SectionTitle>
          <Card>
            <ul className="divide-y divide-line">
              {FEATURES.map((feature) => (
                <li key={feature.href}>
                  <Link
                    href={feature.href}
                    className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                      <Icon name={feature.icon} className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{feature.title}</span>
                      <span className="block truncate text-sm text-muted">{feature.short}</span>
                    </span>
                    <Icon name="arrow" className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>
    </>
  );
}
