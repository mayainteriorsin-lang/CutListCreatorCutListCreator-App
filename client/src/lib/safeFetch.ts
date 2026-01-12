/**
 * PATCH 8 + 14: Safe fetch helper with auto-retry, exponential backoff, and fallback
 *
 * Ensures frontend NEVER crashes even if backend is offline, slow, or returns bad data.
 *
 * Features:
 * - Configurable retry count (default: 3)
 * - Exponential backoff between retries
 * - Timeout protection
 * - JSON parse error handling
 * - Always returns fallback on failure (never throws)
 */

interface SafeFetchOptions {
  retries?: number;
  fallback?: any;
  timeout?: number;
  delayMs?: number;
}

export async function safeFetch<T = any>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<T> {
  const { retries = 3, fallback = null, timeout = 5000, delayMs = 100 } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        // Don't retry 4xx client errors (except 408, 429 which are transient)
        if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
          console.warn(`safeFetch: Client error ${res.status} for ${url}`);
          return fallback as T;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      let json: T;
      try {
        const text = await res.text();
        if (!text || text.trim() === '') {
          return fallback as T;
        }
        json = JSON.parse(text);
      } catch {
        console.warn(`safeFetch: JSON parse error for ${url}`);
        return fallback as T;
      }

      return json ?? (fallback as T);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn(`[SAFE FETCH] Timeout attempt ${attempt}/${retries}:`, url);
      } else {
        console.warn(`[SAFE FETCH] Retry attempt ${attempt}/${retries}:`, url, err.message);
      }

      // Wait before next retry with exponential backoff
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs * attempt));
      }
    }
  }

  console.warn(`[SAFE FETCH] All ${retries} retries failed for ${url}, using fallback`);
  return fallback as T;
}

export default safeFetch;
