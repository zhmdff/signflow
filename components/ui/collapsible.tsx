"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/format";
import { Icon } from "./icons";

/**
 * A card that shows a one-line summary and opens to show the rest. Used
 * wherever a list of results would otherwise show every detail at once.
 */
export function Collapsible({
  summary,
  children,
  defaultOpen = false,
  open: controlled,
  onToggle,
  className,
}: {
  /** Always visible. Should let the reader decide whether to open it. */
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Set together with onToggle to control it from outside. */
  open?: boolean;
  onToggle?: (open: boolean) => void;
  className?: string;
}) {
  const [own, setOwn] = useState(defaultOpen);
  const open = controlled ?? own;
  const panel = useId();

  function toggle() {
    setOwn(!open);
    onToggle?.(!open);
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-line bg-surface shadow-xs", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panel}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <div className="min-w-0 flex-1">{summary}</div>
        <Icon name="chevron" className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div id={panel} className="animate-rise-in border-t border-line px-5 py-5">
          {children}
        </div>
      )}
    </div>
  );
}
