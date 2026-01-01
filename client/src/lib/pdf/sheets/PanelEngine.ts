import { jsPDF } from "jspdf";
import { toFiniteNumber, asciiSafe } from "../PDFUtils";

/**
 * PanelEngine
 * Handles:
 * - Drawing panel rectangles
 * - Panel labels (name, dims)
 * - Bounding boxes
 * - Letter code assignment and rendering
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
 * Draw the panel legend on the PDF
 */
export function drawPanelLegend(
  doc: jsPDF,
  panelSummary: PanelSummary,
  startX: number,
  yPos: number
): void {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  let legendX = startX;
  const legendItems = Object.values(panelSummary);

  legendItems.forEach((item, index) => {
    const letterCode = String.fromCharCode(65 + index);
    const text = `${letterCode}:${item.width}x${item.height}(${item.count})`;
    doc.text(text, legendX, yPos + 4);
    legendX += doc.getTextWidth(text) + 5;
  });
}

export interface DrawPanelBoxOptions {
  panelSummary: PanelSummary;
}

/**
 * Get panel name from panel ID
 */
function getPanelName(panel: any): string {
  const panelId = String(panel.id || "Panel").toUpperCase();

  if (panelId.includes("LEFT")) return "LEFT";
  if (panelId.includes("RIGHT")) return "RIGHT";
  if (panelId.includes("TOP")) return "TOP";
  if (panelId.includes("BOTTOM")) return "BOTTOM";
  if (panelId.includes("BACK")) return "BACK";

  return panel.id || "Panel";
}

/**
 * Draw a single panel box with border, labels, and letter code
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
  const { panelSummary } = options;

  const nomW = toFiniteNumber((panel as any).nomW, panel.w);
  const nomH = toFiniteNumber((panel as any).nomH, panel.h);
  if (nomW <= 0 || nomH <= 0) return;

  const originalW = toFiniteNumber(panel.w);
  const originalH = toFiniteNumber(panel.h);

  // Draw panel border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.rect(x, y, w, h);

  // Get panel name
  const panelName = getPanelName(panel);

  // Draw dimension and name for larger panels
  if (originalW >= 200 && originalH >= 200) {
    const dimensionText = `${Math.round(nomW)}x${Math.round(nomH)}`;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);

    const dimensionFontSize = Math.max(8, Math.min(18, w / 12, h / 8));
    doc.setFontSize(dimensionFontSize);
    doc.text(dimensionText, x + w / 2, y + 10, {
      align: "center",
      baseline: "top",
    });

    const nameFontSize = Math.max(9, Math.min(16, w / 10, h / 6));
    doc.setFontSize(nameFontSize);
    doc.text(asciiSafe(panelName), x + w / 2, y + h - 3, {
      align: "center",
      baseline: "bottom",
    });
  }

  // Draw letter code (centered)
  const sizeKey = `${Math.round(nomW)}x${Math.round(nomH)}`;
  const letterCode = panelSummary[sizeKey]?.letterCode || "X";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(Math.max(6, Math.min(24, w / 3, h / 3)));
  doc.setTextColor(150, 150, 150);
  doc.text(letterCode, x + w / 2, y + h / 2, {
    align: "center",
    baseline: "middle",
  });
  doc.setTextColor(0, 0, 0);
}

/**
 * Draw the sheet border (outer rectangle)
 */
export function drawSheetBorder(
  doc: jsPDF,
  offsetX: number,
  offsetY: number,
  scaledW: number,
  scaledH: number
): void {
  doc.setLineWidth(1);
  doc.setDrawColor(0, 0, 0);
  doc.rect(offsetX, offsetY, scaledW, scaledH);
}
