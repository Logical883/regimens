import { useEffect } from "react";
import api from "../api/client";

const INTERVAL_MS = 30_000;

/**
 * Pings the API every 30s while the app is open so Render free tier
 * is less likely to spin down during a demo/session.
 */
export default function KeepAlive() {
  useEffect(() => {
    let cancelled = false;

    async function ping() {
      try {
        await api.get("/health", { timeout: 10000 });
      } catch {
        // Ignore — cold starts / offline; next tick will retry.
      }
    }

    ping();
    const id = setInterval(() => {
      if (!cancelled) ping();
    }, INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
