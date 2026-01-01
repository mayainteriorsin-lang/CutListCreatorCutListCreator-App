import { jsPDF } from "jspdf";

/**
 * GrainEngine
 * - Draws wood-grain direction indicator
 * - Direction arrows
 * - Grain labels
 *
 * The grain indicator shows which direction the wood grain runs
 * for panels that have grain direction specified.
 */

/**
 * Check if any panel in the list has grain direction enabled
 */
export function hasAnyGrainDirection(panels: any[]): boolean {
  return panels.some(
    (p: any) =>
      p.grainDirection === true && p.laminateCode && p.laminateCode.trim() !== ""
  );
}

/**
 * Draw the grain direction indicator box
 * Shows an arrow pointing upward to indicate grain direction
 */
export function drawGrainIndicator(
  doc: jsPDF,
  offsetX: number,
  offsetY: number,
  scaledH: number
): void {
  const indicatorW = 25;
  const indicatorH = 30;
  const indicatorX = offsetX - indicatorW - 5;
  const indicatorY = offsetY + (scaledH - indicatorH) / 2;

  // Draw indicator box
  doc.setLineWidth(0.8);
  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(255, 255, 255);
  doc.rect(indicatorX, indicatorY, indicatorW, indicatorH, "FD");

  // Draw "Grain Direction" text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text("Grain", indicatorX + indicatorW / 2, indicatorY + 5, {
    align: "center",
  });
  doc.text("Direction", indicatorX + indicatorW / 2, indicatorY + 10, {
    align: "center",
  });

  // Draw arrow (pointing upward)
  const arrowX = indicatorX + indicatorW / 2;
  const arrowStartY = indicatorY + indicatorH - 4;
  const arrowEndY = indicatorY + 14;

  doc.setLineWidth(1.2);
  doc.setDrawColor(0, 0, 0);

  // Arrow shaft
  doc.line(arrowX, arrowStartY, arrowX, arrowEndY);

  // Arrow head
  const headSize = 3;
  doc.line(arrowX, arrowEndY, arrowX - headSize, arrowEndY + headSize);
  doc.line(arrowX, arrowEndY, arrowX + headSize, arrowEndY + headSize);

  // Reset colors
  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
}

/**
 * Draw grain direction arrow on a specific panel (if needed)
 * This can be used to show grain direction on individual panels
 */
export function drawPanelGrainArrow(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  panel: any
): void {
  // Only draw if grain direction is enabled and panel has laminate
  if (!panel.grainDirection || !panel.laminateCode || panel.laminateCode.trim() === "") {
    return;
  }

  // Skip if panel too small
  if (w < 20 || h < 20) return;

  // Draw small grain indicator in corner
  const arrowSize = Math.min(8, w / 6, h / 6);
  const arrowX = x + 5;
  const arrowStartY = y + h - 5;
  const arrowEndY = y + h - 5 - arrowSize;

  doc.setLineWidth(0.8);
  doc.setDrawColor(100, 100, 100);

  // Arrow shaft
  doc.line(arrowX, arrowStartY, arrowX, arrowEndY);

  // Arrow head
  const headSize = 2;
  doc.line(arrowX, arrowEndY, arrowX - headSize, arrowEndY + headSize);
  doc.line(arrowX, arrowEndY, arrowX + headSize, arrowEndY + headSize);

  // Reset
  doc.setDrawColor(0, 0, 0);
}
