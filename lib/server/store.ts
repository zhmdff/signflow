import { createHash } from "node:crypto";
import type { Clause, Contract, ContractFields, ContractKind, Usage } from "@/lib/types";
import { query, transaction, writeContract } from "./db";
import { logUsage, type Feature } from "./usage";

type ContractRow = {
  id: string;
  kind: ContractKind;
  title: string;
  counterparty: string;
  fields: ContractFields;
  source: Contract["source"];
  clauses: Clause[];
};

const KIND_ORDER = { own_terms: 0, partner: 1, employee: 2 } as const;

// One statement returns each contract with its clauses, in order.
const SELECT_CONTRACTS = `
  SELECT c.id, c.kind, c.title, c.counterparty, c.fields, c.source,
         COALESCE(
           json_agg(json_build_object('id', cl.clause_id, 'heading', cl.heading, 'text', cl.text) ORDER BY cl.position)
             FILTER (WHERE cl.contract_id IS NOT NULL),
           '[]'
         ) AS clauses
  FROM contracts c LEFT JOIN clauses cl ON cl.contract_id = c.id`;

const toContract = (row: ContractRow): Contract => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  counterparty: row.counterparty,
  // Rebuilt key by key so the shape, and so the cache hash, never depends on the database's key order.
  clauses: row.clauses.map((c) => ({ id: c.id, heading: c.heading, text: c.text })),
  fields: row.fields,
  source: row.source,
});

export async function listContracts(): Promise<Contract[]> {
  const rows = await query<ContractRow>(`${SELECT_CONTRACTS} GROUP BY c.id`);
  return rows
    .map(toContract)
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.counterparty.localeCompare(b.counterparty));
}

export async function getContract(id: string): Promise<Contract | undefined> {
  const rows = await query<ContractRow>(`${SELECT_CONTRACTS} WHERE c.id = $1 GROUP BY c.id`, [id]);
  return rows[0] ? toContract(rows[0]) : undefined;
}

export async function getOwnTerms(): Promise<Contract | undefined> {
  const rows = await query<ContractRow>(`${SELECT_CONTRACTS} WHERE c.kind = 'own_terms' GROUP BY c.id LIMIT 1`);
  return rows[0] ? toContract(rows[0]) : undefined;
}

export async function saveContract(contract: Contract): Promise<void> {
  await transaction((client) => writeContract(client, contract));
}

export async function deleteContract(id: string): Promise<void> {
  // Clauses go with it: the foreign key cascades.
  await query("DELETE FROM contracts WHERE id = $1", [id]);
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

export async function readCache<T>(key: string): Promise<T | undefined> {
  const rows = await query<{ value: T }>("SELECT value FROM cache WHERE key = $1", [key]);
  return rows[0]?.value;
}

/** Several keys in one round trip. Missing keys are simply absent from the result. */
export async function readCacheMany<T>(keys: string[]): Promise<Map<string, T>> {
  if (keys.length === 0) return new Map();
  const rows = await query<{ key: string; value: T }>("SELECT key, value FROM cache WHERE key = ANY($1::text[])", [keys]);
  return new Map(rows.map((r) => [r.key, r.value]));
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  await query(
    `INSERT INTO cache (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, created_at = now()`,
    [key, JSON.stringify(value)],
  );
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
    const hit = await readCache<T>(key);
    if (hit) {
      await logUsage(feature, hit.usage, true);
      return { ...hit, cached: true };
    }
  }

  let running = inflight.get(key) as Promise<T> | undefined;
  if (!running) {
    running = compute()
      .then(async (value) => {
        await writeCache(key, value);
        return value;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, running);
  }
  return { ...(await running), cached: false };
}
