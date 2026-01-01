import { jsPDF } from "jspdf";
import {
  PDF_MARGIN,
  PDF_VERSION,
  COMPANY_NAME,
  asciiSafe,
  getTodayDate,
} from "./PDFUtils";

export interface MaterialSummaryData {
  plywood: Record<string, number>;
  laminates: Record<string, number>;
  totalPlywoodSheets: number;
}

export interface RenderMaterialSummaryOptions {
  doc: jsPDF;
  materialSummary: MaterialSummaryData;
  cabinets: any[];
  brandResults: any[];
  roomNames: string[];
  sheetW: number;
  sheetH: number;
  sheetKerf: number;
}

/**
 * Render the Material Summary page (first page of PDF)
 */
export function renderMaterialSummaryPage(
  options: RenderMaterialSummaryOptions
): void {
  const {
    doc,
    materialSummary,
    cabinets,
    brandResults,
    roomNames,
    sheetW,
    sheetH,
    sheetKerf,
  } = options;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN;
  const centerX = pageW / 2;
  let yPos = margin + 20;

  // Company Name - Centered
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text(COMPANY_NAME, centerX, yPos, { align: "center" });
  yPos += 10;

  // Title - Centered
  doc.setFontSize(16);
  doc.text("Material List", centerX, yPos, { align: "center" });
  yPos += 15;

  // Project Info (if available)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  if (cabinets && cabinets.length > 0 && (cabinets[0] as any).clientName) {
    doc.text(
      `Project: ${asciiSafe((cabinets[0] as any).clientName)}`,
      margin,
      yPos
    );
    yPos += 6;
  }

  if (roomNames && roomNames.length > 0) {
    doc.text(`Room: ${asciiSafe(roomNames.join(", "))}`, margin, yPos);
    yPos += 6;
  }

  const today = getTodayDate();
  doc.text(`Date: ${today}`, margin, yPos);
  yPos += 12;

  // Line separator
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageW - margin, yPos);
  yPos += 10;

  // Sheet Info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Sheet Size: ${sheetW} x ${sheetH} mm`, margin, yPos);
  yPos += 6;
  doc.text(`Kerf: ${sheetKerf} mm`, margin, yPos);
  yPos += 15;

  // Material Requirements Tables
  if (materialSummary) {
    const tableX = margin;
    const tableWidth = pageW - margin * 2;

    // 1. PLYWOOD SHEETS
    yPos = drawPlywoodTable(doc, materialSummary, tableX, tableWidth, yPos);

    // 2. LAMINATE SHEETS
    yPos = drawLaminateTable(doc, materialSummary, tableX, tableWidth, yPos);
  }

  // Separator line
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageW - margin, yPos);
  yPos += 10;

  // Summary Totals
  if (cabinets && cabinets.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Total Cabinets: ${cabinets.length}`, margin, yPos);
    yPos += 6;

    // Calculate total panels from brand results
    const totalPanelsCount = brandResults.reduce((sum, br) => {
      const panels = br.result?.panels || [];
      return (
        sum +
        panels.reduce(
          (pSum: number, sheet: any) => pSum + (sheet.placed?.length || 0),
          0
        )
      );
    }, 0);

    doc.text(`Total Panels: ${totalPanelsCount}`, margin, yPos);
  }

  // Footer with version and label
  const footerY = pageH - 5;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`v${PDF_VERSION}`, margin, footerY);

  // Summary label (bottom right) - NOT a page number
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Summary`, pageW - margin, footerY, { align: "right" });
}

/**
 * Draw the plywood table section
 */
function drawPlywoodTable(
  doc: jsPDF,
  materialSummary: MaterialSummaryData,
  tableX: number,
  tableWidth: number,
  yPos: number
): number {
  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setFillColor(217, 119, 6); // Amber-600
  doc.rect(tableX, yPos, tableWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(
    `PLYWOOD SHEETS - Total: ${materialSummary.totalPlywoodSheets}`,
    tableX + 3,
    yPos + 5.5
  );
  yPos += 8;

  // Plywood list
  if (Object.keys(materialSummary.plywood).length > 0) {
    // Table header
    doc.setFillColor(250, 250, 250);
    doc.rect(tableX, yPos, tableWidth, 7, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("#", tableX + 3, yPos + 4.5);
    doc.text("Plywood Brand", tableX + 12, yPos + 4.5);
    doc.text("Qty", tableX + tableWidth - 15, yPos + 4.5);
    yPos += 7;

    // Table rows (sorted by count descending)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    let rowNum = 1;
    Object.entries(materialSummary.plywood)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .forEach(([brand, count]) => {
        const fill = rowNum % 2 === 0 ? 255 : 250;
        doc.setFillColor(fill, fill, fill);
        doc.rect(tableX, yPos, tableWidth, 6, "F");
        doc.setTextColor(0, 0, 0);
        doc.text(`${rowNum}`, tableX + 3, yPos + 4);
        doc.text(asciiSafe(brand), tableX + 12, yPos + 4);
        doc.setFont("helvetica", "bold");
        doc.text(`${count}`, tableX + tableWidth - 15, yPos + 4);
        doc.setFont("helvetica", "normal");
        yPos += 6;
        rowNum++;
      });

    // Border around plywood table
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(
      tableX,
      yPos - (rowNum - 1) * 6 - 15,
      tableWidth,
      (rowNum - 1) * 6 + 15
    );
    yPos += 8;
  }

  return yPos;
}

/**
 * Draw the laminate table section
 */
function drawLaminateTable(
  doc: jsPDF,
  materialSummary: MaterialSummaryData,
  tableX: number,
  tableWidth: number,
  yPos: number
): number {
  if (Object.keys(materialSummary.laminates).length === 0) {
    return yPos;
  }

  const totalLaminates = Object.values(materialSummary.laminates).reduce(
    (sum: number, count) => sum + (count as number),
    0
  );

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(tableX, yPos, tableWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(`LAMINATE SHEETS - Total: ${totalLaminates}`, tableX + 3, yPos + 5.5);
  yPos += 8;

  // Table header
  doc.setFillColor(250, 250, 250);
  doc.rect(tableX, yPos, tableWidth, 7, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("#", tableX + 3, yPos + 4.5);
  doc.text("Laminate Code", tableX + 12, yPos + 4.5);
  doc.text("Qty", tableX + tableWidth - 15, yPos + 4.5);
  yPos += 7;

  // Table rows (sorted by count descending)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let rowNum = 1;
  Object.entries(materialSummary.laminates)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .forEach(([code, count]) => {
      const fill = rowNum % 2 === 0 ? 255 : 250;
      doc.setFillColor(fill, fill, fill);
      doc.rect(tableX, yPos, tableWidth, 6, "F");
      doc.setTextColor(0, 0, 0);
      doc.text(`${rowNum}`, tableX + 3, yPos + 4);
      doc.text(asciiSafe(code), tableX + 12, yPos + 4);
      doc.setFont("helvetica", "bold");
      doc.text(`${count}`, tableX + tableWidth - 15, yPos + 4);
      doc.setFont("helvetica", "normal");
      yPos += 6;
      rowNum++;
    });

  // Border around laminate table
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(
    tableX,
    yPos - (rowNum - 1) * 6 - 15,
    tableWidth,
    (rowNum - 1) * 6 + 15
  );
  yPos += 5;

  return yPos;
}
