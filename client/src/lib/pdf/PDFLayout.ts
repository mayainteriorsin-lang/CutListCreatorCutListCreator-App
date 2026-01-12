import { jsPDF } from "jspdf";
import { PDF_MARGIN, PDF_VERSION, COMPANY_NAME, getTodayDate, asciiSafe } from "./PDFUtils";

/**
 * Layout engine:
 * - drawSheetHeader() - header for cutting sheet pages
 * - drawSheetFooter() - footer with page numbers
 * - addNewPage() - page management
 */

export interface SheetHeaderOptions {
  brand: string;
  laminateDisplay: string;
  sheetW: number;
  sheetH: number;
  sheetKerf: number;
  efficiency?: number;
  panelCount?: number;
}

/** Draw header for a cutting sheet page - Clean Professional Design */
export function drawSheetHeader(
  doc: jsPDF,
  options: SheetHeaderOptions
): number {
  const { brand, laminateDisplay, sheetW, sheetH, sheetKerf, efficiency } = options;
  const pageW = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGIN;

  // Clean header line
  doc.setLineWidth(0.8);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, 12, pageW - margin, 12);

  // Company name (left)
  let yPos = 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(COMPANY_NAME, margin, yPos);

  // Date (right)
  const today = getTodayDate();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Date: ${today}`, pageW - margin, yPos, { align: "right" });

  yPos = 18;

  // Material info - Single row with pipe separators
  const safeBrand = asciiSafe(brand);
  const safeLaminateDisplay = laminateDisplay || "None";
  const parts = safeLaminateDisplay.split(" + ");
  const frontLaminate = asciiSafe(parts[0] || "None");
  const innerLaminate = asciiSafe(parts[1] || parts[0] || "None");

  // Build single row - ALL BOLD, BIGGER FONT
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);

  let xPos = margin;

  // Plywood
  doc.text("Plywood:", xPos, yPos);
  xPos += doc.getTextWidth("Plywood:") + 2;
  doc.text(safeBrand, xPos, yPos);
  xPos += doc.getTextWidth(safeBrand) + 3;
  doc.text("|", xPos, yPos);
  xPos += doc.getTextWidth("|") + 3;

  // Front
  doc.text("Front:", xPos, yPos);
  xPos += doc.getTextWidth("Front:") + 2;
  doc.text(frontLaminate, xPos, yPos);
  xPos += doc.getTextWidth(frontLaminate) + 3;
  doc.text("|", xPos, yPos);
  xPos += doc.getTextWidth("|") + 3;

  // Inner
  doc.text("Inner:", xPos, yPos);
  xPos += doc.getTextWidth("Inner:") + 2;
  doc.text(innerLaminate, xPos, yPos);
  xPos += doc.getTextWidth(innerLaminate) + 3;
  doc.text("|", xPos, yPos);
  xPos += doc.getTextWidth("|") + 3;

  // Sheet size
  const sheetSizeText = `${sheetW}x${sheetH}`;
  doc.text(sheetSizeText, xPos, yPos);
  xPos += doc.getTextWidth(sheetSizeText) + 3;
  doc.text("|", xPos, yPos);
  xPos += doc.getTextWidth("|") + 3;

  // Kerf
  const kerfText = `Kerf:${sheetKerf}`;
  doc.text(kerfText, xPos, yPos);

  yPos += 6;

  // Separator line
  doc.setLineWidth(0.3);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, yPos, pageW - margin, yPos);
  yPos += 4;

  // Reset colors
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  return yPos;
}

/** Draw footer for a cutting sheet page - Clean Design */
export function drawSheetFooter(
  doc: jsPDF,
  panelCount: number,
  currentPage: number,
  totalPages: number,
  efficiency?: number
): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN;
  const footerY = pageH - margin;

  // Top line
  doc.setLineWidth(0.3);
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, footerY - 8, pageW - margin, footerY - 8);

  // Panel count
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`Panels: ${panelCount}`, margin, footerY - 2);

  // Page number - centered
  doc.text(`Page ${currentPage} of ${totalPages}`, pageW / 2, footerY - 2, {
    align: "center",
  });

  // Version info
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(`v${PDF_VERSION}`, pageW - margin, footerY - 2, { align: "right" });

  // Reset
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
}

/** Add a new page to the PDF */
export function addNewPage(doc: jsPDF): void {
  doc.addPage();
}
