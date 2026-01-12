/**
 * PATCH 29: PDF Export Pipeline Isolation
 * PATCH 48: Performance monitoring
 *
 * One entry point for PDF export.
 * No UI logic inside export.
 * No direct state reads inside PDF engine.
 * Preview & Export use the SAME pipeline.
 */

import { jsPDF } from "jspdf";
import { generateCutlistPDF } from "@/lib/pdf/PDFEngine";
import { perfStart, perfEnd } from "@/lib/perf";
import type { BrandResult } from "@shared/schema";

export interface ExportCutlistPDFInput {
  brandResults: BrandResult[];
  sheet: { w: number; h: number; kerf: number };
  cabinets: any[];
  materialSummary: {
    plywood: Record<string, number>;
    laminates: Record<string, number>;
    totalPlywoodSheets: number;
  };
  deletedSheets: Set<string>;
  orientation: "portrait" | "landscape";
  filename: string;
  // Optional metadata
  clientName?: string;
  roomNames?: string[];
}

export interface ExportCutlistPDFResult {
  pdf: jsPDF;
  filename: string;
}

/**
 * Generate and save a PDF file from the cutting list data.
 * This is the single entry point for PDF export.
 */
export function exportCutlistPDF(input: ExportCutlistPDFInput): void {
  perfStart("pdf:export", { sheets: input.brandResults?.length ?? 0 });

  const {
    brandResults,
    sheet,
    cabinets,
    materialSummary,
    deletedSheets,
    orientation,
    filename,
  } = input;

  const pdf = generateCutlistPDF({
    brandResults,
    sheet,
    cabinets,
    materialSummary,
    deletedSheets,
    orientationPreference: orientation,
    filename,
  });

  pdf.save(filename);
  perfEnd("pdf:export");
}

/**
 * Generate a PDF without saving (for programmatic use like API uploads).
 * Returns the jsPDF instance for further processing.
 */
export function generateCutlistPDFForUpload(
  input: ExportCutlistPDFInput
): ExportCutlistPDFResult {
  const {
    brandResults,
    sheet,
    cabinets,
    materialSummary,
    deletedSheets,
    orientation,
    filename,
  } = input;

  const pdf = generateCutlistPDF({
    brandResults,
    sheet,
    cabinets,
    materialSummary,
    deletedSheets,
    orientationPreference: orientation,
    filename,
  });

  return { pdf, filename };
}

/**
 * Generate a date-based filename for the PDF.
 */
export function generatePDFFilename(clientName?: string): string {
  const datePart = new Date().toISOString().slice(0, 10);
  if (clientName) {
    return `${clientName}-cutting-list-${datePart}.pdf`;
  }
  return `cutting-list-${datePart}.pdf`;
}
