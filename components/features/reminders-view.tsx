"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ReminderRow, STATUS_STYLE } from "@/components/reminder-row";
import { Card, SectionTitle } from "@/components/ui/card";
import { EmptyState, ErrorNote, LoadingBlock } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { useReminders } from "@/hooks/use-reminders";
import { contractLabel, formatDate } from "@/lib/format";
import { useUiStore } from "@/stores/ui-store";

type Filter = "all" | "red" | "amber" | "green";

export function RemindersView() {
  const { today, reminders, openEnded, counts, loading, failed, error } = useReminders();
  const openViewer = useUiStore((s) => s.openViewer);
  const [filter, setFilter] = useState<Filter>("all");

  const shown = filter === "all" ? reminders : reminders.filter((r) => r.status === filter);

  return (
    <>
      <PageHeader title="Expiry and renewal">
        The date that matters is the last day to give notice, not the day the contract ends. Most urgent first.
      </PageHeader>

      {failed ? (
        <ErrorNote>{error}</ErrorNote>
      ) : loading ? (
        <LoadingBlock title="Working out deadlines" />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Tabs
              label="Filter by urgency"
              value={filter}
              onChange={setFilter}
              items={[
                { value: "all", label: "All", count: reminders.length },
                { value: "red", label: STATUS_STYLE.red.label, count: counts.red },
                { value: "amber", label: STATUS_STYLE.amber.label, count: counts.amber },
                { value: "green", label: STATUS_STYLE.green.label, count: counts.green },
              ]}
            />
            <span className="flex items-center gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rotate-45 bg-ink-soft" /> Notice deadline
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-0.5 bg-ink" /> End date
              </span>
            </span>
          </div>

          {shown.length === 0 ? (
            <EmptyState icon="clock" title={reminders.length === 0 ? "No dated contracts" : "Nothing here"}>
              {reminders.length === 0
                ? "None of the stored contracts has an end date."
                : "No contracts have this status right now."}
            </EmptyState>
          ) : (
            <Card className="mb-10">
              <div className="flex justify-between border-b border-line px-5 py-2 text-xs text-muted">
                <span>Today, {formatDate(today)}</span>
                <span>12 months from now</span>
              </div>
              <ul className="divide-y divide-line">
                {shown.map((r) => (
                  <ReminderRow key={r.contract.id} reminder={r} timeline />
                ))}
              </ul>
            </Card>
          )}

          {filter === "all" && openEnded.length > 0 && (
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
