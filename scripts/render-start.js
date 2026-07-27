// Render start: migrate → seed (non-fatal) → start API
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

function run(label, command, args, { fatal = true } = {}) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
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

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be set to a strong value (32+ chars) in Render env.");
  process.exit(1);
}

run("migrate", "npm", ["run", "migrate", "--prefix", "database"]);
run("seed", "npm", ["run", "seed", "--prefix", "database"], { fatal: false });
run("start", "npm", ["start", "--prefix", "backend"]);
