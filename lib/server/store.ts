import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Contract } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const CONTRACTS_DIR = path.join(DATA_DIR, "contracts");
const CACHE_DIR = path.join(DATA_DIR, "cache");

// Fallback for hosts with a read-only filesystem: uploads and cached results
// live in memory for the lifetime of the server process.
const g = globalThis as unknown as {
  __signflow?: { contracts: Map<string, Contract>; cache: Map<string, unknown> };
};
const memory = (g.__signflow ??= { contracts: new Map(), cache: new Map() });

const KIND_ORDER = { own_terms: 0, partner: 1, employee: 2 } as const;

export async function listContracts(): Promise<Contract[]> {
  const byId = new Map<string, Contract>();
  const files = await readdir(CONTRACTS_DIR).catch(() => [] as string[]);
  await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        const contract = JSON.parse(await readFile(path.join(CONTRACTS_DIR, f), "utf8")) as Contract;
        byId.set(contract.id, contract);
      }),
  );
  for (const [id, contract] of memory.contracts) byId.set(id, contract);
  return [...byId.values()].sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.counterparty.localeCompare(b.counterparty),
  );
}

export async function getContract(id: string): Promise<Contract | undefined> {
  return (await listContracts()).find((c) => c.id === id);
}

export async function getOwnTerms(): Promise<Contract | undefined> {
  return (await listContracts()).find((c) => c.kind === "own_terms");
}

export async function saveContract(contract: Contract): Promise<void> {
  try {
    await mkdir(CONTRACTS_DIR, { recursive: true });
    await writeFile(path.join(CONTRACTS_DIR, `${contract.id}.json`), JSON.stringify(contract, null, 2));
  } catch {
    memory.contracts.set(contract.id, contract);
  }
}

export async function deleteContract(id: string): Promise<void> {
  memory.contracts.delete(id);
  await unlink(path.join(CONTRACTS_DIR, `${id}.json`)).catch(() => {});
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Stable key for a cached AI result: changes whenever any input changes. */
export function cacheKey(prefix: string, ...inputs: unknown[]): string {
  const hash = createHash("sha256").update(JSON.stringify(inputs)).digest("hex").slice(0, 16);
  return `${prefix}-${hash}`;
}

export async function readCache<T>(key: string): Promise<T | undefined> {
  if (memory.cache.has(key)) return memory.cache.get(key) as T;
  try {
    const value = JSON.parse(await readFile(path.join(CACHE_DIR, `${key}.json`), "utf8")) as T;
    memory.cache.set(key, value);
    return value;
  } catch {
    return undefined;
  }
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  memory.cache.set(key, value);
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(value, null, 2));
  } catch {
    // Memory copy is enough.
  }
}
