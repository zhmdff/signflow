import { cn, contractLabel } from "@/lib/format";
import type { Contract } from "@/lib/types";

export function ContractSelect({
  id,
  label,
  contracts,
  value,
  onChange,
  allLabel,
  disabled,
  compact = false,
}: {
  id: string;
  label: string;
  contracts: Contract[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** When set, adds a first option that selects no single contract. */
  allLabel?: string;
  disabled?: boolean;
  /** Hide the visible label and use a smaller control, for toolbars. */
  compact?: boolean;
}) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-1">
      <span className={compact ? "sr-only" : "text-[11px] font-semibold tracking-[0.14em] text-muted uppercase"}>
        {label}
      </span>
      <select
        id={id}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(
          "min-w-0 rounded-md border border-line bg-surface text-ink focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50",
          compact ? "h-8 px-2 text-[13px]" : "h-10 px-3 text-sm",
        )}
      >
        {allLabel && <option value="">{allLabel}</option>}
        {contracts.map((c) => (
          <option key={c.id} value={c.id}>
            {contractLabel(c)} ({c.title})
          </option>
        ))}
      </select>
    </label>
  );
}
