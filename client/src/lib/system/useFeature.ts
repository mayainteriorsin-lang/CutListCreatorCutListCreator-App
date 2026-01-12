/**
 * PATCH 47: Feature Flag Hook
 *
 * React hook for checking feature flags in components.
 */

import { FeatureFlag, isFeatureEnabled } from "./featureFlags";

export function useFeature(flag: FeatureFlag) {
  return isFeatureEnabled(flag);
}
