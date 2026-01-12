/**
 * PATCH 24: Throttled Autosave Hook
 *
 * Automatically saves cabinets and panels to localStorage.
 * Throttled to avoid performance issues on rapid changes.
 */

import { useEffect, useRef } from "react";
import { saveAutosave } from "./autosave";

/**
 * Hook that autosaves cabinets and panels on change.
 * Uses a 500ms debounce to avoid excessive writes.
 *
 * @param cabinets - Current cabinets array
 * @param panels - Current manual panels array
 */
export function useAutosave(cabinets: unknown[], panels: unknown[]): void {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear any pending save
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    // Schedule new save after 500ms of inactivity
    timerRef.current = window.setTimeout(() => {
      saveAutosave({
        cabinets,
        panels,
        timestamp: Date.now(),
      });
    }, 500);

    // Cleanup on unmount or before next effect
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [cabinets, panels]);
}
