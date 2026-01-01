import { jsPDF } from "jspdf";
import { PDF_MARGIN, toFiniteNumber } from "./PDFUtils";
import { drawSheetHeader, drawSheetFooter, addNewPage } from "./PDFLayout";

// Import sub-engines
import {
  computeSheetScaling,
  transformPanel,
  parseAndValidatePanels,
} from "./sheets/ScalingEngine";
import {
  buildPanelSummary,
  drawPanelLegend,
  drawPanelBox,
  drawSheetBorder,
} from "./sheets/PanelEngine";
import { drawGaddiMark } from "./sheets/GaddiEngine";
import { hasAnyGrainDirection, drawGrainIndicator } from "./sheets/GrainEngine";

/**
 * PDFSheets Orchestrator
 * Coordinates the sub-engines to render cutting sheets:
 * - ScalingEngine: sheet-to-page scaling and coordinate transforms
 * - PanelEngine: panel rectangles, labels, and legend
 * - GaddiEngine: GADDI dotted-line marks
 * - GrainEngine: grain direction indicators
 */

export interface DrawSheetOptions {
  brand: string;
  laminateDisplay: string;
  isBackPanel: boolean;
  sheetW: number;
  sheetH: number;
  sheetKerf: number;
  currentPage: number;
  totalPages: number;
  isFirstSheet: boolean;
  hasMaterialSummary: boolean;
}

/**
 * Draw a single cutting sheet page with all panels
 */
export function drawSheetPage(
  doc: jsPDF,
  sheetData: any,
  options: DrawSheetOptions
): void {
  const {
    brand,
    laminateDisplay,
    sheetW,
    sheetH,
    sheetKerf,
    currentPage,
    totalPages,
    isFirstSheet,
    hasMaterialSummary,
  } = options;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = PDF_MARGIN;

  // Add new page if needed
  if (!isFirstSheet || hasMaterialSummary) {
    addNewPage(doc);
  }

  // 1. Parse and validate panels using ScalingEngine
  const panels = parseAndValidatePanels(sheetData.placed || []);

  // 2. Draw header
  let yPos = drawSheetHeader(doc, {
    brand,
    laminateDisplay,
    sheetW,
    sheetH,
    sheetKerf,
  });

  // 3. Build panel summary and draw legend using PanelEngine
  const panelSummary = buildPanelSummary(panels);
  drawPanelLegend(doc, panelSummary, margin, yPos);
  yPos += 8;

  // 4. Calculate diagram area and scaling using ScalingEngine
  const diagramStartY = yPos;
  const diagramEndY = pageH - margin - 12;

  const scaling = computeSheetScaling({
    sheetW,
    sheetH,
    pageW,
    pageH,
    margin,
    diagramStartY,
    diagramEndY,
  });

  const { scale, scaledW, scaledH, offsetX, offsetY } = scaling;

  // 5. Draw sheet border using PanelEngine
  drawSheetBorder(doc, offsetX, offsetY, scaledW, scaledH);

  // 6. Draw each panel
  panels.forEach((panel: any) => {
    // Transform panel coordinates
    const transformed = transformPanel(panel, {
      offsetX,
      offsetY,
      scale,
      sheetH,
    });

    const { x, y, w, h } = transformed;

    // Draw panel box and labels
    drawPanelBox(doc, x, y, w, h, panel, { panelSummary });

    // Draw GADDI mark if applicable
    const nomW = toFiniteNumber((panel as any).nomW, panel.w);
    const nomH = toFiniteNumber((panel as any).nomH, panel.h);
    drawGaddiMark(doc, x, y, w, h, panel, nomW, nomH, {
      inset: 2,
      lineWidth: 1.2,
      dashPattern: [2, 2],
      color: [255, 0, 0],
    });
  });

  // 7. Draw grain direction indicator if any panel has grain
  if (hasAnyGrainDirection(panels)) {
    drawGrainIndicator(doc, offsetX, offsetY, scaledH);
  }

  // 8. Draw footer
  drawSheetFooter(doc, panels.length, currentPage, totalPages);
}
