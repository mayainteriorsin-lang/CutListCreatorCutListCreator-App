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

export interface EdgeBandData {
  laminateCode: string;
  meters: number;
}

export interface PanelTypeData {
  type: string;
  count: number;
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

// Clean 3-Color Palette: Light Blue, Green, Gray
const COLORS = {
  // Primary - Light Blue
  primary: [96, 165, 250] as [number, number, number],      // Blue 400 (lighter)
  primaryLight: [239, 246, 255] as [number, number, number], // Blue 50 (very light)

  // Secondary - Green
  secondary: [34, 197, 94] as [number, number, number],    // Green 500
  secondaryLight: [220, 252, 231] as [number, number, number], // Green 100

  // Neutral grays
  black: [17, 24, 39] as [number, number, number],
  darkGray: [55, 65, 81] as [number, number, number],
  mediumGray: [107, 114, 128] as [number, number, number],
  lightGray: [209, 213, 219] as [number, number, number],
  veryLightGray: [243, 244, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

/**
 * Render the Material Summary page - Clean 3-Color Design
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

  // ═══════════════════════════════════════════════════════════════
  // HEADER SECTION - Blue header
  // ═══════════════════════════════════════════════════════════════

  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageW, 24, "F");

  // Company Name - Large Bold White
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.white);
  doc.text(COMPANY_NAME, margin, 15);

  // Date
  const today = getTodayDate();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(220, 220, 220);
  doc.text(today, pageW - margin, 15, { align: "right" });

  let yPos = 32;

  // ═══════════════════════════════════════════════════════════════
  // PROJECT INFO SECTION
  // ═══════════════════════════════════════════════════════════════

  const clientName = cabinets.length > 0 ? (cabinets[0] as any).clientName : null;

  if (clientName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.black);
    doc.text(asciiSafe(clientName), margin, yPos);
    yPos += 6;
  }

  if (roomNames && roomNames.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.darkGray);
    doc.text(roomNames.map(r => asciiSafe(r)).join(" | "), margin, yPos);
    yPos += 7;
  }

  // Title with blue accent line
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.black);
  doc.text("MATERIAL SUMMARY", margin, yPos);

  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(2.5);
  doc.line(margin, yPos + 2, margin + 55, yPos + 2);

  yPos += 10;

  // ═══════════════════════════════════════════════════════════════
  // STATS CARDS ROW - All Blue theme
  // ═══════════════════════════════════════════════════════════════

  const effectiveSummary = (materialSummary && (materialSummary.totalPlywoodSheets > 0 || Object.keys(materialSummary.plywood || {}).length > 0))
    ? materialSummary
    : calculateMaterialSummaryFromBrandResults(brandResults);

  const totalPanels = brandResults.reduce((sum, br) => {
    const panels = br.result?.panels || [];
    return sum + panels.reduce((pSum: number, sheet: any) => pSum + (sheet.placed?.length || 0), 0);
  }, 0);

  // Calculate efficiency
  let totalUsedArea = 0;
  let totalSheetArea = 0;
  brandResults.forEach((br) => {
    const panels = br.result?.panels || [];
    panels.forEach((sheet: any) => {
      totalSheetArea += sheetW * sheetH;
      (sheet.placed || []).forEach((p: any) => {
        totalUsedArea += (p.w || 0) * (p.h || 0);
      });
    });
  });
  const avgEfficiency = totalSheetArea > 0 ? Math.round((totalUsedArea / totalSheetArea) * 100) : 0;

  const statsY = yPos;
  const cardH = 20;
  const cardSpacing = 3;
  const stats = [
    { label: "Sheets", value: `${effectiveSummary.totalPlywoodSheets}` },
    { label: "Panels", value: `${totalPanels}` },
    { label: "Cabinets", value: `${cabinets.length}` },
    { label: "Efficiency", value: `${avgEfficiency}%` },
    { label: "Sheet", value: `${sheetW}x${sheetH}` },
  ];

  const totalCardWidth = pageW - margin * 2;
  const cardWidth = (totalCardWidth - (stats.length - 1) * cardSpacing) / stats.length;

  stats.forEach((stat, idx) => {
    const cardX = margin + idx * (cardWidth + cardSpacing);

    // Card background
    doc.setFillColor(...COLORS.white);
    doc.roundedRect(cardX, statsY, cardWidth, cardH, 2, 2, "F");

    // Card border - Blue
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(1.2);
    doc.roundedRect(cardX, statsY, cardWidth, cardH, 2, 2, "S");

    // Top accent line - Blue
    doc.setFillColor(...COLORS.primary);
    doc.rect(cardX, statsY, cardWidth, 3, "F");

    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.mediumGray);
    doc.text(stat.label, cardX + cardWidth / 2, statsY + 8, { align: "center" });

    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.black);
    doc.text(stat.value, cardX + cardWidth / 2, statsY + 17, { align: "center" });
  });

  yPos = statsY + cardH + 10;

  // ═══════════════════════════════════════════════════════════════
  // TWO COLUMN LAYOUT - Blue for materials, Green for breakdown
  // ═══════════════════════════════════════════════════════════════

  const tableWidth = (pageW - margin * 2 - 8) / 2;
  const leftX = margin;
  const rightX = margin + tableWidth + 8;

  let leftY = yPos;
  let rightY = yPos;

  // LEFT COLUMN - Blue theme (Materials)
  leftY = drawColoredTable(doc, {
    title: "PLYWOOD",
    subtitle: `${effectiveSummary.totalPlywoodSheets} sheets`,
    data: Object.entries(effectiveSummary.plywood).sort(([, a], [, b]) => (b as number) - (a as number)).map(([k, v]) => ({ label: k, value: `${v}` })),
    x: leftX,
    width: tableWidth,
    y: leftY,
    bgColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  });

  leftY = drawColoredTable(doc, {
    title: "LAMINATE",
    subtitle: `${Object.values(effectiveSummary.laminates).reduce((s: number, c) => s + (c as number), 0)} sheets`,
    data: Object.entries(effectiveSummary.laminates).sort(([, a], [, b]) => (b as number) - (a as number)).map(([k, v]) => ({ label: k, value: `${v}` })),
    x: leftX,
    width: tableWidth,
    y: leftY,
    bgColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  });

  const edgeBandData = calculateEdgeBand(brandResults);
  const totalMeters = edgeBandData.reduce((sum, eb) => sum + eb.meters, 0);
  leftY = drawColoredTable(doc, {
    title: "EDGE BAND",
    subtitle: `${totalMeters.toFixed(1)}m total`,
    data: edgeBandData.map(eb => ({ label: eb.laminateCode, value: `${eb.meters.toFixed(1)}m` })),
    x: leftX,
    width: tableWidth,
    y: leftY,
    bgColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  });

  // RIGHT COLUMN - Green theme (Breakdown)
  const panelTypes = calculatePanelTypes(brandResults);
  const totalPanelCount = panelTypes.reduce((sum, pt) => sum + pt.count, 0);
  rightY = drawColoredTable(doc, {
    title: "PANEL TYPES",
    subtitle: `${totalPanelCount} panels`,
    data: panelTypes.map(pt => ({ label: pt.type, value: `${pt.count}` })),
    x: rightX,
    width: tableWidth,
    y: rightY,
    bgColor: COLORS.secondaryLight,
    borderColor: COLORS.secondary,
  });

  const roomBreakdown = calculateRoomBreakdown(cabinets);
  const totalCabinets = roomBreakdown.reduce((sum, r) => sum + r.cabinets, 0);
  rightY = drawColoredTable(doc, {
    title: "ROOMS",
    subtitle: `${totalCabinets} cabinets`,
    data: roomBreakdown.map(r => ({ label: r.room, value: `${r.cabinets}` })),
    x: rightX,
    width: tableWidth,
    y: rightY,
    bgColor: COLORS.secondaryLight,
    borderColor: COLORS.secondary,
  });

  // ═══════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════

  doc.setFillColor(...COLORS.veryLightGray);
  doc.rect(0, pageH - 12, pageW, 12, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.mediumGray);
  doc.text(`v${PDF_VERSION}`, margin, pageH - 5);
  doc.text("Page 1 - Material Summary", pageW - margin, pageH - 5, { align: "right" });
}

/**
 * Draw a colored section table
 */
function drawColoredTable(
  doc: jsPDF,
  opts: {
    title: string;
    subtitle: string;
    data: { label: string; value: string }[];
    x: number;
    width: number;
    y: number;
    bgColor: [number, number, number];
    borderColor: [number, number, number];
  }
): number {
  const { title, subtitle, data, x, width, y, bgColor, borderColor } = opts;

  if (data.length === 0) return y;

  let currentY = y;

  // Section header background
  doc.setFillColor(...borderColor);
  doc.roundedRect(x, currentY, width, 10, 2, 2, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.white);
  doc.text(title, x + 4, currentY + 7);

  // Subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(subtitle, x + width - 4, currentY + 7, { align: "right" });

  currentY += 12;

  // Data rows
  const rowHeight = 7;
  data.forEach((row, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(...bgColor);
    } else {
      doc.setFillColor(...COLORS.white);
    }
    doc.rect(x, currentY, width, rowHeight, "F");

    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.darkGray);
    doc.text(asciiSafe(row.label), x + 3, currentY + 5);

    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.black);
    doc.text(row.value, x + width - 3, currentY + 5, { align: "right" });

    currentY += rowHeight;
  });

  // Bottom border
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(1);
  doc.line(x, currentY, x + width, currentY);

  return currentY + 8;
}

/**
 * Calculate panel types from brandResults
 */
function calculatePanelTypes(brandResults: any[]): PanelTypeData[] {
  const typeMap: Record<string, number> = {};

  brandResults.forEach((br) => {
    const panels = br.result?.panels || [];
    panels.forEach((sheet: any) => {
      (sheet.placed || []).forEach((panel: any) => {
        const type = panel.label || panel.type || "Other";
        const normalizedType = normalizeType(type);
        typeMap[normalizedType] = (typeMap[normalizedType] || 0) + 1;
      });
    });
  });

  return Object.entries(typeMap)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Normalize panel type names
 */
function normalizeType(type: string): string {
  const upper = type.toUpperCase();
  if (upper.includes("TOP")) return "TOP";
  if (upper.includes("BOTTOM") || upper.includes("BTM")) return "BOTTOM";
  if (upper.includes("LEFT")) return "LEFT";
  if (upper.includes("RIGHT")) return "RIGHT";
  if (upper.includes("BACK")) return "BACK";
  if (upper.includes("SHELF") || upper.includes("SHELVES")) return "SHELF";
  if (upper.includes("DOOR") || upper.includes("SHUTTER")) return "DOOR";
  if (upper.includes("DRAWER")) return "DRAWER";
  if (upper.includes("PARTITION") || upper.includes("DIVIDER")) return "PARTITION";
  if (upper.includes("CENTER") || upper.includes("POST")) return "CENTER POST";
  return type.toUpperCase();
}

/**
 * Calculate room breakdown from cabinets
 */
function calculateRoomBreakdown(cabinets: any[]): { room: string; cabinets: number }[] {
  const roomMap: Record<string, number> = {};

  cabinets.forEach((cab) => {
    const room = cab.roomName || cab.room || "Unassigned";
    roomMap[room] = (roomMap[room] || 0) + 1;
  });

  return Object.entries(roomMap)
    .map(([room, cabinets]) => ({ room, cabinets }))
    .sort((a, b) => b.cabinets - a.cabinets);
}

/**
 * Calculate material summary from brandResults
 */
function calculateMaterialSummaryFromBrandResults(brandResults: any[]): MaterialSummaryData {
  const plywood: Record<string, number> = {};
  const laminates: Record<string, number> = {};
  let totalPlywoodSheets = 0;

  brandResults.forEach((br) => {
    const brand = br.brand || "Unknown";
    const sheets = br.result?.panels || [];
    const sheetCount = sheets.filter((s: any) => s.placed && s.placed.length > 0).length;

    if (sheetCount > 0) {
      plywood[brand] = (plywood[brand] || 0) + sheetCount;
      totalPlywoodSheets += sheetCount;

      const laminateDisplay = br.laminateDisplay || "";
      const codes = laminateDisplay.split(" + ").map((s: string) => s.trim()).filter(Boolean);
      codes.forEach((code: string) => {
        laminates[code] = (laminates[code] || 0) + sheetCount;
      });
    }
  });

  return { plywood, laminates, totalPlywoodSheets };
}

/**
 * Calculate edge band meters per laminate code
 */
function calculateEdgeBand(brandResults: any[]): EdgeBandData[] {
  const edgeBandMap: Record<string, number> = {};

  brandResults.forEach((br) => {
    const laminateDisplay = br.laminateDisplay || "";
    const laminateCodes = laminateDisplay.split(" + ").map((s: string) => s.trim()).filter(Boolean);
    const edgeBandCode = laminateCodes[0] || br.laminateCode || "Unknown";

    const panels = br.result?.panels || [];
    panels.forEach((sheet: any) => {
      (sheet.placed || []).forEach((panel: any) => {
        const w = panel.nomW ?? panel.w ?? 0;
        const h = panel.nomH ?? panel.h ?? 0;
        const perimeter = 2 * (w + h);

        if (!edgeBandMap[edgeBandCode]) {
          edgeBandMap[edgeBandCode] = 0;
        }
        edgeBandMap[edgeBandCode] += perimeter;
      });
    });
  });

  return Object.entries(edgeBandMap)
    .map(([code, mm]) => ({
      laminateCode: code,
      meters: Math.round(mm / 1000 * 10) / 10,
    }))
    .sort((a, b) => b.meters - a.meters);
}
