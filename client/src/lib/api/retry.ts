/**
 * PATCH 44: Retry Helper with Exponential Backoff
 *
 * Automatically retries failed async operations with increasing delays.
 */

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    retries?: number;
    delayMs?: number;
    factor?: number;
  }
): Promise<T> {
  const retries = options?.retries ?? 3;
  let delay = options?.delayMs ?? 400;
  const factor = options?.factor ?? 2;

  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, delay));
      delay *= factor; // exponential backoff
    }
  }

  throw lastError;
}
