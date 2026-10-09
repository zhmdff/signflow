import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Contract } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "signflow.db");
const SEED_DIR = path.join(DATA_DIR, "contracts");

const SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS contracts (
  id           TEXT PRIMARY KEY,
  kind         TEXT NOT NULL,
  title        TEXT NOT NULL,
  counterparty TEXT NOT NULL,
  fields       TEXT NOT NULL,
  source       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clauses (
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  clause_id   TEXT NOT NULL,
  heading     TEXT NOT NULL,
  text        TEXT NOT NULL,
  PRIMARY KEY (contract_id, position)
);

-- Full-text index over clauses, used to pick what a question needs.
CREATE VIRTUAL TABLE IF NOT EXISTS clauses_fts USING fts5(
  heading, text, contract_id UNINDEXED, clause_id UNINDEXED,
  tokenize = 'porter unicode61'
);

-- Results of AI calls, keyed by a hash of everything that went into them.
CREATE TABLE IF NOT EXISTS cache (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- One row per AI call or cache hit. On a hit, the tokens are what the hit saved.
CREATE TABLE IF NOT EXISTS usage (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  at            TEXT NOT NULL,
  feature       TEXT NOT NULL,
  model         TEXT,
  prompt_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cached        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS law_scans (
  id       TEXT PRIMARY KEY,
  at       TEXT NOT NULL,
  title    TEXT NOT NULL,
  law_text TEXT NOT NULL,
  result   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  at     TEXT NOT NULL,
  role   TEXT NOT NULL,
  text   TEXT NOT NULL,
  result TEXT
);
`;

// One connection per server process; kept on globalThis so dev hot reloads reuse it.
const g = globalThis as unknown as { __signflowDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (!g.__signflowDb) {
    mkdirSync(DATA_DIR, { recursive: true });
    const database = new DatabaseSync(DB_FILE);
    database.exec("PRAGMA foreign_keys = ON;");
    database.exec(SCHEMA);
    seed(database);
    g.__signflowDb = database;
  }
  return g.__signflowDb;
}

/** Runs `work` in a transaction, rolling back if it throws. */
export function transaction<T>(work: () => T): T {
  const database = db();
  database.exec("BEGIN");
  try {
    const result = work();
    database.exec("COMMIT");
    return result;
  } catch (err) {
    database.exec("ROLLBACK");
    throw err;
  }
}

export function writeContract(database: DatabaseSync, contract: Contract): void {
  database
    .prepare(
      `INSERT INTO contracts (id, kind, title, counterparty, fields, source) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, title = excluded.title,
         counterparty = excluded.counterparty, fields = excluded.fields, source = excluded.source`,
    )
    .run(contract.id, contract.kind, contract.title, contract.counterparty, JSON.stringify(contract.fields), contract.source);

  database.prepare("DELETE FROM clauses WHERE contract_id = ?").run(contract.id);
  database.prepare("DELETE FROM clauses_fts WHERE contract_id = ?").run(contract.id);

  const insertClause = database.prepare(
    "INSERT INTO clauses (contract_id, position, clause_id, heading, text) VALUES (?, ?, ?, ?, ?)",
  );
  const insertFts = database.prepare(
    "INSERT INTO clauses_fts (heading, text, contract_id, clause_id) VALUES (?, ?, ?, ?)",
  );
  contract.clauses.forEach((clause, position) => {
    insertClause.run(contract.id, position, clause.id, clause.heading, clause.text);
    insertFts.run(clause.heading, clause.text, contract.id, clause.id);
  });
}

/** A new database starts with the sample contracts from data/contracts. */
function seed(database: DatabaseSync): void {
  const { n } = database.prepare("SELECT COUNT(*) AS n FROM contracts").get() as { n: number };
  if (n > 0) return;

  let files: string[] = [];
  try {
    files = readdirSync(SEED_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return;
  }
  database.exec("BEGIN");
  for (const file of files) {
    writeContract(database, JSON.parse(readFileSync(path.join(SEED_DIR, file), "utf8")) as Contract);
  }
  database.exec("COMMIT");
}
