import { useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
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
    <div
      className={`sync-status ${online ? "sync-status--syncing" : "sync-status--offline"}`}
      role="status"
    >
      {online ? <RefreshCw size={14} strokeWidth={2} /> : <WifiOff size={14} strokeWidth={2} />}
      <span>
        {online
          ? `Syncing ${count} pending sale${count === 1 ? "" : "s"}...`
          : `Offline${count > 0 ? ` — ${count} sale${count === 1 ? "" : "s"} waiting to sync` : ""}`}
      </span>
    </div>
  );
}