import type { ReactNode } from "react";
import { cn, KIND_LABEL } from "@/lib/format";
import type { Confidence, ContractKind, Severity } from "@/lib/types";

export type Tone = "neutral" | "accent" | "critical" | "major" | "minor";

const TONES: Record<Tone, string> = {
  neutral: "bg-line-soft text-ink-soft",
  accent: "bg-accent-soft text-accent",
  critical: "bg-critical-soft text-critical",
  major: "bg-major-soft text-major",
  minor: "bg-minor-soft text-minor",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap uppercase",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge tone={severity}>{severity}</Badge>;
}

export function ConfidenceLabel({ confidence }: { confidence: Confidence }) {
  return <span className="text-xs text-muted">{confidence} confidence</span>;
}

const KIND_TONE: Record<ContractKind, Tone> = { own_terms: "accent", partner: "neutral", employee: "neutral" };

export function KindBadge({ kind }: { kind: ContractKind }) {
  return <Badge tone={KIND_TONE[kind]}>{KIND_LABEL[kind]}</Badge>;
}
