/**
 * PHASE 3: Settings Feature Module
 *
 * Boundary-clean exports for settings-related storage and API.
 */

export {
  loadSheetSettings,
  saveSheetSettings,
  resetSheetSettings,
  DEFAULT_SHEET_SETTINGS,
  type SheetSettings,
} from "./sheetSettingsStorage";

export {
  loadLaminateMemory,
  saveLaminateMemory,
  addLaminateToMemory,
} from "./laminateMemoryStorage";

export {
  fetchCatalogues,
  type Catalogue,
} from "./cataloguesApi";
