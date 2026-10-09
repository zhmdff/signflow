import type { Clause } from "@/lib/types";

export type TermsInput = { title: string; counterparty: string; clauses: Clause[] };

/**
 * One entry per clause: what is wrong with it, or null. Used by the editor to
 * mark fields and by the API to reject bad saves, so both apply the same rules.
 */
export function clauseProblems(clauses: Clause[]): (string | null)[] {
  const seen = new Map<string, number>();
  for (const c of clauses) {
    const id = c.id.trim();
    if (id) seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  return clauses.map((c) => {
    const id = c.id.trim();
    if (!id) return "Give this rule a number.";
    if ((seen.get(id) ?? 0) > 1) return `Number ${id} is used more than once.`;
    if (!c.text.trim()) return "Write the rule text.";
    return null;
  });
}

/** Suggests the number for a new rule: one section after the highest existing one. */
export function nextClauseId(clauses: Clause[]): string {
  const sections = clauses.map((c) => parseInt(c.id, 10)).filter((n) => !Number.isNaN(n));
  const next = sections.length > 0 ? Math.max(...sections) + 1 : clauses.length + 1;
  return clauses.some((c) => c.id.includes(".")) || clauses.length === 0 ? `${next}.1` : String(next);
}
