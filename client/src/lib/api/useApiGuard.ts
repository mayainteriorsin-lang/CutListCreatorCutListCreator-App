/**
 * PATCH 40: Runtime API Guard
 * PATCH 47: Feature flag integration
 *
 * Prevents critical actions when backend is unavailable.
 * Reuses API health status from PATCH 38.
 */

import { useApiHealth } from "@/lib/api/useApiHealth";
import { toastError } from "@/lib/errors/toastError";
import { isFeatureEnabled } from "@/lib/system/featureFlags";

export function useApiGuard() {
  const status = useApiHealth();
  const guardEnabled = isFeatureEnabled("apiGuard");

  function guard(actionName = "This action") {
    // PATCH 47: Allow bypass via feature flag
    if (!guardEnabled) return true;

    if (status === "error") {
      toastError(`${actionName} requires server connection`);
      return false;
    }
    return true;
  }

  return { status, guard };
}
