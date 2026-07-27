// database/migrate.js
// Runs every .sql file in ./migrations that hasn't been applied yet, in filename order.
// Usage: node migrate.js   (run from the database/ folder, or via `npm run migrate` in backend/)

require("dotenv").config();
// Also load backend/.env when migrate is run from the monorepo on a host.
require("dotenv").config({ path: require("path").join(__dirname, "..", "backend", ".env") });

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

function needsSsl(connectionString = "") {
  if (process.env.DATABASE_SSL === "true") return true;
  if (process.env.DATABASE_SSL === "false") return false;
  return /render\.com|railway\.app|amazonaws\.com|neon\.tech|supabase\.co/i.test(
    connectionString
  );
}

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({
    connectionString,
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const applied = new Set(
    (await client.query("SELECT filename FROM schema_migrations")).rows.map((r) => r.filename)
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let ranAny = false;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    console.log(`Applying ${file} ...`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      ranAny = true;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`Failed applying ${file}:`, err.message);
      await client.end();
      process.exit(1);
    }
  }

  if (!ranAny) console.log("Already up to date. No new migrations to apply.");
  else console.log("All migrations applied successfully.");

  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
