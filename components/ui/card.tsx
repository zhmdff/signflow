import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/format";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-line bg-surface", className)} {...props} />;
}

/** Small-caps label that opens a section, with an optional control on the right. */
export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{children}</h2>
      {aside}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0 bg-surface px-5 py-4">
      <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{label}</div>
      <div className="mt-1 heading text-3xl leading-none tabular-nums">{value}</div>
      {hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}
