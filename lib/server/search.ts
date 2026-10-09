import type { Contract } from "@/lib/types";
import { db } from "./db";

/** The most clauses a question is answered from, unless per-contract picks need more. */
const MAX_CLAUSES = 16;
/** Each contract with a match contributes at least this many of its best clauses. */
const PER_CONTRACT = 2;
/** Fewer matches than this means the search probably missed, so everything in scope is sent. */
const MIN_HITS = 3;

const STOPWORDS = new Set(
  `a an and are about after all also any been before but can could did does for from had has have her hers him his
   how into its just may more most much must not our out over she should some than that the their them then there
   these they this those under was were what when where which while who will with would you your say says said
   contract contracts agreement clause tell know need want get`.split(/\s+/),
);

/**
 * Everyday words mapped to the words contracts use. Stemming handles "renews"
 * and "renewal"; it cannot know that "flu" is about sick leave.
 */
const SYNONYMS: [RegExp, string[]][] = [
  [/^(flu|ill|illness|sick|sickness|unwell|doctor|hospital)$/, ["sick", "sickness", "medical", "certificate", "absence"]],
  [/^(fire|fired|dismiss|dismissed|quit|resign|resigns|leaving|exit|cancel|end|ending)$/, ["terminate", "termination", "notice"]],
  [/^(holiday|holidays|vacation|pto)$/, ["leave", "annual"]],
  [/^(salary|wage|wages|paid|pay|bonus|raise)$/, ["salary", "pay", "paid", "payment", "allowance"]],
  [/^(remote|remotely|home|wfh|office|location)$/, ["remote", "home", "location", "place", "employed"]],
  [/^(overtime|hours|shift|shifts|night|evening|weekend)$/, ["hours", "shift", "overtime", "night", "work"]],
  [/^(renew|renews|renewal|expire|expires|expiry|rollover|auto|automatically)$/, ["renew", "renewal", "term", "notice", "automatically", "rolls", "extend", "successive"]],
  [/^(late|penalty|penalties|fine|interest|overdue)$/, ["penalty", "late", "overdue", "interest", "fee"]],
  [/^(liable|liability|damages|sue|cap|capped)$/, ["liability", "liable", "indemnify", "losses", "exceed"]],
  [/^(subcontract|subcontractor|subcontractors|outsource|freelancer|freelancers)$/, ["subcontract", "subcontractors", "freelancers", "consent"]],
  [/^(secret|nda|confidential|confidentiality|disclose)$/, ["confidential", "confidentiality", "disclose"]],
  [/^(ip|ownership|own|owns|copyright|design|designs|code)$/, ["intellectual", "property", "owned", "ownership", "licence"]],
  [/^(privacy|leak|hack|hacked|breach|gdpr)$/, ["breach", "personal", "data", "notify"]],
  [/^(invoice|invoices|invoicing|bill|billing)$/, ["invoice", "payment", "pay", "days"]],
  [/^(court|courts|dispute|jurisdiction|law)$/, ["governed", "law", "courts", "dispute"]],
];

// Words in company names that do not identify the company.
const GENERIC_NAME_WORDS = new Set(["llc", "ltd", "inc", "group", "services", "solutions", "systems", "agency", "company", "industries"]);

const words = (text: string) => text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? [];

function searchTerms(question: string): string[] {
  const terms = new Set<string>();
  for (const word of words(question)) {
    if (STOPWORDS.has(word)) continue;
    terms.add(word);
    for (const [pattern, extra] of SYNONYMS) if (pattern.test(word)) extra.forEach((t) => terms.add(t));
  }
  return [...terms];
}

/** Contracts whose counterparty is named in the question, e.g. "Aysel" or "NovaTech". */
function namedIn(question: string, contracts: Contract[]): Contract[] {
  const asked = new Set(words(question));
  return contracts.filter((c) =>
    words(c.counterparty).some((w) => w.length >= 4 && !GENERIC_NAME_WORDS.has(w) && asked.has(w)),
  );
}

export type Retrieval = {
  /** The contracts to show the model, each cut down to its relevant clauses. */
  contracts: Contract[];
  sent: number;
  total: number;
};

/**
 * True for a question that leans on the one before it: "and her notice period?",
 * "what about overtime?". A question that stands alone must not inherit the
 * previous question's subject.
 */
export function isFollowUp(question: string): boolean {
  const q = question.trim();
  return (
    /\b(she|her|hers|he|him|his|they|them|their|it|its)\b/i.test(q) ||
    /^(and|also|what about|how about)\b/i.test(q) ||
    q.split(/\s+/).length <= 4
  );
}

/**
 * Picks the clauses a question needs, so the model is not sent the whole
 * library every time. `previousQuestion` is used only when the question is a
 * follow-up and names no party itself.
 */
export function retrieveClauses(question: string, inScope: Contract[], previousQuestion?: string): Retrieval {
  const total = inScope.reduce((n, c) => n + c.clauses.length, 0);

  // A question that names a party is about that party's contract.
  let named = namedIn(question, inScope);
  let searchText = question;
  if (named.length === 0 && previousQuestion && isFollowUp(question)) {
    named = namedIn(previousQuestion, inScope);
    searchText = `${previousQuestion} ${question}`;
  }
  const candidates = named.length > 0 ? named : inScope;
  const candidateTotal = candidates.reduce((n, c) => n + c.clauses.length, 0);
  const everything = (): Retrieval => ({ contracts: candidates, sent: candidateTotal, total });

  // Nothing to trim.
  if (candidateTotal <= MAX_CLAUSES) return everything();

  const terms = searchTerms(searchText);
  if (terms.length === 0) return everything();

  // Best match first, across every candidate contract.
  const ranked = db()
    .prepare(
      `SELECT contract_id, clause_id FROM clauses_fts
       WHERE clauses_fts MATCH ? AND contract_id IN (SELECT value FROM json_each(?))
       ORDER BY bm25(clauses_fts, 2.0, 1.0) LIMIT 400`,
    )
    .all(
      terms.map((t) => `"${t.replace(/"/g, "")}"`).join(" OR "),
      JSON.stringify(candidates.map((c) => c.id)),
    ) as { contract_id: string; clause_id: string }[];

  if (ranked.length < MIN_HITS) return everything();

  // Each contract's best matches go in first. Without this, a question like
  // "which contracts renew?" is filled by the contracts with the most typical
  // wording, and one that says "rolls over" never reaches the model.
  const hits: typeof ranked = [];
  const perContract = new Map<string, number>();
  const rest: typeof ranked = [];
  for (const hit of ranked) {
    const taken = perContract.get(hit.contract_id) ?? 0;
    if (taken < PER_CONTRACT) {
      perContract.set(hit.contract_id, taken + 1);
      hits.push(hit);
    } else {
      rest.push(hit);
    }
  }
  hits.push(...rest.slice(0, Math.max(0, MAX_CLAUSES - hits.length)));

  const wanted = new Set(hits.map((h) => `${h.contract_id}\n${h.clause_id}`));
  const contracts = candidates
    .map((c) => ({ ...c, clauses: c.clauses.filter((clause) => wanted.has(`${c.id}\n${clause.id}`)) }))
    .filter((c) => c.clauses.length > 0);

  return { contracts, sent: contracts.reduce((n, c) => n + c.clauses.length, 0), total };
}
