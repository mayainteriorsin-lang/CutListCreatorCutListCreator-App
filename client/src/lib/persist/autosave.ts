/**
 * PATCH 24: Autosave & Recovery Utility
 *
 * LocalStorage-first autosave for cabinets and panels.
 * Works offline, no backend required.
 */

const KEY = "cutlist-autosave-v1";

export interface AutosavePayload {
  cabinets: unknown[];
  panels: unknown[];
  timestamp: number;
}

/**
 * Save data to localStorage.
 * Silently fails if localStorage is unavailable or full.
 */
export function saveAutosave(data: AutosavePayload): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Autosave failed:", e);
  }
}

/**
 * Load autosaved data from localStorage.
 * Returns null if no valid data exists.
 */
export function loadAutosave(): AutosavePayload | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      !Array.isArray(parsed.cabinets) ||
      !Array.isArray(parsed.panels)
    ) {
      return null;
    }

    return parsed as AutosavePayload;
  } catch {
    return null;
  }
}

/**
 * Clear autosaved data from localStorage.
 */
export function clearAutosave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Check if autosave data exists.
 */
export function hasAutosave(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}
