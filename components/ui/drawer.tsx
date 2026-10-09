"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./icons";

/**
 * A panel that slides in from the right over the page. Used for things the
 * user dips into and out of without losing their place: reading a contract,
 * adding one.
 */
export function Drawer({
  open,
  onClose,
  label,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  /** Names the panel for screen readers. */
  label: string;
  children: ReactNode;
  /** Pinned to the bottom, for the panel's main actions. */
  footer?: ReactNode;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    closeButton.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="Close panel" onClick={onClose} className="absolute inset-0 bg-ink/30" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="animate-drawer-in relative flex h-full w-full max-w-xl flex-col border-l border-line bg-surface shadow-2xl"
      >
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 rounded-md p-1.5 text-muted hover:bg-line-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Icon name="close" className="size-5" />
        </button>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <footer className="flex flex-wrap gap-2 border-t border-line px-6 py-4">{footer}</footer>}
      </aside>
    </div>
  );
}
