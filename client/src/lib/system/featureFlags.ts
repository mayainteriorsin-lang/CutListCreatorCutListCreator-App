/**
 * PATCH 47: Feature Flags Registry
 *
 * Safely enable/disable features without code changes.
 * Set flag to false to disable a feature instantly.
 */

export type FeatureFlag =
  | "optimizerWorker"
  | "virtualizedPreview"
  | "apiGuard"
  | "offlineMode";

const FLAGS: Record<FeatureFlag, boolean> = {
  optimizerWorker: true,
  virtualizedPreview: true,
  apiGuard: true,
  offlineMode: true,
};

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FLAGS[flag] === true;
}
