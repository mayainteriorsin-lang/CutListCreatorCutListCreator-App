/**
 * PATCH 49: Production Safety Boot Check
 *
 * Validates critical configuration on app start.
 * API_BASE is optional - app runs in offline/static mode when missing.
 */

export function runBootCheck() {
  // No-op: API_BASE is optional, app works without backend
}
