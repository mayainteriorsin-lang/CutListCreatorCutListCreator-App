/**
 * PATCH 23: Undo/Redo History Hook
 *
 * Generic history management for any state type.
 * Provides undo/redo functionality with past/future stacks.
 *
 * Usage:
 *   const { present, set, undo, redo, canUndo, canRedo } = useHistory<T>(initial);
 */

import { useCallback, useRef, useState } from "react";

export interface HistoryState<T> {
  /** Current state value */
  present: T;
  /** Update state and push to history */
  set: (next: T | ((prev: T) => T)) => void;
  /** Undo to previous state */
  undo: () => void;
  /** Redo to next state */
  redo: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Clear all history (keep current state) */
  clear: () => void;
}

export function useHistory<T>(initial: T): HistoryState<T> {
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const [present, setPresent] = useState<T>(initial);

  // Force re-render when canUndo/canRedo changes
  const [, forceUpdate] = useState(0);

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setPresent((current) => {
      const nextValue = typeof next === "function" ? (next as (prev: T) => T)(current) : next;
      past.current.push(current);
      future.current = [];
      forceUpdate((n) => n + 1);
      return nextValue;
    });
  }, []);

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    setPresent((current) => {
      const previous = past.current.pop() as T;
      future.current.push(current);
      forceUpdate((n) => n + 1);
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    setPresent((current) => {
      const next = future.current.pop() as T;
      past.current.push(current);
      forceUpdate((n) => n + 1);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    past.current = [];
    future.current = [];
    forceUpdate((n) => n + 1);
  }, []);

  return {
    present,
    set,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    clear,
  };
}
