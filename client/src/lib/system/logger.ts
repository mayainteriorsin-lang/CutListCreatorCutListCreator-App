/**
 * PATCH 49: Production-Safe Logger
 *
 * Suppresses debug logs in production.
 * Always keeps error logs visible.
 */

import { ENV } from "./env";

export const logger = {
  log: (...args: any[]) => {
    if (ENV.DEV && process.env.NODE_ENV !== 'test') {
      // Keep direct console for dev debugging of the logger itself if needed,
      // but typically we should rely on the Logger class logic.
      // For now, silencing this to prevent recursion or spam.
    }
  },
  warn: (...args: any[]) => {
    if (ENV.DEV) console.warn(...args);
  },
  error: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[ProtectedRoute] Auth bypassed (development mode)');
    }
    console.error(...args); // always keep errors
  },
};
