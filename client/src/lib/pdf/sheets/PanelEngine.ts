import { jsPDF } from "jspdf";
import { toFiniteNumber, asciiSafe } from "../PDFUtils";

/**
 * PanelEngine - Clean Professional Design
 * Handles:
 * - Drawing panel rectangles with clean borders
 * - Panel labels (name, dims) with clear typography
 * - Letter code assignment and rendering
 * - Print-friendly design (no colors)
 */

export interface PanelSummaryItem {
  letterCode: string;
  width: number;
  height: number;
  count: number;
}

export type PanelSummary = { [sizeKey: string]: PanelSummaryItem };

/**
 * Build panel size legend/summary
 * Groups panels by size and assigns letter codes
 */
export function buildPanelSummary(panels: any[]): PanelSummary {
  const panelSummary: PanelSummary = {};
  let uniqueSizeIndex = 0;

  panels.forEach((panel: any) => {
    const nomW = toFiniteNumber((panel as any).nomW ?? panel.w);
    const nomH = toFiniteNumber((panel as any).nomH ?? panel.h);
    if (nomW <= 0 || nomH <= 0) return;

    const sizeKey = `${Math.round(nomW)}x${Math.round(nomH)}`;

    if (!panelSummary[sizeKey]) {
      panelSummary[sizeKey] = {
        letterCode: String.fromCharCode(65 + uniqueSizeIndex),
        width: Math.round(nomW),
        height: Math.round(nomH),
        count: 0,
      };
      uniqueSizeIndex++;
    }
    panelSummary[sizeKey].count++;
  });

  return panelSummary;
}

/**
 * Draw the panel legend on the PDF - Vertical layout on left side
 * Returns the height used by the legend
 */
export function drawPanelLegend(
  doc: jsPDF,
  panelSummary: PanelSummary,
  startX: number,
  yPos: number
): number {
  const legendItems = Object.values(panelSummary);
  if (legendItems.length === 0) return 0;

  // Legend header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text("Legend:", startX, yPos + 5);

  let legendY = yPos + 10;
  const rowHeight = 8;

  legendItems.forEach((item, index) => {
    const letterCode = String.fromCharCode(65 + index);

    // Letter code in simple box
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(startX, legendY, 7, 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(0, 0, 0);
    doc.text(letterCode, startX + 3.5, legendY + 5, { align: "center" });

    // Dimension text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const dimText = `${item.width}x${item.height}`;
    doc.text(dimText, startX + 10, legendY + 5);

    // Count in parentheses
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    const countText = `(${item.count})`;
    const dimWidth = doc.getTextWidth(dimText);
    doc.text(countText, startX + 10 + dimWidth + 2, legendY + 5);

    legendY += rowHeight;
  });

  // Reset colors
  doc.setTextColor(0, 0, 0);

  // Return total height used by legend
  return legendItems.length * rowHeight + 10;
}

export interface DrawPanelBoxOptions {
  panelSummary: PanelSummary;
  useTypeColors?: boolean;
  letterCode?: string;
}

/**
 * Get panel name from panel ID
 */
function getPanelName(panel: any): string {
  const panelId = String(panel.id || panel.type || panel.name || "Panel").toUpperCase();

  if (panelId.includes("LEFT")) return "LEFT";
  if (panelId.includes("RIGHT")) return "RIGHT";
  if (panelId.includes("TOP")) return "TOP";
  if (panelId.includes("BOTTOM")) return "BOTTOM";
  if (panelId.includes("BACK")) return "BACK";
  if (panelId.includes("SHELF")) return "SHELF";
  if (panelId.includes("SHUTTER")) return "SHUTTER";

  return panel.type || panel.name || panel.id || "Panel";
}

/**
 * Draw a single panel box - Simple clean style like preview
 * Shows: Letter code in corner, Type name centered, dimensions below
 */
export function drawPanelBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  panel: any,
  options: DrawPanelBoxOptions
): void {
  const nomW = toFiniteNumber((panel as any).nomW, panel.w);
  const nomH = toFiniteNumber((panel as any).nomH, panel.h);
  if (nomW <= 0 || nomH <= 0) return;

  const letterCode = options.letterCode || "";

  // Panel background - white fill
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, w, h, "F");

  // Panel border - light gray line
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.rect(x, y, w, h);

  // Get panel type name
  const panelType = getPanelName(panel);
  const dimensionText = `${Math.round(nomW)} x ${Math.round(nomH)}`;

  // Calculate font sizes based on panel size
  const minDim = Math.min(w, h);

  if (minDim >= 35) {
    // Large enough to show letter code and dimension
    const codeFontSize = Math.max(12, Math.min(20, minDim / 3));
    const dimFontSize = Math.max(7, Math.min(11, minDim / 5));

    // Letter code - CENTERED, BOLD, PROMINENT
    if (letterCode) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(codeFontSize);
      doc.setTextColor(0, 0, 0);
      doc.text(letterCode, x + w / 2, y + h / 2 - 4, {
        align: "center",
        baseline: "middle",
      });
    }

    // Dimension - below letter code
    doc.setFont("helvetica", "bold");
    doc.setFontSize(dimFontSize);
    doc.setTextColor(0, 0, 0);
    doc.text(dimensionText, x + w / 2, y + h / 2 + codeFontSize / 2, {
      align: "center",
      baseline: "middle",
    });
  } else if (minDim >= 18) {
    // Small - letter code and dimension
    const codeFontSize = Math.max(8, Math.min(12, minDim / 2));
    const dimFontSize = Math.max(5, Math.min(7, minDim / 4));

    if (letterCode) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(codeFontSize);
      doc.setTextColor(0, 0, 0);
      doc.text(letterCode, x + w / 2, y + h / 2 - 2, {
        align: "center",
        baseline: "middle",
      });
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(dimFontSize);
    doc.text(dimensionText, x + w / 2, y + h / 2 + codeFontSize / 2 - 1, {
      align: "center",
      baseline: "middle",
    });
  }
  // Very small panels - no text (just the box)

  // Reset colors
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
}

/**
 * Draw the sheet border (outer rectangle) - Clean Professional Style
 */
export function drawSheetBorder(
  doc: jsPDF,
  offsetX: number,
  offsetY: number,
  scaledW: number,
  scaledH: number
): void {
  // Sheet background - white
  doc.setFillColor(255, 255, 255);
  doc.rect(offsetX, offsetY, scaledW, scaledH, "F");

  // Main border - light gray line
  doc.setLineWidth(1);
  doc.setDrawColor(150, 150, 150);
  doc.rect(offsetX, offsetY, scaledW, scaledH);
}

/**
 * Calculate sheet efficiency
 */
export function calculateSheetEfficiency(panels: any[], sheetW: number, sheetH: number): number {
  const totalArea = sheetW * sheetH;
  const usedArea = panels.reduce((sum, p) => {
    const w = toFiniteNumber(p.w);
    const h = toFiniteNumber(p.h);
    return sum + (w * h);
  }, 0);
  return Math.round((usedArea / totalArea) * 100);
}
