/**
 * PATCH 48: Performance Monitoring
 * PATCH 49: Production-safe logging
 *
 * Lightweight performance measurement for slow operations.
 * Zero external dependencies, debug-friendly.
 */

import { ENV } from "@/lib/system/env";

export interface PerfEntry {
  name: string;
  startTime: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

const entries: PerfEntry[] = [];
const activeTimers = new Map<string, PerfEntry>();

// Enable/disable logging (can be toggled at runtime)
let loggingEnabled = ENV.DEV;

export function enablePerfLogging(enabled: boolean) {
  loggingEnabled = enabled;
}

/**
 * Start timing an operation
 */
export function perfStart(name: string, metadata?: Record<string, unknown>): void {
  const entry: PerfEntry = {
    name,
    startTime: performance.now(),
    metadata,
  };
  activeTimers.set(name, entry);
}

/**
 * End timing an operation and log result
 */
export function perfEnd(name: string): number {
  const entry = activeTimers.get(name);
  if (!entry) {
    console.warn(`[PERF] No timer found for: ${name}`);
    return 0;
  }

  const duration = performance.now() - entry.startTime;
  entry.duration = duration;
  entries.push(entry);
  activeTimers.delete(name);

  if (loggingEnabled) {
    const metaStr = entry.metadata
      ? ` (${JSON.stringify(entry.metadata)})`
      : "";
    const color = duration > 1000 ? "color: red" : duration > 500 ? "color: orange" : "color: green";
    console.log(`%c[PERF] ${name}: ${duration.toFixed(2)}ms${metaStr}`, color);
  }

  return duration;
}

/**
 * Measure an async operation
 */
export async function perfMeasure<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  perfStart(name, metadata);
  try {
    return await fn();
  } finally {
    perfEnd(name);
  }
}

/**
 * Measure a sync operation
 */
export function perfMeasureSync<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, unknown>
): T {
  perfStart(name, metadata);
  try {
    return fn();
  } finally {
    perfEnd(name);
  }
}

/**
 * Get all recorded entries
 */
export function getPerfEntries(): PerfEntry[] {
  return [...entries];
}

/**
 * Get entries slower than threshold (ms)
 */
export function getSlowEntries(thresholdMs = 500): PerfEntry[] {
  return entries.filter((e) => (e.duration ?? 0) > thresholdMs);
}

/**
 * Clear all recorded entries
 */
export function clearPerfEntries(): void {
  entries.length = 0;
}

/**
 * Get summary stats for a specific operation type
 */
export function getPerfSummary(name: string): {
  count: number;
  avg: number;
  min: number;
  max: number;
} | null {
  const matching = entries.filter((e) => e.name === name && e.duration !== undefined);
  if (matching.length === 0) return null;

  const durations = matching.map((e) => e.duration!);
  return {
    count: matching.length,
    avg: durations.reduce((a, b) => a + b, 0) / durations.length,
    min: Math.min(...durations),
    max: Math.max(...durations),
  };
}
