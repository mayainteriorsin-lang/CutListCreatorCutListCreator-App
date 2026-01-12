/**
 * PATCH 38: API Health Hook
 *
 * Monitors backend availability with periodic health checks.
 * Returns status: "checking" | "ok" | "error"
 */

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/queryClient";

export type ApiHealthStatus = "checking" | "ok" | "error";

export function useApiHealth() {
  const [status, setStatus] = useState<ApiHealthStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
        if (!res.ok) throw new Error("Health check failed");
        if (!cancelled) setStatus("ok");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    check();

    const id = setInterval(check, 15000); // re-check every 15s
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return status;
}
