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

## Screens (matches docs/UIUX_Design_Guide_Week2.docx)

| Route | Screen |
|---|---|
| `/login` | Login |
| `/` | Dashboard (inventory list, low-stock banner) |
| `/sale/new` | New Sale (search + add to cart) |
| `/sale/confirm` | Confirm Sale (review cart, submit) |
| `/sale/success` | Sale Success (shows synced or pending-sync state) |

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
│   │   └── SaleContext.jsx    ← in-progress cart, shared across the sale screens
│   ├── components/
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
