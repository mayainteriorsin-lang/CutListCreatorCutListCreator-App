/**
 * PHASE 3: Laminate Memory Storage Service
 *
 * Extracted from settings.tsx to enforce boundary ownership.
 * Page layer should only compose UI; persistence lives here.
 */

const LAMINATE_MEMORY_KEY = "globalLaminateMemory_v1";

/**
 * Load laminate memory codes from localStorage
 */
export function loadLaminateMemory(): string[] {
  try {
    const stored = localStorage.getItem(LAMINATE_MEMORY_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {
    console.error("[LaminateMemoryStorage] Error loading:", err);
  }
  return [];
}

/**
 * Save laminate memory codes to localStorage
 */
export function saveLaminateMemory(codes: string[]): void {
  try {
    localStorage.setItem(LAMINATE_MEMORY_KEY, JSON.stringify(codes));
  } catch (err) {
    console.error("[LaminateMemoryStorage] Error saving:", err);
  }
}

/**
 * Add a laminate code to memory (deduplicates)
 */
export function addLaminateToMemory(code: string): string[] {
  const existing = loadLaminateMemory();
  if (!existing.includes(code)) {
    existing.push(code);
    saveLaminateMemory(existing);
  }
  return existing;
}
