import { jsPDF } from "jspdf";
import { PDF_MARGIN, toFiniteNumber, asciiSafe } from "./PDFUtils";
import { drawSheetHeader, drawSheetFooter, addNewPage } from "./PDFLayout";

// Import sub-engines
import {
  computeSheetScaling,
  transformPanel,
  parseAndValidatePanels,
} from "./sheets/ScalingEngine";
import {
  buildPanelSummary,
  drawPanelBox,
  drawSheetBorder,
  calculateSheetEfficiency,
} from "./sheets/PanelEngine";
import { drawGaddiMark } from "./sheets/GaddiEngine";
import { hasAnyGrainDirection, drawGrainIndicator } from "./sheets/GrainEngine";

// Panel list width on left side
const PANEL_LIST_WIDTH = 55;

/**
 * PDFSheets Orchestrator - SaaS Premium
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
 * Draw a single cutting sheet page with all panels - Premium Style
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

  // 2. Calculate efficiency
  const efficiency = calculateSheetEfficiency(panels, sheetW, sheetH);

  // 3. Draw header with efficiency badge
  const yPos = drawSheetHeader(doc, {
    brand,
    laminateDisplay,
    sheetW,
    sheetH,
    sheetKerf,
    efficiency,
    panelCount: panels.length,
  });

  // 4. Build panel summary and letter code map
  const panelSummary = buildPanelSummary(panels);
  const letterCodeMap = buildLetterCodeMap(panels);

  // 5. Calculate diagram area and scaling - with panel list on left
  const diagramStartY = yPos;
  const diagramEndY = pageH - margin - 14;

  const scaling = computeSheetScaling({
    sheetW,
    sheetH,
    pageW,
    pageH,
    margin,
    diagramStartY,
    diagramEndY,
    leftOffset: PANEL_LIST_WIDTH,
  });

  const { scale, scaledW, scaledH, offsetX, offsetY } = scaling;

  // 6. Draw panel list on left side with letter codes
  drawPanelList(doc, panels, margin, diagramStartY, PANEL_LIST_WIDTH, diagramEndY - diagramStartY, letterCodeMap);

  // 7. Draw sheet border using PanelEngine (white background)
  drawSheetBorder(doc, offsetX, offsetY, scaledW, scaledH);

  // 8. Draw each panel with letter code and kerf gap
  panels.forEach((panel: any) => {
    // Transform panel coordinates
    const transformed = transformPanel(panel, {
      offsetX,
      offsetY,
      scale,
      sheetH,
    });

    const { x, y, w, h } = transformed;

    // Get letter code for this panel
    const letterCode = getLetterCode(panel, letterCodeMap);

    // Draw panel box with letter code
    drawPanelBox(doc, x, y, w, h, panel, { panelSummary, useTypeColors: true, letterCode });

    // Draw GADDI mark if applicable
    const nomW = toFiniteNumber((panel as any).nomW, panel.w);
    const nomH = toFiniteNumber((panel as any).nomH, panel.h);
    drawGaddiMark(doc, x, y, w, h, panel, nomW, nomH, {
      inset: 2,
      lineWidth: 1.2,
      dashPattern: [2, 2],
      color: [220, 38, 38], // red-600
    });
  });

  // 9. Draw kerf lines between panels
  drawKerfLines(doc, panels, offsetX, offsetY, scale, sheetH, sheetKerf);

  // 10. Draw grain direction indicator if any panel has grain
  if (hasAnyGrainDirection(panels)) {
    drawGrainIndicator(doc, offsetX, offsetY, scaledH);
  }

  // 11. Draw footer with stats
  drawSheetFooter(doc, panels.length, currentPage, totalPages, efficiency);
}

/**
 * Draw white kerf gaps between panels to show cutting space
 */
function drawKerfLines(
  doc: jsPDF,
  panels: any[],
  offsetX: number,
  offsetY: number,
  scale: number,
  sheetH: number,
  kerf: number
): void {
  if (kerf <= 0 || panels.length < 2) return;

  const kerfScaled = kerf * scale;
  if (kerfScaled < 0.3) return; // Too small to show

  // Draw white rectangles for kerf gaps
  doc.setFillColor(255, 255, 255); // White
  doc.setDrawColor(255, 255, 255);

  panels.forEach((panel: any) => {
    const px = toFiniteNumber(panel.x);
    const py = toFiniteNumber(panel.y);
    const pw = toFiniteNumber(panel.w);
    const ph = toFiniteNumber(panel.h);

    // Transform to PDF coordinates
    const x1 = offsetX + px * scale;
    const y1 = offsetY + (sheetH - py - ph) * scale;
    const x2 = x1 + pw * scale;
    const y2 = y1 + ph * scale;

    const gapWidth = Math.max(1, kerfScaled);

    // Draw white gap on right edge (if not at sheet edge)
    if (px + pw < 2400) {
      doc.rect(x2, y1, gapWidth, y2 - y1, "F");
    }
    // Draw white gap on bottom edge (in PDF coords)
    if (py > 0) {
      doc.rect(x1, y2, x2 - x1, gapWidth, "F");
    }
  });

  // Reset
  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(255, 255, 255);
}

/**
 * Build letter code map for panels - assigns A, B, C... to each unique type+size
 */
function buildLetterCodeMap(panels: any[]): Map<string, string> {
  const codeMap = new Map<string, string>();
  let letterIndex = 0;

  panels.forEach((panel: any) => {
    const panelType = getPanelTypeName(panel);
    const nomW = toFiniteNumber((panel as any).nomW ?? panel.w);
    const nomH = toFiniteNumber((panel as any).nomH ?? panel.h);
    const key = `${panelType}-${Math.round(nomW)}x${Math.round(nomH)}`;

    if (!codeMap.has(key)) {
      codeMap.set(key, String.fromCharCode(65 + letterIndex)); // A, B, C...
      letterIndex++;
    }
  });

  return codeMap;
}

/**
 * Get letter code for a panel
 */
function getLetterCode(panel: any, codeMap: Map<string, string>): string {
  const panelType = getPanelTypeName(panel);
  const nomW = toFiniteNumber((panel as any).nomW ?? panel.w);
  const nomH = toFiniteNumber((panel as any).nomH ?? panel.h);
  const key = `${panelType}-${Math.round(nomW)}x${Math.round(nomH)}`;
  return codeMap.get(key) || "?";
}

/**
 * Draw panel list on left side of sheet with letter codes
 */
function drawPanelList(
  doc: jsPDF,
  panels: any[],
  startX: number,
  startY: number,
  width: number,
  maxHeight: number,
  codeMap: Map<string, string>
): void {
  if (panels.length === 0) return;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text("Panel List", startX, startY + 4);

  // Separator line
  doc.setLineWidth(0.3);
  doc.setDrawColor(150, 150, 150);
  doc.line(startX, startY + 6, startX + width - 5, startY + 6);

  let listY = startY + 12;
  const rowHeight = 10;

  // Group panels by type and size
  const panelGroups: { [key: string]: { type: string; w: number; h: number; count: number; code: string } } = {};

  panels.forEach((panel: any) => {
    const panelType = getPanelTypeName(panel);
    const nomW = toFiniteNumber((panel as any).nomW ?? panel.w);
    const nomH = toFiniteNumber((panel as any).nomH ?? panel.h);
    const key = `${panelType}-${Math.round(nomW)}x${Math.round(nomH)}`;

    if (!panelGroups[key]) {
      panelGroups[key] = {
        type: panelType,
        w: Math.round(nomW),
        h: Math.round(nomH),
        count: 0,
        code: codeMap.get(key) || "?"
      };
    }
    panelGroups[key].count++;
  });

  // Draw each panel group with letter code (no box)
  Object.values(panelGroups).forEach((group) => {
    if (listY + rowHeight > startY + maxHeight - 10) return; // Stop if no more space

    // Letter code - just bold text, no box
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(group.code, startX, listY);

    // Type name and dimensions
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(asciiSafe(group.type), startX + 8, listY - 1);

    // Dimensions - BOLD and BIGGER
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const dimText = `${group.w}x${group.h}`;
    const countText = group.count > 1 ? ` (${group.count})` : "";
    doc.text(dimText + countText, startX + 8, listY + 5);

    listY += rowHeight;
  });

  // Reset
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
}

/**
 * Get panel type name from panel
 */
function getPanelTypeName(panel: any): string {
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
