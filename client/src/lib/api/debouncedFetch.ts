/**
 * PATCH 42: Debounced Fetch Wrapper
 *
 * Prevents rapid-fire API calls by debouncing requests with the same key.
 * Each unique key gets its own debouncer.
 */

import { debounce } from "@/lib/utils/debounce";

type PendingCallbacks<T> = {
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

const debouncers = new Map<string, Function>();
const pending = new Map<string, PendingCallbacks<any>[]>();

export function debouncedFetch<T>(
  key: string,
  fn: () => Promise<T>,
  delay = 400
): Promise<T> {
  return new Promise((resolve, reject) => {
    const queue = pending.get(key) ?? [];
    queue.push({ resolve, reject });
    pending.set(key, queue);

    if (!debouncers.has(key)) {
      debouncers.set(
        key,
        debounce(async () => {
          const callbacks = pending.get(key) ?? [];
          pending.delete(key);
          try {
            const res = await fn();
            callbacks.forEach((cb) => cb.resolve(res));
          } catch (e) {
            callbacks.forEach((cb) => cb.reject(e));
          }
        }, delay)
      );
    }

    const run = debouncers.get(key)!;
    run();
  });
}
