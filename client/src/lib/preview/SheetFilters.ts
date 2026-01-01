/**
 * SheetFilters
 * - Applies deleted sheet filtering
 * - Applies deleted panel filtering
 * - Cleaned sheet objects for preview
 *
 * NOTE TO CLAUDE:
 * Move these exact helper functions from home.tsx:
 *
 *  - Non-deleted sheets filtering
 *  - Non-deleted panels filtering
 *  - sheet._sheetId normalization
 */

function getSheetId(item: any): string | undefined {
  return item?._sheetId ?? item?.sheetId ?? item?.sheet?._sheetId;
}

function normalizeSheetId(sheet: any, index: number) {
  const sheetId = getSheetId(sheet);
  if (sheetId) return sheet;

  const fallbackId = `fallback-${index}`;
  if (sheet && typeof sheet === "object") {
    return { ...sheet, _sheetId: fallbackId };
  }
  return { _sheetId: fallbackId };
}

export function filterDeletedSheets(sheets: any[], deletedSheets: Set<string>) {
  if (!Array.isArray(sheets)) return [];

  return sheets
    .map((sheet, index) => normalizeSheetId(sheet, index))
    .filter((sheet) => {
      const sheetId = getSheetId(sheet);
      return sheetId ? !deletedSheets.has(sheetId) : true;
    });
}

export function filterDeletedPanels(sheet: any, deletedPanels: Set<string>) {
  if (!sheet || !sheet.placed || !deletedPanels || deletedPanels.size === 0) {
    return sheet;
  }

  const sheetId = getSheetId(sheet);
  if (!sheetId) return sheet;

  const placed = sheet.placed.filter((panel: any) => {
    return !deletedPanels.has(`${sheetId}-${panel.id}`);
  });

  if (placed.length === sheet.placed.length) return sheet;
  return { ...sheet, placed };
}
