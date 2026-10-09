import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 font-mono text-[11px] tracking-[0.14em] text-accent uppercase">{eyebrow}</div>
        )}
        <h1 className="heading text-3xl leading-tight sm:text-4xl">{title}</h1>
        {children && <p className="mt-2 max-w-2xl text-[15px] text-muted">{children}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
