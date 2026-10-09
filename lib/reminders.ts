import type { Contract } from "@/lib/types";

export type ReminderStatus = "red" | "amber" | "green" | "expired";

export type Reminder = {
  contract: Contract;
  end: string;
  /** Last day to give notice: end date minus the notice period. Null if no notice period is known. */
  noticeDeadline: string | null;
  daysToEnd: number;
  daysToNotice: number | null;
  status: ReminderStatus;
  /** What the reader should do, or know, right now. */
  message: string;
};

const DAY = 86_400_000;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export const daysBetween = (from: string, to: string) => Math.round((utc(to) - utc(from)) / DAY);

export function addDays(iso: string, days: number): string {
  return new Date(utc(iso) + days * DAY).toISOString().slice(0, 10);
}

const RED_DAYS = 30;
const AMBER_DAYS = 90;

const plural = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

/** No AI here: deadlines come straight from the fields extracted at ingest. */
export function buildReminder(contract: Contract, today: string): Reminder | null {
  const { end, noticeDays, autoRenew } = contract.fields;
  if (!end) return null;

  const noticeDeadline = noticeDays ? addDays(end, -noticeDays) : null;
  const daysToEnd = daysBetween(today, end);
  const daysToNotice = noticeDeadline ? daysBetween(today, noticeDeadline) : null;

  let status: ReminderStatus;
  let message: string;

  if (daysToEnd < 0) {
    status = "expired";
    message = autoRenew
      ? `Renewed automatically ${plural(-daysToEnd)} ago. Check the new end date.`
      : `Ended ${plural(-daysToEnd)} ago.`;
  } else if (daysToNotice !== null && daysToNotice < 0) {
    // The window to act has closed, which is the worst case for an auto-renewing contract.
    status = "red";
    message = autoRenew
      ? `Notice deadline passed ${plural(-daysToNotice)} ago. Renews automatically in ${plural(daysToEnd)}.`
      : `Notice deadline passed. Ends in ${plural(daysToEnd)}: renew or replace now.`;
  } else {
    const daysToAct = daysToNotice ?? daysToEnd;
    status = daysToAct <= RED_DAYS ? "red" : daysToAct <= AMBER_DAYS ? "amber" : "green";
    if (daysToNotice === null) message = `Ends in ${plural(daysToEnd)}.`;
    else if (autoRenew) message = `Give notice within ${plural(daysToNotice)} or it renews automatically.`;
    else message = `Decide within ${plural(daysToNotice)}: the notice deadline comes before the end date.`;
  }

  return { contract, end, noticeDeadline, daysToEnd, daysToNotice, status, message };
}

const STATUS_ORDER: Record<ReminderStatus, number> = { red: 0, amber: 1, green: 2, expired: 3 };

export function buildReminders(contracts: Contract[], today: string): Reminder[] {
  return contracts
    .map((c) => buildReminder(c, today))
    .filter((r): r is Reminder => r !== null)
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        (a.daysToNotice ?? a.daysToEnd) - (b.daysToNotice ?? b.daysToEnd),
    );
}
