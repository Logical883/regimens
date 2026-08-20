# Demo script — cost, categories & profit

Walkthrough for marking / showing Regimens with **product cost**, **categories**, and **gross profit**.

## Prerequisites

1. Backend running (`cd backend && npm run dev`) — standalone mock (`USE_MOCK_DB=true`) is enough.
2. Frontend running (`cd frontend && npm run dev`).
3. Demo login: `owner` / `owner1234`.

Optional connected mode: run `database` migrate + seed, set `USE_MOCK_DB=false`.

## API smoke test

From the repo root (Git Bash / WSL / macOS / Linux):

```bash
bash docs/demo-script.sh
```

Or on Windows PowerShell, call the same endpoints with `curl.exe` after logging in and copying the token.

Expected highlights:

| Step | What you should see |
|------|---------------------|
| `GET /api/categories` | Seeded groups (Notebooks, Pens, …) |
| `GET /api/products` | Each product has `category`, `cost_price`, and `stock_layers` |
| `POST /api/sales` | Line items stamp **current sell price** and **FIFO layer cost** (`unit_cost`) |
| `GET /api/reports/profit?period=monthly` | `revenue`, `cogs`, `grossProfit`, `breakdown` |

Periods: `daily` · `weekly` · `monthly` · `yearly`.

## UI walkthrough (~5 minutes)

1. **Login** — `owner` / `owner1234`.
2. **Inventory** — open a product; set or confirm **Cost price** and **Category**; save. Reload: values come from the API (not browser-only storage). Increasing stock after a cost change opens a **new cost layer**.
3. **Categories** — add/edit/delete a group; list refreshes from `/api/categories`.
4. **New sale** — add items → Review → Confirm. Success screen sits in the same AppShell as the rest of the app. Oldest stock is sold first at today’s shelf price.
5. **Profit** — switch Daily / Weekly / Monthly / Yearly; totals and chart load from `/api/reports/profit`. Export CSV if needed.

## Talking points

- Cost is stored on each **stock layer**; at sale time a FIFO-weighted `unit_cost` is **stamped** onto `sale_items` so later cost edits don’t rewrite history or leftover old stock.
- Changing **sell price** updates the shelf price only. The next sale uses that price; remaining old units still use their original cost.
- Profit = revenue − COGS (quantity × unit_cost per line).
- Standalone mode demos Auth, Products, Categories, Sales, and Profit without Postgres. Sales *revenue* report (`/api/reports/sales`), Backup, and Sync still prefer connected Postgres.
