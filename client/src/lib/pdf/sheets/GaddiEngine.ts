import { jsPDF } from "jspdf";

/**
 * GaddiEngine
 * - Draws dotted GADDI lines
 * - Handles grain rules that affect GADDI
 * - Handles nomW / nomH based constraints
 *
 * GADDI marks indicate that a panel has a cavity/groove cut.
 * They are drawn as dotted red lines along either the top or left edge
 * to show where the cavity is located on the panel.
 */

export interface GaddiMarkOptions {
  inset?: number;
  lineWidth?: number;
  dashPattern?: number[];
  color?: number | [number, number, number];
}

/**
 * Get panel type from panel data
 */
function getPanelType(panel: any): string {
  const panelId = String(panel.id || "Panel").toUpperCase();

  if (panelId.includes("LEFT")) return "LEFT";
  if (panelId.includes("RIGHT")) return "RIGHT";
  if (panelId.includes("TOP")) return "TOP";
  if (panelId.includes("BOTTOM")) return "BOTTOM";
  if (panelId.includes("BACK")) return "BACK";
  if (panelId.includes("SHUTTER")) return "SHUTTER";

  return panel.id || "Panel";
}

/**
 * Parse color option to RGB tuple
 */
function parseColor(rawColor: number | [number, number, number] | undefined): [number, number, number] {
  if (Array.isArray(rawColor) && rawColor.length === 3) {
    return [
      Number.isFinite(rawColor[0]) ? rawColor[0] : 0,
      Number.isFinite(rawColor[1]) ? rawColor[1] : 0,
      Number.isFinite(rawColor[2]) ? rawColor[2] : 0,
    ];
  }
  if (typeof rawColor === "number" && Number.isFinite(rawColor)) {
    return [rawColor, rawColor, rawColor];
  }
  return [255, 0, 0]; // default RED gaddi mark
}

/**
 * Check if panel type is valid for gaddi marking
 */
function isValidGaddiPanelType(type: string): boolean {
  const isLeftRight = /LEFT|RIGHT/i.test(type);
  const isTopBottom = /TOP|BOTTOM/i.test(type);
  const isShutter = /SHUTTER/i.test(type);

  return isLeftRight || isTopBottom || isShutter;
}

/**
 * Draw GADDI mark on a panel
 * Draws a dotted line along the top or left edge to indicate cavity location
 */
export function drawGaddiMark(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  panel: any,
  nomW: number,
  nomH: number,
  options?: GaddiMarkOptions
): void {
  // Skip if gaddi not enabled
  if ((panel as any).gaddi !== true) return;

  // Skip if panel too small
  if (w <= 15 || h <= 15) return;

  const panelType = getPanelType(panel);

  // Must be a valid panel type for gaddi
  if (!isValidGaddiPanelType(panelType)) return;

  // Settings
  const inset = options?.inset ?? 2;
  const lineWidth = options?.lineWidth ?? 1.2;
  const dashPattern = options?.dashPattern ?? [2, 2];
  const color = parseColor(options?.color);

  // Determine direction: w >= h means horizontal, else vertical
  const isHorizontal = w >= h;

  // Calculate line coordinates
  let x1: number, y1: number, x2: number, y2: number;

  if (isHorizontal) {
    // Horizontal line at TOP edge
    x1 = x + inset;
    y1 = y + inset;
    x2 = x + w - inset;
    y2 = y + inset;
  } else {
    // Vertical line at LEFT edge
    x1 = x + inset;
    y1 = y + inset;
    x2 = x + inset;
    y2 = y + h - inset;
  }

  // Draw line
  doc.setLineWidth(lineWidth);
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineDash(dashPattern);

  doc.line(x1, y1, x2, y2);

  doc.setLineDash([]);

  // Draw label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(0, 0, 0);

  if (isHorizontal) {
    // Label below the horizontal line
    const labelX = x + inset + 6;
    const labelY = y + inset + 5;
    doc.text("GADDI", labelX, labelY);
  } else {
    // Label to the right of the vertical line, rotated
    const labelX = x + inset + 5;
    const labelY = y + inset + 6;
    doc.text("GADDI", labelX, labelY, { angle: 90 });
  }

  // Reset colors
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
}

/**
 * Calculate the gaddi line direction for a panel
 */
export function calculateGaddiLineDirection(
  gaddiEnabled: boolean,
  panelType: string,
  w: number,
  h: number
): "horizontal" | "vertical" | null {
  if (!gaddiEnabled) return null;

  if (!isValidGaddiPanelType(panelType)) return null;

  return w >= h ? "horizontal" : "vertical";
}

/**
 * Check if a panel should show gaddi marking
 */
export function shouldShowGaddiMarking(panel: any): boolean {
  return Boolean(panel?.gaddi);
}
