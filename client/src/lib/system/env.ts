/**
 * PATCH 49: Centralized Environment Config
 *
 * Single source of truth for environment variables.
 * Safe fallbacks for missing values.
 */

export const ENV = {
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,

  API_BASE: import.meta.env.VITE_API_BASE || "",
};
