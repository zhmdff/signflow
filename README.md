# SignFlow

SignFlow reads your contracts against your own terms and the law, so you find out about conflicts before a vendor or a fine does.

Every contract is stored as clauses with ids, and every AI answer must quote those clauses. Code then checks that each quote really appears in the source.

## Run it

```bash
pnpm install
```

Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` (from [AI Studio](https://aistudio.google.com/apikey)). Then:

```bash
pnpm dev
```

Open http://localhost:3000. Without a key you can browse the contracts and the reminders page; compare, law scan, ask and upload need the key.

## Pages

| Route | What it does |
|---|---|
| `/` | Landing page |
| `/dashboard` | Overview: counts, the four checks, next deadlines |
| `/dashboard/contracts` | All contracts, the upload zone, and read / ask / compare per contract |
| `/dashboard/compare` | Partner contract against our terms |
| `/dashboard/law` | Law text against every stored contract |
| `/dashboard/ask` | Questions answered with clause citations |
| `/dashboard/reminders` | Notice deadlines and renewals (no AI) |

## Where things are

- `data/contracts/` holds one JSON file per contract. Uploads are written here too. `data/cache/` holds cached AI results.
- `lib/server/` is the server side: `gemini.ts` (`callGemini`), `schemas.ts`, `ingest.ts`, `compare.ts`, `law-scan.ts`, `ask.ts`, and `verify.ts` (the quote verifier).
- `app/api/` has one route per call. `lib/api.ts` is the typed client for them.
- `stores/` holds the zustand stores, `hooks/` the hooks pages use, `components/` the shared UI.
- `lib/reminders.ts` works out notice deadlines.

## Not built yet

- `pnpm eval`: the answer key and the precision, recall and citation-validity table.
- E-signing, accounts, email reminders and live law feeds.
