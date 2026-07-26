# frontend

React (web) app for Regimens, built with Vite.

Owners: Peter, David, Benjamin

## Setup

1. Make sure the backend is running first (see `../backend/README.md`) — the app needs
   it at `http://localhost:4000` by default.
2. Copy the env file:
   ```
   cp .env.example .env
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Start the dev server:
   ```
   npm run dev
   ```
5. Open the URL it prints (typically `http://localhost:5173`). You'll be redirected to
   `/login` — log in with the demo account from the database seed:
   `username: owner`, `password: owner1234`.

## Screens

| Route | Screen |
|---|---|
| `/login` | Login |
| `/` | Dashboard (stats, stock by category) |
| `/products` | Inventory (CRUD, cost price, category) |
| `/categories` | Category groups (API-backed CRUD) |
| `/orders` | Purchase / reorder suggestions |
| `/reports` | Inventory analytics |
| `/profit` | Gross profit (D/W/M/Y via `/api/reports/profit`) |
| `/sale/new` | New sale (AppShell) |
| `/sale/confirm` | Confirm sale (AppShell) |
| `/sale/success` | Sale success / pending sync (AppShell) |
| `/backup` | Backup / restore (owner) |

## Cost & categories

- Product **cost price** and **category** are saved through `POST/PUT /api/products`.
- Categories load from `GET /api/categories` (legacy `localStorage` only if the API is down).
- Profit prefers `GET /api/reports/profit`; falls back to client math from sales + products.
- Sale lines carry `unit_cost` from the API when a sale is recorded.

## Folder structure

```
frontend/
├── src/
│   ├── api/client.js        ← axios instance, attaches JWT to every request
│   ├── offline/
│   │   ├── db.js              ← Dexie (IndexedDB) setup for the offline queue
│   │   └── sync.js            ← queues sales offline, replays them via POST /api/sync
│   ├── context/
│   │   ├── AuthContext.jsx    ← login state, token persisted in localStorage
│   │   ├── CategoryContext.jsx← categories from API (legacy localStorage fallback)
│   │   └── SaleContext.jsx    ← in-progress cart, shared across the sale screens
│   ├── components/
│   │   ├── AppShell.jsx       ← shared nav / layout for app screens
│   │   ├── ProtectedRoute.jsx
│   │   ├── LowStockBanner.jsx
│   │   └── SyncStatus.jsx     ← shows "offline" / "N sales pending sync" banner
│   └── pages/                 ← one file per screen in the table above
└── .env.example
```

## Offline behaviour (ADR-005)

- If `POST /sales` fails because there's no connection, the sale is queued in IndexedDB
  instead of being lost, and the Sale Success screen shows a "Pending sync" badge.
- On page load, and whenever the browser fires an `online` event, the app automatically
  tries to push any queued sales to `POST /api/sync`.
- The `SyncStatus` banner at the top of the app shows when you're offline or have sales
  waiting to sync.

## Testing the offline flow locally

In Chrome DevTools: Network tab → set throttling to "Offline" → record a sale → you
should land on Sale Success with the "Pending sync" badge. Switch back to "No throttling"
and the sale should sync automatically within a few seconds (watch the Network tab for
a `POST /api/sync` call).

## Full feature demo

See `../docs/DEMO.md` and `../docs/demo-script.sh`.
