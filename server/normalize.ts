/**
 * PATCH 9: API Type Normalization Utilities
 *
 * Ensures ALL backend JSON responses contain correct fields and types:
 * - No undefined
 * - No null
 * - No missing fields
 * - No wrong types
 */

export function normString(v: unknown): string {
  return (typeof v === "string" ? v : `${v ?? ""}`).trim();
}

export function normNumber(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

export function normBoolean(v: unknown): boolean {
  if (typeof v === 'string') {
    return v.toLowerCase() === 'true' || v === '1';
  }
  return Boolean(v);
}

export function normArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? v : [];
}

export function normDate(v: unknown): Date {
  if (!v) return new Date();
  const d = new Date(v as string | number | Date);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function normDateISO(v: unknown): string {
  return normDate(v).toISOString();
}

export function sanitizeFilename(name: string): string {
  return (name || '').replace(/[^a-zA-Z0-9.-]/g, '_');
}
