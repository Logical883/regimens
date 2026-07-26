# backend

Node.js + Express API for Regimens.

Owner: Albert (backend lead) · Support: Hafsa

## Stack

- Express (REST API)
- PostgreSQL via `pg` (only needed once you're in **connected mode** — see below)
- JWT auth (`jsonwebtoken` + `bcryptjs`)

Every endpoint here matches `../docs/API_Schema_Regimens.docx`. If you change a route's
shape, update that document in the same PR.

## Standalone mode vs connected mode

The backend can run two ways, controlled by one line in `.env`:

```
USE_MOCK_DB=true    # standalone — in-memory data, no Postgres needed at all
USE_MOCK_DB=false   # connected  — real Postgres, needs database/ set up first
```

**Standalone mode is the default.** Use it while building/demoing — nobody needs
Postgres installed or configured to get the API running. It ships pre-seeded with the
same demo account and 5 sample products as the real seed script, so login and the
frontend work immediately. Data resets every time you restart the server — that's
expected, it's for building against, not for storing anything real.

Auth, Products, Categories, Sales, and **Profit reports** (`GET /api/reports/profit`)
all work in standalone mode. **Sales revenue reports** (`GET /api/reports/sales`),
Backup, and Sync still require connected mode — they're more naturally tied to real
persisted data, so build/test those against real Postgres once `database/` is set up
(see `../database/README.md`).

Switching to connected mode later is one line — set `USE_MOCK_DB=false` in `.env` and
make sure `DATABASE_URL` points at your Postgres instance. No route code changes.

## Setup

1. Copy the env file — standalone mode works out of the box, no editing needed:
   ```
   cp .env.example .env
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   npm run dev
   ```
   You should see `Data layer: STANDALONE ...` followed by `Regimens backend listening
   on http://localhost:4000`.
4. Confirm it's alive:
   ```
   curl http://localhost:4000/api/health
   ```
   Should return `{"status":"ok"}`.

### Switching to connected mode

1. Make sure the `database/` migrations (and ideally the seed script) have been run
   first — see `../database/README.md`.
2. In `backend/.env`, set `USE_MOCK_DB=false` and confirm `DATABASE_URL` matches your
   Postgres setup.
3. Restart the server — it should now log `Data layer: CONNECTED (Postgres via
   DATABASE_URL)`.

## Try it end-to-end

Works the same in either mode. Log in with the demo account:

```
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"owner","password":"owner1234"}'
```

Copy the `token` from the response and use it on any other endpoint:

```
curl http://localhost:4000/api/products \
  -H "Authorization: Bearer <token>"
```

Useful follow-ups for cost / profit demos:

```
curl http://localhost:4000/api/categories -H "Authorization: Bearer <token>"
curl "http://localhost:4000/api/reports/profit?period=monthly" -H "Authorization: Bearer <token>"
```

Or run the packaged script from the repo root: `bash docs/demo-script.sh`
(see `../docs/DEMO.md`).

## Folder structure

```
backend/
├── src/
│   ├── index.js         ← app entry point
│   ├── db.js             ← Postgres connection pool (used only in connected mode)
│   ├── data/
│   │   ├── index.js        ← picks mock or real based on USE_MOCK_DB
│   │   ├── mock.js         ← in-memory data for standalone mode
│   │   └── real.js         ← Postgres queries for connected mode
│   ├── middleware/auth.js ← JWT verification + role check (ADR-004)
│   └── routes/            ← one file per resource, matching API_Schema_Regimens.docx
│       ├── auth.js         ← uses data/ (works in both modes)
│       ├── products.js     ← uses data/ (works in both modes; category + cost_price)
│       ├── categories.js   ← uses data/ (works in both modes)
│       ├── sales.js        ← uses data/ (works in both modes; stamps unit_cost)
│       ├── reports.js      ← /profit via data/; /sales still Postgres-only
│       ├── backup.js       ← Postgres only, for now
│       └── sync.js         ← Postgres only, for now (offline queue replay, ADR-005)
└── .env.example
```

## Notes

- `POST /api/sales` locks the product row before decrementing stock in connected mode
  (`FOR UPDATE` inside a transaction), so two simultaneous sales can't oversell the same
  product. Standalone mode is single-threaded JS, so the same guarantee holds without
  needing a lock.
- `/api/backup` writes a JSON snapshot of the core tables to `../database/backups/`
  rather than shelling out to `pg_dump`, so it works without any extra binaries on your
  machine. Swap it for `pg_dump`/`pg_restore` later if the team wants a true binary dump.
- `/api/sync` is what the frontend calls when it reconnects after being offline; see
  `../docs/Architecture_Decision_Records.docx` (ADR-005) for the last-write-wins logic.
