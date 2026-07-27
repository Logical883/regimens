// src/db.js
const { Pool } = require("pg");

function needsSsl(connectionString = "") {
  if (process.env.DATABASE_SSL === "true") return true;
  if (process.env.DATABASE_SSL === "false") return false;
  return /render\.com|railway\.app|amazonaws\.com|neon\.tech|supabase\.co/i.test(
    connectionString
  );
}

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client", err);
});

module.exports = pool;
