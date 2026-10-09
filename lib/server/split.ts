import type { Clause } from "@/lib/types";

// "5.3 The Company shall..." or "5.3. The Company shall..."
const SUB = /^\s*(\d{1,2}(?:\.\d{1,2})+)\.?\s+(\S.*)$/;
// "5. FEES" or "Article 5. Fees" or "Clause 5: Fees". Bare "5 Fees" is not accepted: too many false matches.
const TOP = /^\s*(?:(?:clause|article|section)\s+(\d{1,2})[.):]?|(\d{1,2})[.)])\s+(\S.*)$/i;
// Where the clauses stop and signatures or attachments begin.
const END = /^\s*(signed\b|in witness\b|signature|schedule\s+\d|annex\s+\d|appendix\s+\d)/i;
// "Payment. The Company shall pay..." : a short heading run into the clause text.
const INLINE_HEADING = /^([A-Z][^.]{2,60})\.\s+(\S.*)$/;

const MIN_CLAUSES = 3;
const MIN_COVERAGE = 0.5;
const MAX_CLAUSE_CHARS = 8000;

const tidy = (text: string) => text.replace(/\s+/g, " ").trim();

/** A line that names a section, as opposed to one that states a rule. */
function isHeading(text: string): boolean {
  const t = text.trim();
  return t.length <= 80 && !/[.;:]$/.test(t) && t.split(/\s+/).length <= 10;
}

/** "FEES, INVOICING AND PAYMENT" reads better as "Fees, invoicing and payment". */
function sentenceCase(heading: string): string {
  const t = tidy(heading);
  return t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t;
}

/**
 * Splits a contract with numbered clauses into clauses, in code, with no model
 * call. Returns null when the numbering is not clear enough to trust, so the
 * caller can fall back to the model.
 */
export function splitClauses(document: string): Clause[] | null {
  const lines = document.replace(/\r\n?/g, "\n").split("\n");
  const clauses: (Clause & { body: string[] })[] = [];
  let section = { number: 0, heading: "" };
  let bodyChars = 0;

  for (const line of lines) {
    if (clauses.length >= MIN_CLAUSES && END.test(line)) break;
    bodyChars += line.trim().length;

    const sub = SUB.exec(line);
    // Before any section heading is seen, accept any numbering; after, it must belong to the section.
    if (sub && (section.number === 0 || parseInt(sub[1], 10) === section.number)) {
      clauses.push({ id: sub[1], heading: section.heading, text: "", body: [sub[2]] });
      continue;
    }

    const top = TOP.exec(line);
    const number = top ? parseInt(top[1] ?? top[2], 10) : NaN;
    // Sections must count up by one. This is what stops "14 Babek Avenue" being read as clause 14.
    if (top && number === section.number + 1) {
      const rest = top[3];
      if (isHeading(rest)) {
        section = { number, heading: sentenceCase(rest) };
        // Holds any text that sits directly under the heading; dropped later if there is none.
        clauses.push({ id: String(number), heading: section.heading, text: "", body: [] });
      } else {
        const inline = INLINE_HEADING.exec(rest);
        section = { number, heading: inline ? inline[1] : "" };
        clauses.push({ id: String(number), heading: section.heading, text: "", body: [inline ? inline[2] : rest] });
      }
      continue;
    }

    if (clauses.length > 0 && line.trim()) clauses[clauses.length - 1].body.push(line);
  }

  const result: Clause[] = clauses
    .map(({ id, heading, body }) => ({ id, heading, text: tidy(body.join(" ")) }))
    .filter((c) => c.text.length > 0);

  const covered = result.reduce((n, c) => n + c.text.length, 0);
  const ids = new Set(result.map((c) => c.id));
  const trustworthy =
    result.length >= MIN_CLAUSES &&
    ids.size === result.length &&
    covered >= bodyChars * MIN_COVERAGE &&
    result.every((c) => c.text.length <= MAX_CLAUSE_CHARS);

  return trustworthy ? result : null;
}
