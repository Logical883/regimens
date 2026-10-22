// Build step for the API Vercel project: migrate (+ optional seed) when using Postgres.
const { spawnSync } = require("child_process");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const databaseRoot = path.join(repoRoot, "database");

if (process.env.USE_MOCK_DB === "true") {
  console.log("USE_MOCK_DB=true — skipping migrate/seed (in-memory mock).");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required unless USE_MOCK_DB=true.");
  process.exit(1);
}

function run(label, command, args, cwd) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: true, env: process.env });
  if (result.status !== 0) {
    console.error(`${label} failed with exit code ${result.status}`);
    process.exit(result.status || 1);
  }
}

run("database npm install", "npm", ["install"], databaseRoot);
run("migrate", "node", ["migrate.js"], databaseRoot);

const seed = spawnSync("node", ["seeds/seed.js"], {
  cwd: databaseRoot,
  stdio: "inherit",
  shell: true,
  env: process.env,
});
if (seed.status !== 0) {
  console.warn("seed failed (non-fatal)");
}
