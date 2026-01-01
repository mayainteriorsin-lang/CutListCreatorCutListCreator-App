import { jsPDF } from "jspdf";
import { PDF_MARGIN, PDF_VERSION, COMPANY_NAME, getTodayDate } from "./PDFUtils";

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
}

/** Draw header for a cutting sheet page */
export function drawSheetHeader(
  doc: jsPDF,
  options: SheetHeaderOptions
): number {
  const { brand, laminateDisplay, sheetW, sheetH, sheetKerf } = options;
  const pageW = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGIN;

  // Row 1: Company name (centered)
  let yPos = margin + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(COMPANY_NAME, pageW / 2, yPos, { align: "center" });

  // Row 2: Date (right aligned)
  const today = getTodayDate();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Date: ${today}`, pageW - margin, yPos, { align: "right" });

  yPos += 8;

  // Row 3: Material info - THREE columns
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);

  // Safe ASCII for brand
  const safeBrand = brand
    .normalize("NFKD")
    .replace(/×/g, "x")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
  doc.text(`Plywood: ${safeBrand}`, margin, yPos);

  const safeLaminateDisplay = laminateDisplay || "None";
  const parts = safeLaminateDisplay.split(" + ");
  const frontLaminate = parts[0] || "None";
  const innerLaminate = parts[1] || parts[0] || "None";

  // Safe ASCII for front laminate
  const safeFront = frontLaminate
    .normalize("NFKD")
    .replace(/×/g, "x")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
  doc.text(`Front: ${safeFront}`, pageW / 2, yPos, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Sheet: ${sheetW}x${sheetH} mm`, pageW - margin, yPos, {
    align: "right",
  });

  yPos += 6;

  // Row 4: Inner laminate (left) | Kerf (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);

  // Safe ASCII for inner laminate
  const safeInner = innerLaminate
    .normalize("NFKD")
    .replace(/×/g, "x")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
  doc.text(`Inner: ${safeInner}`, margin, yPos);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Kerf: ${sheetKerf} mm`, pageW - margin, yPos, { align: "right" });

  yPos += 4;

  // Separator line
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageW - margin, yPos);
  yPos += 3;

  return yPos;
}

/** Draw footer for a cutting sheet page */
export function drawSheetFooter(
  doc: jsPDF,
  panelCount: number,
  currentPage: number,
  totalPages: number
): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN;
  const footerY = pageH - margin;

  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 6, pageW - margin, footerY - 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Panels: ${panelCount}`, margin, footerY - 1);
  doc.text(`Page ${currentPage} of ${totalPages}`, pageW / 2, footerY - 1, {
    align: "center",
  });

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`v${PDF_VERSION}`, pageW - margin, footerY - 1, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

/** Add a new page to the PDF */
export function addNewPage(doc: jsPDF): void {
  doc.addPage();
}
