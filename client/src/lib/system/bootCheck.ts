/**
 * PATCH 49: Production Safety Boot Check
 *
 * Validates critical configuration on app start.
 */

import { ENV } from "./env";

export function runBootCheck() {
  if (ENV.PROD && !ENV.API_BASE) {
    console.error("[BOOT] API_BASE is missing in production");
  }
}
