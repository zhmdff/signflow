"use client";

import { cn, formatDate } from "@/lib/format";
import type { Reminder, ReminderStatus } from "@/lib/reminders";
import { useUiStore } from "@/stores/ui-store";
import { Badge, KindBadge } from "./ui/badge";
import { Icon } from "./ui/icons";

export const STATUS_STYLE: Record<ReminderStatus, { dot: string; text: string; label: string }> = {
  red: { dot: "bg-critical", text: "text-critical", label: "Act now" },
  amber: { dot: "bg-major", text: "text-major", label: "Coming up" },
  green: { dot: "bg-minor", text: "text-minor", label: "On track" },
  expired: { dot: "bg-muted", text: "text-muted", label: "Ended" },
};

const HORIZON_DAYS = 365;
const position = (days: number) => `${(Math.min(Math.max(days, 0), HORIZON_DAYS) / HORIZON_DAYS) * 100}%`;

/** Today on the left, twelve months out on the right. Diamond: notice deadline. Bar: end date. */
function Timeline({ reminder }: { reminder: Reminder }) {
  const { daysToEnd, daysToNotice, status } = reminder;
  return (
    <div className="relative mt-3 h-4" aria-hidden="true">
      <div className="absolute inset-x-0 top-1.5 h-1 rounded-full bg-line-soft" />
      <div
        className={cn("absolute top-1.5 left-0 h-1 rounded-full opacity-60", STATUS_STYLE[status].dot)}
        style={{ width: position(daysToEnd) }}
      />
      {daysToNotice !== null && daysToNotice >= 0 && (
        <div
          className={cn("absolute top-0.5 size-3 -translate-x-1/2 rotate-45 border-2 border-surface", STATUS_STYLE[status].dot)}
          style={{ left: position(daysToNotice) }}
        />
      )}
      <div className="absolute top-0 h-4 w-0.5 -translate-x-1/2 bg-ink" style={{ left: position(daysToEnd) }} />
    </div>
  );
}

export function ReminderRow({ reminder, timeline = false }: { reminder: Reminder; timeline?: boolean }) {
  const openViewer = useUiStore((s) => s.openViewer);
  const { contract, status, noticeDeadline, end, message } = reminder;
  const style = STATUS_STYLE[status];

  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-3 px-5 py-4">
      <span className={cn("mt-1.5 size-2.5 rounded-full", style.dot)} />
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openViewer(contract.id)}
              className="truncate text-left font-medium hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
            >
              {contract.counterparty}
            </button>
            <KindBadge kind={contract.kind} />
            {contract.fields.autoRenew && (
              <Badge tone="major">
                <Icon name="repeat" className="size-3" />
                Auto-renews
              </Badge>
            )}
          </div>
          {timeline && <div className="mt-0.5 truncate text-sm text-muted">{contract.title}</div>}
          <div className={cn("mt-1 text-sm font-medium", style.text)}>{message}</div>
        </div>
        {/* The short form, used in summaries, leaves the dates to the message. */}
        {timeline && (
          <dl className="grid shrink-0 grid-cols-2 gap-x-6 text-xs sm:text-right">
            <div>
              <dt className="text-muted">Notice by</dt>
              <dd className="font-mono text-[13px]">{noticeDeadline ? formatDate(noticeDeadline) : "n/a"}</dd>
            </div>
            <div>
              <dt className="text-muted">Ends</dt>
              <dd className="font-mono text-[13px]">{formatDate(end)}</dd>
            </div>
          </dl>
        )}
      </div>
      {timeline && status !== "expired" && (
        <div className="col-start-2">
          <Timeline reminder={reminder} />
        </div>
      )}
    </li>
  );
}
