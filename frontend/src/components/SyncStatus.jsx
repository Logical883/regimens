// src/components/SyncStatus.jsx
// Reference: docs/Architecture_Decision_Records.docx (ADR-005)
// Small persistent indicator so the user always knows if there's unsynced work sitting
// on the device (Team Collaboration Guide, task 4.6 - Benjamin).
import { useEffect, useState } from "react";
import { pendingSalesCount } from "../offline/sync";

export default function SyncStatus() {
  const [count, setCount] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const refresh = () => pendingSalesCount().then(setCount);
    refresh();
    const interval = setInterval(refresh, 3000);

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online && count === 0) return null;

  return (
    <div className={`sync-status ${online ? "sync-status--syncing" : "sync-status--offline"}`}>
      {online
        ? `Syncing ${count} pending sale${count === 1 ? "" : "s"}...`
        : `Offline${count > 0 ? ` \u2014 ${count} sale${count === 1 ? "" : "s"} waiting to sync` : ""}`}
    </div>
  );
}
