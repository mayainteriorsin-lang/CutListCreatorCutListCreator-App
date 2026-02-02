/**
 * Storage Service
 * ---------------
 * Centralized localStorage abstraction for Production page.
 * All persistence logic goes through this service.
 */

// Storage keys - single source of truth
export const PRODUCTION_STORAGE_KEYS = {
  PLYWOOD: "production_last_plywood",
  FRONT_LAMINATE: "production_last_front_laminate",
  INNER_LAMINATE: "production_last_inner_laminate",
  PANEL_OVERRIDES: "production_panel_overrides",
  GADDI_SETTINGS: "production_gaddi_settings",
  DELETED_PANELS: "production_deleted_panels",
  UNIT_GAP_SETTINGS: "production_unit_gap_settings",
} as const;

export type ProductionStorageKey = keyof typeof PRODUCTION_STORAGE_KEYS;

/**
 * Get string value from localStorage
 */
export function getStoredString(key: string, fallback: string = ""): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Save string value to localStorage
 */
export function setStoredString(key: string, value: string): void {
  try {
    if (value) {
      localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get JSON value from localStorage
 */
export function getStoredJson<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Save JSON value to localStorage
 */
export function setStoredJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Remove item from localStorage
 */
export function removeStored(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear all production-related storage
 */
export function clearProductionStorage(): void {
  Object.values(PRODUCTION_STORAGE_KEYS).forEach(key => {
    removeStored(key);
  });
}

// ============================================================================
// Production-specific storage helpers
// ============================================================================

export interface ProductionMaterials {
  plywood: string;
  frontLaminate: string;
  innerLaminate: string;
}

export interface PanelOverride {
  width?: number;
  height?: number;
}

export type PanelOverrides = Record<string, PanelOverride>;
export type GaddiSettings = Record<string, boolean>;
export type UnitGapSettings = Record<string, number>;

/**
 * Load saved materials from storage
 */
export function loadSavedMaterials(defaults?: Partial<ProductionMaterials>): ProductionMaterials {
  return {
    plywood: getStoredString(PRODUCTION_STORAGE_KEYS.PLYWOOD, defaults?.plywood || "Century"),
    frontLaminate: getStoredString(PRODUCTION_STORAGE_KEYS.FRONT_LAMINATE, defaults?.frontLaminate || ""),
    innerLaminate: getStoredString(PRODUCTION_STORAGE_KEYS.INNER_LAMINATE, defaults?.innerLaminate || ""),
  };
}

/**
 * Save materials to storage
 */
export function saveMaterials(materials: Partial<ProductionMaterials>): void {
  if (materials.plywood !== undefined) {
    setStoredString(PRODUCTION_STORAGE_KEYS.PLYWOOD, materials.plywood);
  }
  if (materials.frontLaminate !== undefined) {
    setStoredString(PRODUCTION_STORAGE_KEYS.FRONT_LAMINATE, materials.frontLaminate);
  }
  if (materials.innerLaminate !== undefined) {
    setStoredString(PRODUCTION_STORAGE_KEYS.INNER_LAMINATE, materials.innerLaminate);
  }
}

/**
 * Load panel overrides from storage
 */
export function loadPanelOverrides(): PanelOverrides {
  return getStoredJson<PanelOverrides>(PRODUCTION_STORAGE_KEYS.PANEL_OVERRIDES, {});
}

/**
 * Save panel overrides to storage
 */
export function savePanelOverrides(overrides: PanelOverrides): void {
  setStoredJson(PRODUCTION_STORAGE_KEYS.PANEL_OVERRIDES, overrides);
}

/**
 * Load gaddi settings from storage
 */
export function loadGaddiSettings(): GaddiSettings {
  return getStoredJson<GaddiSettings>(PRODUCTION_STORAGE_KEYS.GADDI_SETTINGS, {});
}

/**
 * Save gaddi settings to storage
 */
export function saveGaddiSettings(settings: GaddiSettings): void {
  setStoredJson(PRODUCTION_STORAGE_KEYS.GADDI_SETTINGS, settings);
}

/**
 * Load deleted panels from storage
 */
export function loadDeletedPanels(): Set<string> {
  const arr = getStoredJson<string[]>(PRODUCTION_STORAGE_KEYS.DELETED_PANELS, []);
  return new Set(arr);
}

/**
 * Save deleted panels to storage
 */
export function saveDeletedPanels(deleted: Set<string>): void {
  setStoredJson(PRODUCTION_STORAGE_KEYS.DELETED_PANELS, Array.from(deleted));
}

/**
 * Load unit gap settings from storage
 */
export function loadUnitGapSettings(): UnitGapSettings {
  return getStoredJson<UnitGapSettings>(PRODUCTION_STORAGE_KEYS.UNIT_GAP_SETTINGS, {});
}

/**
 * Save unit gap settings to storage
 */
export function saveUnitGapSettings(settings: UnitGapSettings): void {
  setStoredJson(PRODUCTION_STORAGE_KEYS.UNIT_GAP_SETTINGS, settings);
}
