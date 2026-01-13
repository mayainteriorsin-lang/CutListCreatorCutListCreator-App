/**
 * PATCH 14: Resilient Fetch with Automatic Retry
 *
 * Purpose:
 * - Replace raw fetch() calls with automatic retry logic
 * - Handle transient network errors gracefully
 * - Never crash the frontend due to a temporary API failure
 *
 * Features:
 * - Configurable retry count (default: 3)
 * - Exponential backoff delay between retries
 * - Handles HTTP errors as well as network errors
 * - Returns null-safe response with fallback support
 */

import { logger } from '@/lib/system/logger';

export interface FetchRetryOptions extends RequestInit {
  retries?: number;
  delayMs?: number;
  logErrors?: boolean;
}

/**
 * Fetch with automatic retry on failure.
 * Never throws - returns the Response or throws after all retries exhausted.
 */
export async function fetchRetry(
  url: string,
  options: FetchRetryOptions = {}
): Promise<Response> {
  const { retries = 3, delayMs = 50, logErrors = true, ...fetchOptions } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, fetchOptions);

      // Treat non-OK responses as errors that may need retry
      if (!res.ok) {
        // Don't retry 4xx client errors (except 408, 429 which are transient)
        if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
          return res; // Return as-is, let caller handle the error
        }

        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      return res;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (logErrors) {
        logger.warn(
          `[FETCH RETRY] Attempt ${attempt}/${retries} failed for ${url}:`,
          errorMessage
        );
      }

      // If this was the last attempt, throw the error
      if (attempt === retries) {
        throw new Error(`Fetch failed after ${retries} attempts: ${errorMessage}`);
      }

      // Wait before next retry (with exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }

  // Should never reach here, but TypeScript needs this
  throw new Error(`Fetch failed for ${url}`);
}

/**
 * Fetch with retry and JSON parsing.
 * Returns parsed JSON or fallback value on failure.
 */
export async function fetchRetryJson<T>(
  url: string,
  fallback: T,
  options: FetchRetryOptions = {}
): Promise<T> {
  try {
    const res = await fetchRetry(url, options);
    const json = await res.json();
    return json as T;
  } catch (err) {
    logger.error(`[FETCH RETRY JSON] Failed to fetch ${url}:`, err);
    return fallback;
  }
}

/**
 * Fetch with retry and automatic API response unwrapping.
 * Handles the new { success, data, error } response format from PATCH 13.
 */
export async function fetchRetryApi<T>(
  url: string,
  fallback: T,
  options: FetchRetryOptions = {}
): Promise<T> {
  try {
    const res = await fetchRetry(url, options);
    const json = await res.json();

    // Handle wrapped API response format from PATCH 13
    if (json && typeof json === 'object' && 'success' in json) {
      if (json.success && json.data !== undefined) {
        return json.data as T;
      }
      logger.warn('[FETCH RETRY API] API returned error:', json.error);
      return fallback;
    }

    // Handle legacy unwrapped format
    return json as T;
  } catch (err) {
    logger.error(`[FETCH RETRY API] Failed to fetch ${url}:`, err);
    return fallback;
  }
}
