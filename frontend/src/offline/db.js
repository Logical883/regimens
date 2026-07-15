// src/offline/db.js
// Reference: docs/Architecture_Decision_Records.docx (ADR-005)
// Local-first storage: sales recorded while offline go into `pendingSales` until they
// can be pushed to the server via /api/sync. `cachedProducts` lets the New Sale screen
// keep working (search, see stock) even with no connection.
import Dexie from "dexie";

export const db = new Dexie("regimens");

db.version(1).stores({
  pendingSales: "++localId, client_created_at",
  cachedProducts: "id, name",
});

export default db;
