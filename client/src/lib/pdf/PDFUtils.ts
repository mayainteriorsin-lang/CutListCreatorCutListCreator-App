/**
 * Shared PDF constants, font sizes, colors, helpers.
 */

// Version tracking - Update this to force cache refresh
export const PDF_VERSION = "2025-12-31-FINAL";

// Layout constants
export const PDF_MARGIN = 10;
export const PDF_FONT = "helvetica";
export const PDF_FONT_SIZE = 10;

// Company name
export const COMPANY_NAME = "Maya Interiors";

/** Safe ASCII text (avoid garbled PDF text) */
export function asciiSafe(str: string | undefined | null): string {
  if (!str) return "";
  return String(str)
    .normalize("NFKD")
    .replace(/×/g, "x")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

/** Convert any value to a finite number with fallback */
export function toFiniteNumber(value: any, fallback = 0): number {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/** Get today's date in ISO format (YYYY-MM-DD) */
export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}
