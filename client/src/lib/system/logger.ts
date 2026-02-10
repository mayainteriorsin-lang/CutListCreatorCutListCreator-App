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
      console.log(...args);
    }
  },
  info: (...args: any[]) => {
    if (ENV.DEV) console.info(...args);
  },
  warn: (...args: any[]) => {
    if (ENV.DEV) console.warn(...args);
  },
  error: (...args: any[]) => {
    console.error(...args); // always keep errors
  },
};
