// src/offline/sync.js
// Reference: docs/Architecture_Decision_Records.docx (ADR-005), docs/API_Schema_Regimens.docx (Sync)
import api from "../api/client";
import db from "./db";

// Call this instead of a direct POST /sales when you're not sure connectivity is up.
// Online: sends the sale straight through. Offline: queues it locally and returns
// a synthetic "pending" sale so the UI can still show a confirmation screen.
export async function recordSale(items) {
  const client_created_at = new Date().toISOString();

  if (navigator.onLine) {
    try {
      const { data } = await api.post("/sales", { items, client_created_at });
      return { ...data, pending: false };
    } catch (err) {
      // If the request itself failed (not a validation error), fall back to queueing.
      if (!err.response) {
        await db.pendingSales.add({ items, client_created_at });
        return { items, total_amount: null, sync_status: "pending", pending: true };
      }
      throw err;
    }
  }

  await db.pendingSales.add({ items, client_created_at });
  return { items, total_amount: null, sync_status: "pending", pending: true };
}

// Call this on app load and whenever the browser comes back online (see App.jsx).
export async function flushPendingSales() {
  if (!navigator.onLine) return { synced: [], conflicts: [] };

  const queued = await db.pendingSales.toArray();
  if (queued.length === 0) return { synced: [], conflicts: [] };

  const { data } = await api.post("/sync", {
    sales: queued.map(({ items, client_created_at }) => ({ items, client_created_at })),
    products: [],
  });

  // Clear whatever the server confirmed it synced; leave conflicts queued for now
  // so nothing silently disappears without the user seeing it.
  const syncedTimestamps = new Set(
    data.synced.filter((s) => s.type === "sale").map((s) => s.client_created_at)
  );
  const toDelete = queued
    .filter((q) => syncedTimestamps.has(q.client_created_at))
    .map((q) => q.localId);
  await db.pendingSales.bulkDelete(toDelete);

  return data;
}

export async function pendingSalesCount() {
  return db.pendingSales.count();
}
