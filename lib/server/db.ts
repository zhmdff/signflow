import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type { Contract } from "@/lib/types";
import { SEED_CONTRACTS } from "./seed";

const MAX_CONNECTIONS = 5;
const WARM_CONNECTIONS = 4;

// `fields` is json, not jsonb: jsonb reorders keys, and cache keys are hashed
// from the contract exactly as it was stored.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS contracts (
  id           text PRIMARY KEY,
  kind         text NOT NULL,
  title        text NOT NULL,
  counterparty text NOT NULL,
  fields       json NOT NULL,
  source       text NOT NULL
);

CREATE TABLE IF NOT EXISTS clauses (
  contract_id text NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  position    integer NOT NULL,
  clause_id   text NOT NULL,
  heading     text NOT NULL,
  text        text NOT NULL,
  -- Full-text index over clauses, used to pick what a question needs. Headings weigh more.
  tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', heading), 'A') || setweight(to_tsvector('english', text), 'B')
  ) STORED,
  PRIMARY KEY (contract_id, position)
);
CREATE INDEX IF NOT EXISTS clauses_tsv ON clauses USING gin (tsv);

-- Results of AI calls, keyed by a hash of everything that went into them.
CREATE TABLE IF NOT EXISTS cache (
  key        text PRIMARY KEY,
  value      json NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One row per AI call or cache hit. On a hit, the tokens are what the hit saved.
CREATE TABLE IF NOT EXISTS usage (
  id            bigserial PRIMARY KEY,
  at            timestamptz NOT NULL DEFAULT now(),
  feature       text NOT NULL,
  model         text,
  prompt_tokens integer NOT NULL,
  output_tokens integer NOT NULL,
  cached        boolean NOT NULL
);

CREATE TABLE IF NOT EXISTS law_scans (
  id       text PRIMARY KEY,
  at       timestamptz NOT NULL DEFAULT now(),
  title    text NOT NULL,
  law_text text NOT NULL,
  result   json NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id     bigserial PRIMARY KEY,
  at     timestamptz NOT NULL DEFAULT now(),
  role   text NOT NULL,
  text   text NOT NULL,
  result json
);
`;

// One pool per server process; kept on globalThis so dev hot reloads reuse it.
const g = globalThis as unknown as { __signflowPg?: { pool: Pool; ready: Promise<void> } };

function connect() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add your Postgres connection string to .env and restart the server.");
  }
  // Opening a connection to a remote database takes seconds; a query on an open one takes
  // a fraction of that. So connections are kept open between requests instead of the
  // default of closing after ten idle seconds.
  const pool = new Pool({ connectionString, max: MAX_CONNECTIONS, idleTimeoutMillis: 5 * 60_000, keepAlive: true });
  // Without a listener, a dropped idle connection would crash the process.
  pool.on("error", (err) => console.error("Database connection error:", err.message));
  const ready = prepare(pool).catch((err) => {
    // Let the next request try again instead of failing forever.
    g.__signflowPg = undefined;
    throw err;
  });
  return { pool, ready };
}

/** Creates the tables if they are missing, and fills an empty database with the sample contracts. */
async function prepare(pool: Pool): Promise<void> {
  await pool.query(SCHEMA);

  // A page fires several requests at once, and each needs its own connection. Opening
  // them now, in the background, means a page load does not wait for it.
  void Promise.all(Array.from({ length: WARM_CONNECTIONS }, () => pool.query("SELECT 1"))).catch(() => {});

  const { rows } = await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM contracts");
  if (rows[0].n > 0) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const contract of SEED_CONTRACTS) await writeContract(client, contract);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function pool(): Promise<Pool> {
  const db = (g.__signflowPg ??= connect());
  await db.ready;
  return db.pool;
}

/** Runs one statement. Parameters are $1, $2, ... */
export async function query<Row extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<Row[]> {
  return (await (await pool()).query<Row>(text, params)).rows;
}

/** Runs `work` in a transaction on one connection, rolling back if it throws. */
export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await (await pool()).connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Inserts or replaces a contract and its clauses. Call inside a transaction. */
export async function writeContract(client: PoolClient, contract: Contract): Promise<void> {
  await client.query(
    `INSERT INTO contracts (id, kind, title, counterparty, fields, source) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET kind = excluded.kind, title = excluded.title,
       counterparty = excluded.counterparty, fields = excluded.fields, source = excluded.source`,
    [contract.id, contract.kind, contract.title, contract.counterparty, JSON.stringify(contract.fields), contract.source],
  );
  await client.query("DELETE FROM clauses WHERE contract_id = $1", [contract.id]);
  // All clauses in one round trip: the database is remote, so each statement costs a network hop.
  await client.query(
    `INSERT INTO clauses (contract_id, position, clause_id, heading, text)
     SELECT $1, * FROM unnest($2::int[], $3::text[], $4::text[], $5::text[])`,
    [
      contract.id,
      contract.clauses.map((_, i) => i),
      contract.clauses.map((c) => c.id),
      contract.clauses.map((c) => c.heading),
      contract.clauses.map((c) => c.text),
    ],
  );
}
