import { cn } from "@/lib/format";

export type TabItem<T extends string> = { value: T; label: string; count?: number };

/**
 * A row of mutually exclusive views. "pills" is for filters and small switches,
 * "underline" for the main sections of a result.
 */
export function Tabs<T extends string>({
  label,
  items,
  value,
  onChange,
  variant = "pills",
  className,
}: {
  /** What the tabs choose between, for screen readers. */
  label: string;
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: "pills" | "underline";
  className?: string;
}) {
  const pills = variant === "pills";
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        pills ? "inline-flex flex-wrap rounded-lg bg-line-soft p-1" : "flex gap-6 border-b border-line",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent",
              pills
                ? cn("rounded-md px-3 py-1.5", active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")
                : cn(
                    "-mb-px border-b-2 pb-2.5",
                    active ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink",
                  ),
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 font-mono text-[11px] leading-5",
                  active && !pills ? "bg-accent-soft text-accent" : "bg-line-soft text-muted",
                  pills && "bg-transparent px-0",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
