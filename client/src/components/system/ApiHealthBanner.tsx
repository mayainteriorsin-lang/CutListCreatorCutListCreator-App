/**
 * PATCH 38: API Health Banner
 *
 * Shows backend connection status at the top of the app.
 * Green = connected, Red = unavailable
 */

import { useApiHealth } from "@/lib/api/useApiHealth";

export default function ApiHealthBanner() {
  const status = useApiHealth();

  if (status === "checking") return null;

  if (status === "ok") {
    return (
      <div className="w-full bg-green-50 border-b border-green-200 text-green-700 text-xs px-3 py-1 text-center">
        Backend connected
      </div>
    );
  }

  return (
    <div className="w-full bg-red-50 border-b border-red-200 text-red-700 text-xs px-3 py-1 text-center">
      Backend unavailable — using fallback data
    </div>
  );
}
