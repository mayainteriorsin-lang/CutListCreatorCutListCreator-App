/**
 * PreviewHelpers
 * - Page numbering
 * - Visible sheet filtering
 * - BrandResult flatten helpers
 * - Sorting
 *
 * NOTE TO CLAUDE:
 * Insert all non-UI preview helper functions that
 * currently live inside home.tsx or PreviewDialog.tsx.
 *
 * DO NOT modify logic -- only MOVE it.
 */

import { filterDeletedSheets } from "@/lib/preview/SheetFilters";

type SheetEntry = {
  sheet: any;
  sheetId: string;
  brand: string;
  laminateDisplay: string;
  isBackPanel: boolean;
  brandIndex: number;
  sheetIndex: number;
};

type PageMap = Record<string, number>;

function normalizeSheetId(sheet: any, brandIndex: number, sheetIndex: number) {
  const sheetId = sheet?._sheetId || `fallback-${brandIndex}-${sheetIndex}`;
  if (sheet && sheet._sheetId === sheetId) {
    return { sheet, sheetId };
  }
  return { sheet: { ...sheet, _sheetId: sheetId }, sheetId };
}

function flattenBrandResults(brandResults: any[]): SheetEntry[] {
  const entries: SheetEntry[] = [];
  brandResults.forEach((br, brandIndex) => {
    const sheets = br.result?.panels || [];
    sheets.forEach((sheet: any, sheetIndex: number) => {
      const normalized = normalizeSheetId(sheet, brandIndex, sheetIndex);
      entries.push({
        sheet: normalized.sheet,
        sheetId: normalized.sheetId,
        brand: br.brand,
        laminateDisplay: br.laminateDisplay,
        isBackPanel: br.isBackPanel,
        brandIndex,
        sheetIndex,
      });
    });
  });
  return entries;
}

function sortSheets(entries: SheetEntry[]): SheetEntry[] {
  return entries
    .slice()
    .sort((a, b) => a.brandIndex - b.brandIndex || a.sheetIndex - b.sheetIndex);
}

function filterEmptySheets(entries: SheetEntry[]): SheetEntry[] {
  return entries.filter((entry) => entry.sheet?.placed && entry.sheet.placed.length > 0);
}

function applySheetDeletion(
  entries: SheetEntry[],
  deletedSheets: Set<string>
): SheetEntry[] {
  return filterDeletedSheets(entries, deletedSheets) as SheetEntry[];
}

function buildPageMap(entries: SheetEntry[]): { totalPages: number; pageMap: PageMap } {
  const pageMap: PageMap = {};
  let pageNumber = 0;

  entries.forEach((entry) => {
    pageNumber += 1;
    pageMap[entry.sheetId] = pageNumber;
  });

  return { totalPages: pageNumber, pageMap };
}

export function getVisibleSheets(brandResults: any[], deletedSheets: Set<string>) {
  const flattened = flattenBrandResults(brandResults);
  const nonDeleted = applySheetDeletion(flattened, deletedSheets);
  return sortSheets(nonDeleted);
}

export function computePageCounts(brandResults: any[], deletedSheets: Set<string>) {
  const visibleSheets = getVisibleSheets(brandResults, deletedSheets);
  const nonEmptySheets = filterEmptySheets(visibleSheets);
  const { pageMap } = buildPageMap(visibleSheets);

  return {
    totalPages: nonEmptySheets.length,
    pageMap,
  };
}

export function mapSheetsToPages(brandResults: any[]) {
  const flattened = sortSheets(flattenBrandResults(brandResults));
  const { pageMap } = buildPageMap(flattened);
  return pageMap;
}
