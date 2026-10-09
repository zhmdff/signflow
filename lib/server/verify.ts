import type { CitationStats, Contract, Quote } from "@/lib/types";

/** Ignore differences that do not change meaning: case, whitespace, quote and dash styles. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True when `excerpt` appears in `source`. An excerpt abridged with "..." counts
 * when every part appears, in order.
 */
export function appearsIn(source: string, excerpt: string): boolean {
  const haystack = normalize(source);
  const parts = normalize(excerpt)
    .replace(/^["']+|["']+$/g, "")
    .split("...")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0 || parts.join("").length < 8) return false;
  let from = 0;
  for (const part of parts) {
    const at = haystack.indexOf(part, from);
    if (at === -1) return false;
    from = at + part.length;
  }
  return true;
}

/**
 * Checks a model-supplied quote against the contract it claims to come from.
 * A quote found under a different clause keeps its text and gets the right id.
 */
export function verifyQuote(
  contract: Contract,
  raw: { clauseId: string; text: string } | null | undefined,
): Quote | null {
  if (!raw || !raw.text?.trim()) return null;
  // Models sometimes copy the id with the brackets it is shown in: "[3.2]".
  const clauseId = (raw.clauseId ?? "").trim().replace(/^\[|\]$/g, "");
  const cited = contract.clauses.find((c) => c.id === clauseId);
  if (cited && appearsIn(cited.text, raw.text)) {
    return { clauseId, text: raw.text, status: "exact" };
  }
  const actual = contract.clauses.find((c) => appearsIn(c.text, raw.text));
  if (actual) return { clauseId: actual.id, text: raw.text, status: "moved" };
  return { clauseId, text: raw.text, status: "unverified" };
}

export function citationStats(quotes: (Quote | null)[]): CitationStats {
  const present = quotes.filter((q): q is Quote => q !== null);
  return {
    quotes: present.length,
    verified: present.filter((q) => q.status !== "unverified").length,
  };
}
