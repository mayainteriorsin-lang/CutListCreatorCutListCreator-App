import { jsPDF } from "jspdf";
import { toFiniteNumber } from "./PDFUtils";
import { renderMaterialSummaryPage } from "./PDFSummary";
import { drawSheetPage } from "./PDFSheets";
import type { BrandResult } from "@shared/schema";

/**
 * Main PDF generation orchestrator.
 * Coordinates the submodules to generate the complete cutting list PDF.
 */
export function generateCutlistPDF({
  brandResults = [],
  sheet,
  plywoodTypes = [],
  laminateCodes = [],
  roomNames = [],
  filename = "cutting-list.pdf",
  orientationPreference = "portrait",
  deletedSheets = new Set(),
  cabinets = [],
  materialSummary,
}: {
  brandResults?: BrandResult[];
  sheet: { w: number; h: number; kerf: number };
  plywoodTypes?: string[];
  laminateCodes?: string[];
  roomNames?: string[];
  filename?: string;
  orientationPreference?: "portrait" | "landscape";
  deletedSheets?: Set<string>;
  cabinets?: any[];
  materialSummary?: {
    plywood: Record<string, number>;
    laminates: Record<string, number>;
    totalPlywoodSheets: number;
  };
}): jsPDF {
  const doc = new jsPDF({
    orientation: orientationPreference,
    unit: "mm",
    format: "a4",
  });

  // Parse sheet dimensions
  const sheetW = Math.max(1, toFiniteNumber(sheet?.w, 1210));
  const sheetH = Math.max(1, toFiniteNumber(sheet?.h, 2420));
  const sheetKerf = Math.max(0, toFiniteNumber(sheet?.kerf, 0));

  // Always show summary page if we have any cutting sheets (brandResults)
  const hasMaterialData = brandResults.length > 0;

  // Calculate total pages across all brand results, excluding deleted sheets
  let totalPages = hasMaterialData ? 1 : 0;
  brandResults.forEach((brandResult) => {
    const sheets = brandResult.result?.panels || [];
    sheets.forEach((s: any, idx: number) => {
      const sheetId =
        s._sheetId || `${brandResult.brand}|||${brandResult.laminateCode}-${idx}`;
      if (s.placed && s.placed.length > 0 && !deletedSheets.has(sheetId)) {
        totalPages++;
      }
    });
  });

  let currentPage = 0;

  // 1. Draw Material Summary page first (if we have brandResults)
  if (hasMaterialData) {
    currentPage++;
    renderMaterialSummaryPage({
      doc,
      materialSummary,
      cabinets,
      brandResults,
      roomNames,
      sheetW,
      sheetH,
      sheetKerf,
    });
  }

  // 2. Draw each brand's cutting sheets
  brandResults.forEach((brandResult) => {
    const sheets = brandResult.result?.panels || [];

    sheets.forEach((sheetData: any, idx: number) => {
      const sheetId =
        sheetData._sheetId ||
        `${brandResult.brand}|||${brandResult.laminateCode}-${idx}`;

      // Skip deleted sheets or sheets with no panels
      if (!sheetData.placed || sheetData.placed.length === 0) return;
      if (deletedSheets.has(sheetId)) return;

      currentPage++;
      const isFirstSheet = currentPage === 1;

      drawSheetPage(doc, sheetData, {
        brand: brandResult.brand,
        laminateDisplay: brandResult.laminateDisplay,
        isBackPanel: brandResult.isBackPanel,
        sheetW,
        sheetH,
        sheetKerf,
        currentPage,
        totalPages,
        isFirstSheet,
        hasMaterialSummary: !!hasMaterialData,
      });
    });
  });

  // Return the PDF document - caller decides to save or output
  return doc;
}
