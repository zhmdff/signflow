# SignFlow: developer notes

Setup, structure and internals. For what the product does, see [README.md](README.md).

## Run it

```bash
pnpm install
```

Copy `.env.example` to `.env` and set `DATABASE_URL` to a Postgres connection string and `GEMINI_API_KEY` (from [AI Studio](https://aistudio.google.com/apikey)). Optionally set `GROQ_API_KEY` as a backup: if a Gemini call fails, the same request is sent to Groq. The backup cannot read PDFs, only text. Each provider also accepts extra keys as a comma-separated list in `GEMINI_API_KEYS` and `GROQ_API_KEYS`; a key that fails is rested and the next one is tried. Then:

```bash
pnpm dev
```

Open http://localhost:3000. Without a key you can browse the contracts and the reminders page; compare, law scan, ask and upload need the key.

## Deploying

The app keeps nothing on disk, so it runs on serverless hosts such as Vercel. Set the same variables there as in `.env`: `DATABASE_URL`, `GEMINI_API_KEY`, and optionally `GROQ_API_KEY`, `GEMINI_API_KEYS` and `GROQ_API_KEYS`. Use the pooled Neon connection string (the host name contains `-pooler`).

## Pages

| Route | What it does |
|---|---|
| `/` | Landing page |
| `/dashboard` | Overview: counts, the checks, next deadlines |
| `/dashboard/contracts` | All contracts, the upload zone, and read / ask / compare per contract |
| `/dashboard/terms` | Editor for your own terms: add, change, reorder and remove rules |
| `/dashboard/compare` | Partner contract against our terms |
| `/dashboard/law` | Law text against every stored contract |
| `/dashboard/ask` | Questions answered with clause citations |
| `/dashboard/reminders` | Notice deadlines and renewals (no AI) |
| `/dashboard/usage` | Tokens used, calls, cache hits and tokens saved per step |

## Where things are

- The database is Postgres (built for [Neon](https://neon.tech)), reached through `DATABASE_URL`. It holds contracts, clauses with a full-text index, cached AI results, the usage log, law scan history and the chat. The tables are created on first run, and an empty database is filled with the sample contracts.
- `data/contracts/` holds the sample contracts that seed an empty database. `data/samples/` has a long contract to upload.
- `lib/server/` is the server side: `db.ts` and `store.ts` (database and cache), `ai.ts` (`callModel`, which tries `gemini.ts` then `groq.ts`), `split.ts` (splits numbered contracts in code), `search.ts` (picks the clauses a question needs), `usage.ts`, `schemas.ts`, `ingest.ts`, `compare.ts`, `law-scan.ts`, `ask.ts`, and `verify.ts` (the quote verifier).
- `app/api/` has one route per call. `lib/api.ts` is the typed client for them.
- `stores/` holds the zustand stores and `hooks/` the hooks pages use.
- `components/ui/` holds the shared building blocks (buttons, cards, tabs, collapsible sections, the slide-over drawer). `components/features/` has one view per page.
- `lib/reminders.ts` works out notice deadlines.

## How it saves tokens

- **Upload:** numbered contracts are split into clauses in code. The model only reads the contract and returns the title, parties and dates. PDFs and unnumbered contracts still go fully through the model.
- **Ask:** full-text search picks each contract's best-matching clauses, so a question reads about 10 to 20 clauses, not the whole library. Repeated questions are answered from the cache.
- **Law scan:** the law is read once. Each contract's check is stored on its own, so a later scan only pays for contracts that are new or changed.
- **Compare:** stored per contract and terms version, and shown again after a reload without a model call.
- **Rate limits:** short limits are waited out; when Gemini is out of quota the app goes straight to the backup for 15 minutes.

The Overview page shows tokens used, calls, cache hits and tokens saved per step.

## Not built yet

- `pnpm eval`: the answer key and the precision, recall and citation-validity table.
- E-signing, accounts, email reminders and live law feeds.
