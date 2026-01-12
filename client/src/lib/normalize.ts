/**
 * PATCH 10: Frontend Type Enforcement
 *
 * Ensures ALL frontend API responses are perfectly normalized,
 * even if backend sends wrong types, undefined, null, or broken JSON.
 *
 * Prevents:
 * - "Cannot read property 'map' of undefined"
 * - "Unexpected end of JSON input"
 * - Optimizer crashes
 * - Laminate/plywood dropdown crashes
 * - Preview/PDF crashes
 */

export function normString(v: any): string {
  return typeof v === "string" ? v.trim() : `${v ?? ""}`.trim();
}

export function normNumber(v: any): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

export function normBoolean(v: any): boolean {
  if (typeof v === 'string') {
    return v.toLowerCase() === 'true' || v === '1';
  }
  return Boolean(v);
}

export function normArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

export function normObject<T = any>(v: any): T {
  return (typeof v === "object" && v !== null) ? v : {} as T;
}

/**
 * Safe JSON parser - never throws, always returns object
 * Handles empty responses, broken JSON, network errors
 */
export async function safeJson(res: Response): Promise<any> {
  try {
    const text = await res.text();
    if (!text || text.trim() === '') return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}
