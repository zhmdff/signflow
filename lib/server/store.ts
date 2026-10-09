import { createHash } from "node:crypto";
import type { Clause, Contract, ContractFields, ContractKind, Usage } from "@/lib/types";
import { db, transaction, writeContract } from "./db";
import { logUsage, type Feature } from "./usage";

type ContractRow = { id: string; kind: ContractKind; title: string; counterparty: string; fields: string; source: Contract["source"] };
type ClauseRow = { contract_id: string; clause_id: string; heading: string; text: string };

const KIND_ORDER = { own_terms: 0, partner: 1, employee: 2 } as const;

function assemble(rows: ContractRow[], clauseRows: ClauseRow[]): Contract[] {
  const clauses = new Map<string, Clause[]>();
  for (const row of clauseRows) {
    const list = clauses.get(row.contract_id) ?? [];
    list.push({ id: row.clause_id, heading: row.heading, text: row.text });
    clauses.set(row.contract_id, list);
  }
  return rows
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      counterparty: row.counterparty,
      clauses: clauses.get(row.id) ?? [],
      fields: JSON.parse(row.fields) as ContractFields,
      source: row.source,
    }))
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.counterparty.localeCompare(b.counterparty));
}

export async function listContracts(): Promise<Contract[]> {
  const rows = db().prepare("SELECT * FROM contracts").all() as ContractRow[];
  const clauseRows = db().prepare("SELECT * FROM clauses ORDER BY contract_id, position").all() as ClauseRow[];
  return assemble(rows, clauseRows);
}

export async function getContract(id: string): Promise<Contract | undefined> {
  const row = db().prepare("SELECT * FROM contracts WHERE id = ?").get(id) as ContractRow | undefined;
  if (!row) return undefined;
  const clauseRows = db()
    .prepare("SELECT * FROM clauses WHERE contract_id = ? ORDER BY position")
    .all(id) as ClauseRow[];
  return assemble([row], clauseRows)[0];
}

export async function getOwnTerms(): Promise<Contract | undefined> {
  const row = db().prepare("SELECT id FROM contracts WHERE kind = 'own_terms' LIMIT 1").get() as
    | { id: string }
    | undefined;
  return row ? getContract(row.id) : undefined;
}

export async function saveContract(contract: Contract): Promise<void> {
  transaction(() => writeContract(db(), contract));
}

export async function deleteContract(id: string): Promise<void> {
  transaction(() => {
    db().prepare("DELETE FROM clauses_fts WHERE contract_id = ?").run(id);
    db().prepare("DELETE FROM contracts WHERE id = ?").run(id);
  });
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const sha = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);

/** Changes only when what the model would read changes, so renaming nothing costs nothing. */
export function contractHash(contract: Contract): string {
  return sha([contract.kind, contract.title, contract.counterparty, contract.fields, contract.clauses]);
}

/** Stable key for a cached AI result: changes whenever any input changes. */
export function cacheKey(prefix: string, ...inputs: unknown[]): string {
  return `${prefix}-${sha(inputs)}`;
}

export function readCache<T>(key: string): T | undefined {
  const row = db().prepare("SELECT value FROM cache WHERE key = ?").get(key) as { value: string } | undefined;
  return row ? (JSON.parse(row.value) as T) : undefined;
}

export function writeCache(key: string, value: unknown): void {
  db()
    .prepare(
      `INSERT INTO cache (key, value, created_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, created_at = excluded.created_at`,
    )
    .run(key, JSON.stringify(value), new Date().toISOString());
}

// Identical requests that arrive while one is running share its result.
const g = globalThis as unknown as { __signflowInflight?: Map<string, Promise<unknown>> };
const inflight = (g.__signflowInflight ??= new Map());

/**
 * Returns the stored result for `key`, or runs `compute` and stores it.
 * A hit is logged with the tokens the original call used, which is what it saved.
 */
export async function cached<T extends { usage: Usage }>(
  feature: Feature,
  key: string,
  compute: () => Promise<T>,
  opts: { force?: boolean } = {},
): Promise<T & { cached: boolean }> {
  if (!opts.force) {
    const hit = readCache<T>(key);
    if (hit) {
      logUsage(feature, hit.usage, true);
      return { ...hit, cached: true };
    }
  }

  let running = inflight.get(key) as Promise<T> | undefined;
  if (!running) {
    running = compute()
      .then((value) => {
        writeCache(key, value);
        return value;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, running);
  }
  return { ...(await running), cached: false };
}
