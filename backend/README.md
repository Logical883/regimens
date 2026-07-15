# backend

Node.js + Express API for Regimens.

Owner: Albert (backend lead) · Support: Hafsa

## Stack

- Express (REST API)
- PostgreSQL via `pg`
- JWT auth (`jsonwebtoken` + `bcryptjs`)

Every endpoint here matches `../docs/API_Schema_Regimens.docx`. If you change a route's
shape, update that document in the same PR.

## Setup

1. Make sure the `database/` migrations have been run first (see `../database/README.md`).
2. Copy the env file and adjust if your local Postgres differs:
   ```
   cp .env.example .env
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   npm run dev
   ```
   You should see `Regimens backend listening on http://localhost:4000`.
5. Confirm it's alive:
   ```
   curl http://localhost:4000/api/health
   ```
   Should return `{"status":"ok"}`.

## Try it end-to-end

After running `../database/seeds/seed.js` (see database README), you can log in with the
demo account:

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

## Folder structure

```
backend/
├── src/
│   ├── index.js         ← app entry point
│   ├── db.js             ← Postgres connection pool
│   ├── middleware/auth.js ← JWT verification + role check (ADR-004)
│   └── routes/            ← one file per resource, matching API_Schema_Regimens.docx
│       ├── auth.js
│       ├── products.js
│       ├── sales.js
│       ├── reports.js
│       ├── backup.js
│       └── sync.js        ← offline queue replay (ADR-005)
└── .env.example
```

## Notes

- `POST /api/sales` runs inside a database transaction and locks the product row
  (`FOR UPDATE`) before decrementing stock, so two simultaneous sales can't oversell
  the same product.
- `/api/backup` currently writes a JSON snapshot of the core tables to
  `../database/backups/` rather than shelling out to `pg_dump`, so it works without
  any extra binaries on your machine. Swap it for `pg_dump`/`pg_restore` later if the
  team wants a true binary dump.
- `/api/sync` is what the frontend calls when it reconnects after being offline; see
  `../docs/Architecture_Decision_Records.docx` (ADR-005) for the last-write-wins logic.
