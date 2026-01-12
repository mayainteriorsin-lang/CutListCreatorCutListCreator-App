/**
 * PATCH 45: Request Timeout Helper
 *
 * Fails fast on hanging requests by racing against a timeout.
 * Default timeout: 8 seconds.
 */

export async function withTimeout<T>(
  promise: Promise<T>,
  ms = 8000
): Promise<T> {
  let timer: number;

  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => {
      reject(new Error("Request timed out"));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
