import { toFiniteNumber } from "../PDFUtils";

/**
 * ScalingEngine
 * Handles:
 * - Fit sheet to PDF viewport
 * - Compute scaleX / scaleY
 * - Compute offsets
 * - Transform panel coordinates
 */

export interface ScalingParams {
  sheetW: number;
  sheetH: number;
  pageW: number;
  pageH: number;
  margin: number;
  diagramStartY: number;
  diagramEndY: number;
  leftOffset?: number; // Optional offset for legend on left side
}

export interface ScalingResult {
  scale: number;
  scaledW: number;
  scaledH: number;
  offsetX: number;
  offsetY: number;
  diagramW: number;
  diagramH: number;
}

/**
 * Compute sheet-to-page scaling and offsets
 * Fits the sheet dimensions within the available diagram area
 */
export function computeSheetScaling(params: ScalingParams): ScalingResult {
  const { sheetW, sheetH, pageW, margin, diagramStartY, diagramEndY, leftOffset = 0 } = params;

  const diagramH = diagramEndY - diagramStartY;
  const diagramW = pageW - 2 * margin - leftOffset; // Account for legend on left

  // Calculate uniform scale to fit sheet in diagram area
  const scale = Math.min(diagramW / sheetW, diagramH / sheetH);
  const scaledW = sheetW * scale;
  const scaledH = sheetH * scale;

  // Position sheet to the right of the legend
  const offsetX = margin + leftOffset + (diagramW - scaledW) / 2;
  const offsetY = diagramStartY + (diagramH - scaledH) / 2;

  return {
    scale,
    scaledW,
    scaledH,
    offsetX,
    offsetY,
    diagramW,
    diagramH,
  };
}

export interface PanelTransformParams {
  offsetX: number;
  offsetY: number;
  scale: number;
  sheetH: number;
}

export interface TransformedPanel {
  x: number;
  y: number;
  w: number;
  h: number;
  originalPanel: any;
}

/**
 * Transform panel coordinates from sheet space to PDF page space
 * Handles Y-axis flip (sheet origin is bottom-left, PDF origin is top-left)
 */
export function transformPanel(
  panel: any,
  params: PanelTransformParams
): TransformedPanel {
  const { offsetX, offsetY, scale, sheetH } = params;

  const panelX = toFiniteNumber(panel?.x);
  const panelY = toFiniteNumber(panel?.y);
  const panelW = toFiniteNumber(panel?.w);
  const panelH = toFiniteNumber(panel?.h);

  // Transform coordinates:
  // - X: offset + panel.x * scale
  // - Y: offset + (sheetH - panel.y - panel.h) * scale (flip Y axis)
  const x = offsetX + panelX * scale;
  const y = offsetY + (sheetH - panelY - panelH) * scale;
  const w = panelW * scale;
  const h = panelH * scale;

  return {
    x,
    y,
    w,
    h,
    originalPanel: panel,
  };
}

/**
 * Validate and parse panel data, filtering out invalid panels
 */
export function parseAndValidatePanels(placedPanels: any[]): any[] {
  return (placedPanels || [])
    .map((panel: any) => {
      const x = toFiniteNumber(panel?.x);
      const y = toFiniteNumber(panel?.y);
      const w = toFiniteNumber(panel?.w);
      const h = toFiniteNumber(panel?.h);

      if (w <= 0 || h <= 0) return null;
      return { ...panel, x, y, w, h };
    })
    .filter(Boolean) as any[];
}
