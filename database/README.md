# database

PostgreSQL migrations and seed data for Regimens.

Owners: Francis, Raymond

## Setup

1. Make sure PostgreSQL is installed and running locally, and create the database:
   ```
   psql -U postgres -c "CREATE DATABASE regimens;"
   ```
2. Copy the env file and adjust the connection string if your local setup differs:
   ```
   cp .env.example .env
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Run the migrations:
   ```
   npm run migrate
   ```
   This creates the core tables (`users`, `products`, `sales`, `sale_items`, `backups`,
   `categories`) plus cost/category columns, and tracks what's been applied in a
   `schema_migrations` table, so it's safe to run again after pulling someone else's new
   migration file — it only applies what's new.
5. (Optional but recommended for local dev) Seed some sample data:
   ```
   npm run seed
   ```
   This creates a demo owner account (`username: owner`, `password: owner1234`), default
   categories, and 5 sample products with `category` + `cost_price`, so the backend and
   frontend have something to work against right away.

## Folder structure

```
database/
├── migrations/     ← one .sql file per table, applied in filename order
├── seeds/seed.js    ← sample data for local development
├── backups/         ← where /api/backup writes JSON snapshots (git-ignored)
└── migrate.js        ← the migration runner
```

## Adding a new migration

Create a new file in `migrations/` numbered after the last one, e.g. `008_your_change.sql`.
Then run `npm run migrate` again — it will pick up and apply only the new file.

## Schema notes (cost & categories)

| Change | Migration |
|--------|-----------|
| `categories` table (`name`, `description`, `keywords`) | `006_add_categories.sql` |
| `products.category`, `products.cost_price` | `007_add_cost_category_unit_cost.sql` |
| `sale_items.unit_cost` (stamped at sale time for profit) | `007_add_cost_category_unit_cost.sql` |

**Before renaming or dropping a column**, flag it in the team chat first — the backend
code in `../backend/src/routes` assumes the exact column names in `../docs/ERD_Regimens.docx`.
