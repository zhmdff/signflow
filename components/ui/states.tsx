import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { Icon, type IconName } from "./icons";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent",
        className,
      )}
    />
  );
}

/** Shown while an AI call runs: says what is happening, since calls take several seconds. */
export function LoadingBlock({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-line bg-surface px-5 py-6">
      <Spinner className="mt-0.5 text-accent" />
      <div>
        <div className="text-sm font-medium">{title}</div>
        {detail && <div className="mt-0.5 text-sm text-muted">{detail}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon = "file",
  title,
  children,
  action,
}: {
  icon?: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <Icon name={icon} className="mx-auto size-6 text-muted" />
      <div className="mt-3 heading text-lg">{title}</div>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-critical/30 bg-critical-soft px-4 py-3 text-sm text-critical"
    >
      <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1 break-words">{children}</div>
      {action}
    </div>
  );
}
