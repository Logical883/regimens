// Render start from backend/ rootDir: migrate → seed (non-fatal) → start API
const { spawnSync } = require("child_process");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const backendRoot = path.join(repoRoot, "backend");
const databaseRoot = path.join(repoRoot, "database");

function run(label, command, args, cwd, { fatal = true } = {}) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`${label} failed with exit code ${result.status}`);
    if (fatal) process.exit(result.status || 1);
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Link the Render Postgres database to this service.");
  process.exit(1);
}

if (!process.env.JWT_SECRET || String(process.env.JWT_SECRET).length < 32) {
  console.error("JWT_SECRET must be set to a strong value (32+ chars) in Render env.");
  process.exit(1);
}

// database package needs its deps (pg, dotenv, bcryptjs)
run("database npm install", "npm", ["install"], databaseRoot);
run("migrate", "node", ["migrate.js"], databaseRoot);
run("seed", "node", ["seeds/seed.js"], databaseRoot, { fatal: false });
run("start", "npm", ["start"], backendRoot);
