/**
 * PHASE 3: Spreadsheet Storage Service
 *
 * Extracted from spreadsheet.tsx to enforce boundary ownership.
 * Page layer should only compose UI; persistence lives here.
 */

const SPREADSHEET_KEY = "cutlist_spreadsheet_v1";
const TRANSFER_KEY = "spreadsheet_optimization_transfer";

export interface SpreadsheetRow {
  id: string;
  height?: string;
  width?: string;
  qty?: string;
  plywoodBrand?: string;
  frontLaminate?: string;
  innerLaminate?: string;
  panelType?: string;
  roomName?: string;
  cabinetName?: string;
}

export interface OptimizationTransfer {
  brandResults: any;
  panels: any[];
  sheetWidth: number;
  sheetHeight: number;
  kerf: number;
  timestamp: number;
}

/**
 * Load spreadsheet rows from localStorage
 */
export function loadSpreadsheetRows(): SpreadsheetRow[] {
  try {
    const stored = localStorage.getItem(SPREADSHEET_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {
    console.error("[SpreadsheetStorage] Error loading rows:", err);
  }
  return [];
}

/**
 * Save spreadsheet rows to localStorage
 */
export function saveSpreadsheetRows(rows: SpreadsheetRow[]): void {
  try {
    localStorage.setItem(SPREADSHEET_KEY, JSON.stringify(rows));
  } catch (err) {
    console.error("[SpreadsheetStorage] Error saving rows:", err);
  }
}

/**
 * Save optimization transfer data for cabinets module
 */
export function saveOptimizationTransfer(data: OptimizationTransfer): void {
  try {
    localStorage.setItem(TRANSFER_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("[SpreadsheetStorage] Error saving transfer:", err);
  }
}

/**
 * Load optimization transfer data
 */
export function loadOptimizationTransfer(): OptimizationTransfer | null {
  try {
    const stored = localStorage.getItem(TRANSFER_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error("[SpreadsheetStorage] Error loading transfer:", err);
  }
  return null;
}

/**
 * Clear optimization transfer data
 */
export function clearOptimizationTransfer(): void {
  try {
    localStorage.removeItem(TRANSFER_KEY);
  } catch (err) {
    console.error("[SpreadsheetStorage] Error clearing transfer:", err);
  }
}
