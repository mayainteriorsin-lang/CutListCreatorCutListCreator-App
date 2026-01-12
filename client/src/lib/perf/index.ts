/**
 * PATCH 48: Performance Monitoring - Public API
 */

export {
  perfStart,
  perfEnd,
  perfMeasure,
  perfMeasureSync,
  getPerfEntries,
  getSlowEntries,
  clearPerfEntries,
  getPerfSummary,
  enablePerfLogging,
} from "./PerfMonitor";

export type { PerfEntry } from "./PerfMonitor";
