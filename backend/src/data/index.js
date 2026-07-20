// src/data/index.js
// One switch controls which data layer every route uses. See ../../README.md
// "Standalone mode vs connected mode".
const useMock = process.env.USE_MOCK_DB === "true";
const impl = useMock ? require("./mock") : require("./real");

if (useMock) {
  console.log("Data layer: STANDALONE (in-memory, no database needed, resets on restart)");
} else {
  console.log("Data layer: CONNECTED (Postgres via DATABASE_URL)");
}

module.exports = impl;
