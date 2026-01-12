/**
 * PATCH 41: Stable Callback Hook
 *
 * Wraps a callback to ensure a stable reference across renders.
 * Prevents infinite loops in useEffect dependencies.
 */

import { useRef, useCallback } from "react";

export function useStableCallback<T extends (...args: any[]) => any>(fn: T) {
  const ref = useRef(fn);
  ref.current = fn;

  return useCallback((...args: Parameters<T>) => {
    return ref.current(...args);
  }, []) as T;
}
