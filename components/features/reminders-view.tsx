"use client";

import { PageHeader } from "@/components/page-header";
import { ReminderRow, STATUS_STYLE } from "@/components/reminder-row";
import { Card, SectionTitle, Stat } from "@/components/ui/card";
import { EmptyState, ErrorNote, LoadingBlock } from "@/components/ui/states";
import { useReminders } from "@/hooks/use-reminders";
import { cn, contractLabel, formatDate } from "@/lib/format";
import { useUiStore } from "@/stores/ui-store";

export function RemindersView() {
  const { today, reminders, openEnded, counts, loading, failed, error } = useReminders();
  const openViewer = useUiStore((s) => s.openViewer);

  return (
    <>
      <PageHeader eyebrow="Check 04" title="Expiry and renewal">
        The date that matters is the notice deadline, not the end date. It is the end date minus the notice period,
        worked out from each contract with no AI involved.
      </PageHeader>

      {failed ? (
        <ErrorNote>{error}</ErrorNote>
      ) : loading ? (
        <LoadingBlock title="Working out deadlines" />
      ) : (
        <>
          <Card className="mb-8 grid grid-cols-3 gap-px overflow-hidden bg-line">
            {(["red", "amber", "green"] as const).map((s) => (
              <Stat
                key={s}
                label={STATUS_STYLE[s].label}
                value={<span className={cn(counts[s] > 0 && STATUS_STYLE[s].text)}>{counts[s]}</span>}
                hint={s === "red" ? "30 days or less, or missed" : s === "amber" ? "31 to 90 days" : "More than 90 days"}
              />
            ))}
          </Card>

          <section className="mb-10">
            <SectionTitle
              aside={
                <span className="flex items-center gap-4 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rotate-45 bg-ink-soft" /> Notice deadline
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-0.5 bg-ink" /> End date
                  </span>
                </span>
              }
            >
              Most urgent first
            </SectionTitle>
            {reminders.length === 0 ? (
              <EmptyState icon="clock" title="No dated contracts">
                None of the stored contracts has an end date.
              </EmptyState>
            ) : (
              <Card>
                <div className="flex justify-between border-b border-line px-5 py-2 font-mono text-[11px] text-muted">
                  <span>Today, {formatDate(today)}</span>
                  <span>+12 months</span>
                </div>
                <ul className="divide-y divide-line">
                  {reminders.map((r) => (
                    <ReminderRow key={r.contract.id} reminder={r} timeline />
                  ))}
                </ul>
              </Card>
            )}
          </section>

          {openEnded.length > 0 && (
            <section>
              <SectionTitle>Open-ended, no deadline to track</SectionTitle>
              <Card>
                <ul className="divide-y divide-line">
                  {openEnded.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                      <button
                        type="button"
                        onClick={() => openViewer(c.id)}
                        className="font-medium hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        {contractLabel(c)}
                      </button>
                      <span className="text-muted">
                        {c.fields.noticeDays ? `${c.fields.noticeDays} days' notice to terminate` : "Notice period not stated"}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          )}
        </>
      )}
    </>
  );
}
