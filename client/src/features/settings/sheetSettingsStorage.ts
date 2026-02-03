/**
 * PHASE 3: Sheet Settings Storage Service
 *
 * Extracted from settings.tsx to enforce boundary ownership.
 * Page layer should only compose UI; persistence lives here.
 */

const SHEET_SETTINGS_KEY = "cutlist_sheet_settings_v1";

export interface SheetSettings {
  sheetWidth: number;
  sheetHeight: number;
  kerf: number;
}

const DEFAULT_SHEET_SETTINGS: SheetSettings = {
  sheetWidth: 1210,
  sheetHeight: 2420,
  kerf: 5,
};

/**
 * Load sheet settings from localStorage
 */
export function loadSheetSettings(): SheetSettings {
  try {
    const stored = localStorage.getItem(SHEET_SETTINGS_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        sheetWidth: data.sheetWidth ?? DEFAULT_SHEET_SETTINGS.sheetWidth,
        sheetHeight: data.sheetHeight ?? DEFAULT_SHEET_SETTINGS.sheetHeight,
        kerf: data.kerf ?? DEFAULT_SHEET_SETTINGS.kerf,
      };
    }
  } catch (err) {
    console.error("[SheetSettingsStorage] Error loading:", err);
  }
  return { ...DEFAULT_SHEET_SETTINGS };
}

/**
 * Save sheet settings to localStorage
 */
export function saveSheetSettings(settings: SheetSettings): void {
  try {
    localStorage.setItem(SHEET_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error("[SheetSettingsStorage] Error saving:", err);
  }
}

/**
 * Reset sheet settings to defaults
 */
export function resetSheetSettings(): SheetSettings {
  saveSheetSettings(DEFAULT_SHEET_SETTINGS);
  return { ...DEFAULT_SHEET_SETTINGS };
}

export { DEFAULT_SHEET_SETTINGS };
