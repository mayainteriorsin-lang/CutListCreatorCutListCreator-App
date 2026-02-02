import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { ClientInfo, QuoteMeta, ProductionSettings } from "../types";
import type { ProductionPanelItem } from "./productionEngine";
import { formatMm } from "./productionEngine";

// Unit group structure for organizing panels by unit
interface UnitGroup {
  key: string;
  roomName: string;
  roomCode: string;
  unitLabel: string;
  unitNumber: number;
  unitId: string;
  totalWidthMm: number;
  totalHeightMm: number;
  shutters: {
    row: number;
    col: number;
    widthMm: number;
    heightMm: number;
    label: string;
    id: string;
  }[];
  loftPanels: {
    col: number;
    widthMm: number;
    heightMm: number;
    label: string;
    id: string;
  }[];
  loftHeightMm: number;
}

// Room code mapping
const ROOM_CODE_MAP: Record<string, string> = {
  "master bedroom": "MB", "master": "MB", "bedroom": "B",
  "kids bedroom": "KB", "kids": "KB", "guest bedroom": "GB", "guest": "GB",
  "living": "LR", "living room": "LR", "kitchen": "K",
  "dining": "DN", "dining room": "DN", "study": "ST", "study room": "ST",
  "pooja": "PJ", "pooja room": "PJ", "utility": "UT", "balcony": "BL",
  "other": "OT", "quotation": "Q",
};

function getRoomCode(roomName: string): string {
  const lower = roomName.toLowerCase().trim();
  if (ROOM_CODE_MAP[lower]) return ROOM_CODE_MAP[lower];
  for (const [key, code] of Object.entries(ROOM_CODE_MAP)) {
    if (lower.includes(key)) return code;
  }
  return roomName.slice(0, 2).toUpperCase();
}

// Build unit groups from panel items
function buildUnitGroups(items: ProductionPanelItem[]): UnitGroup[] {
  const groups = new Map<string, UnitGroup>();
  const unitCountPerRoom = new Map<string, number>();

  // First pass: collect all panels into groups
  items.forEach((item) => {
    const key = `${item.roomIndex}:${item.unitId}`;
    let existing = groups.get(key);
    const roomCode = getRoomCode(item.roomName);

    if (!existing) {
      const roomKey = `${item.roomIndex}:${roomCode}`;
      const currentCount = unitCountPerRoom.get(roomKey) ?? 0;
      const unitNumber = currentCount + 1;
      unitCountPerRoom.set(roomKey, unitNumber);

      existing = {
        key,
        roomName: item.roomName,
        roomCode,
        unitLabel: item.unitLabel,
        unitNumber,
        unitId: item.unitId,
        totalWidthMm: 0,
        totalHeightMm: 0,
        shutters: [],
        loftPanels: [],
        loftHeightMm: 0,
      };
      groups.set(key, existing);
    }

    const prefix = `${existing.roomCode}${existing.unitNumber}`;

    if (item.panelType === "SHUTTER") {
      // Use the actual row/col from the item
      existing.shutters.push({
        row: item.row,
        col: item.col,
        widthMm: item.widthMm,
        heightMm: item.heightMm,
        label: `${prefix}-S${item.row}${item.col}`,
        id: item.id,
      });
    } else if (item.panelType === "LOFT") {
      existing.loftPanels.push({
        col: item.col,
        widthMm: item.widthMm,
        heightMm: item.heightMm,
        label: `${prefix}-L${item.col}`,
        id: item.id,
      });
      // Track loft height (all loft panels in a unit should have same height)
      if (item.heightMm > existing.loftHeightMm) {
        existing.loftHeightMm = item.heightMm;
      }
    }
  });

  // Second pass: calculate dimensions for each group
  return Array.from(groups.values()).map((group) => {
    const isLoftOnly = group.shutters.length === 0 && group.loftPanels.length > 0;
    let colWidths: number[] = [];
    let rowHeights: number[] = [];

    if (isLoftOnly) {
      // Loft-only: calculate column widths from loft panels
      const maxCol = Math.max(1, ...group.loftPanels.map(p => p.col));
      colWidths = Array.from({ length: maxCol }, (_, i) => {
        const col = i + 1;
        const widths = group.loftPanels.filter(p => p.col === col).map(p => p.widthMm);
        return widths.length > 0 ? Math.max(...widths) : 0;
      });
      rowHeights = [];
    } else {
      // Regular unit: calculate from shutters
      const maxCol = Math.max(1, ...group.shutters.map(s => s.col));
      const maxRow = Math.max(1, ...group.shutters.map(s => s.row));

      // Calculate column widths (max width for each column across all rows)
      colWidths = Array.from({ length: maxCol }, (_, i) => {
        const col = i + 1;
        const widths = group.shutters.filter(s => s.col === col).map(s => s.widthMm);
        return widths.length > 0 ? Math.max(...widths) : 0;
      });

      // Calculate row heights (max height for each row across all columns)
      rowHeights = Array.from({ length: maxRow }, (_, i) => {
        const row = i + 1;
        const heights = group.shutters.filter(s => s.row === row).map(s => s.heightMm);
        return heights.length > 0 ? Math.max(...heights) : 0;
      });
    }

    const totalWidthMm = colWidths.reduce((s, w) => s + w, 0);
    const shutterHeight = rowHeights.reduce((s, h) => s + h, 0);
    const totalHeightMm = shutterHeight + (group.loftHeightMm || 0);

    return { ...group, totalWidthMm, totalHeightMm };
  });
}

// Draw production view diagram for a unit
function drawProductionDiagram(
  doc: jsPDF,
  group: UnitGroup,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  gapMm: number
): number {
  const { shutters, loftPanels, loftHeightMm } = group;
  const isLoftOnly = shutters.length === 0 && loftPanels.length > 0;

  // Calculate grid dimensions from actual shutters
  const maxCol = isLoftOnly
    ? Math.max(1, ...loftPanels.map(p => p.col))
    : Math.max(1, ...shutters.map(s => s.col));
  const maxRow = isLoftOnly ? 0 : Math.max(1, ...shutters.map(s => s.row));

  // Calculate column widths (max width for each column)
  const colWidthsMm: number[] = Array.from({ length: maxCol }, (_, i) => {
    const col = i + 1;
    if (isLoftOnly) {
      const widths = loftPanels.filter(p => p.col === col).map(p => p.widthMm);
      return widths.length > 0 ? Math.max(...widths) : 0;
    }
    const widths = shutters.filter(s => s.col === col).map(s => s.widthMm);
    return widths.length > 0 ? Math.max(...widths) : 0;
  });

  // Calculate row heights (max height for each row)
  const rowHeightsMm: number[] = isLoftOnly
    ? []
    : Array.from({ length: maxRow }, (_, i) => {
      const row = i + 1;
      const heights = shutters.filter(s => s.row === row).map(s => s.heightMm);
      return heights.length > 0 ? Math.max(...heights) : 0;
    });

  // Calculate total dimensions for aspect ratio
  const totalW = colWidthsMm.reduce((s, w) => s + w, 0) || 1;
  const totalShutterH = rowHeightsMm.reduce((s, h) => s + h, 0);
  const totalH = totalShutterH + (loftHeightMm || 0) || 1;

  // Calculate scale to fit in container
  const aspectRatio = totalW / totalH;
  let containerWidth = maxWidth;
  let containerHeight = containerWidth / aspectRatio;
  if (containerHeight > maxHeight) {
    containerHeight = maxHeight;
    containerWidth = containerHeight * aspectRatio;
  }

  // Gap in PDF units
  const gapPx = Math.max(1, gapMm * 0.5);

  // Calculate available space after gaps
  const numCols = colWidthsMm.length;
  const numRows = rowHeightsMm.length;
  const hasLoft = loftHeightMm > 0;

  const totalGapW = gapPx * (numCols + 1);
  const availableW = containerWidth - totalGapW;
  const colPxWidths = colWidthsMm.map(w => (w / totalW) * availableW);

  // Calculate loft and shutter heights
  const loftHeightRatio = hasLoft ? (loftHeightMm / totalH) : 0;
  const loftPxHeight = hasLoft ? Math.max(8, containerHeight * loftHeightRatio) : 0;

  const numVerticalGaps = numRows + (hasLoft ? 2 : 1);
  const totalGapH = gapPx * numVerticalGaps;
  const availableH = containerHeight - totalGapH - loftPxHeight;
  const totalShutterMm = rowHeightsMm.reduce((s, h) => s + h, 0) || 1;
  const rowPxHeights = rowHeightsMm.map(h => (h / totalShutterMm) * availableH);

  // Draw background
  doc.setFillColor(200, 200, 200);
  doc.rect(x, y, containerWidth, containerHeight, "F");

  let currentY = y + gapPx;

  // Draw loft panels at the top
  if (hasLoft && loftPanels.length > 0) {
    let currentX = x + gapPx;
    // Sort loft panels by column
    const sortedLoftPanels = [...loftPanels].sort((a, b) => a.col - b.col);
    sortedLoftPanels.forEach((panel) => {
      const colIdx = panel.col - 1;
      const pw = colPxWidths[colIdx] || 20;

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(50, 50, 50);
      doc.setLineWidth(0.4);
      doc.rect(currentX, currentY, pw, loftPxHeight, "FD");

      // Label
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(`L${panel.col}`, currentX + pw / 2, currentY + loftPxHeight / 2 - 1, { align: "center" });
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text(`${formatMm(panel.widthMm, 0)}x${formatMm(panel.heightMm, 0)}`, currentX + pw / 2, currentY + loftPxHeight / 2 + 4, { align: "center" });

      currentX += pw + gapPx;
    });
    currentY += loftPxHeight + gapPx;
  }

  // Draw shutters grid (row by row, column by column)
  if (!isLoftOnly && numRows > 0) {
    for (let row = 1; row <= numRows; row++) {
      let currentX = x + gapPx;
      const rowH = rowPxHeights[row - 1] || 20;

      for (let col = 1; col <= numCols; col++) {
        const colW = colPxWidths[col - 1] || 20;

        // Find the shutter at this row/col position
        const shutter = shutters.find(s => s.row === row && s.col === col);

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(50, 50, 50);
        doc.setLineWidth(0.4);
        doc.rect(currentX, currentY, colW, rowH, "FD");

        if (shutter) {
          // Label with actual dimensions
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "bold");
          doc.text(`S${row}${col}`, currentX + colW / 2, currentY + rowH / 2 - 1, { align: "center" });
          doc.setFontSize(6);
          doc.setFont("helvetica", "normal");
          doc.text(`${formatMm(shutter.widthMm, 0)}x${formatMm(shutter.heightMm, 0)}`, currentX + colW / 2, currentY + rowH / 2 + 4, { align: "center" });
        }

        currentX += colW + gapPx;
      }
      currentY += rowH + gapPx;
    }
  }

  return containerHeight;
}

export interface ProductionPDFParams {
  client: ClientInfo;
  meta: QuoteMeta;
  items: ProductionPanelItem[];
  settings: ProductionSettings;
  canvasSnapshots?: Map<string, string>;
  materials?: {
    plywood: string;
    frontLaminate: string;
    innerLaminate: string;
  };
  grainSettings?: Record<string, boolean>;
  gaddiSettings?: Record<string, boolean>;
  panelOverrides?: Record<string, { width?: number; height?: number }>;
  unitGapSettings?: Record<string, number>;
}

export function exportProductionPDF(params: ProductionPDFParams): void {
  const {
    client, meta, items, settings,
    canvasSnapshots,
    materials,
    grainSettings = {},
    gaddiSettings = {},
  } = params;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // Helper: Add new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (y + requiredHeight > pageHeight - 20) {
      doc.addPage();
      y = 15;
      return true;
    }
    return false;
  };

  // Build unit groups
  const unitGroups = buildUnitGroups(items);

  // ========== HEADER ==========
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 28, "F");

  // Accent line
  doc.setFillColor(59, 130, 246); // Blue-500
  doc.rect(0, 28, pageWidth, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("PRODUCTION CUT LIST", margin, 14);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Quote: ${meta.quoteNo}`, margin, 22);
  doc.text(`Client: ${client.name || "Customer"}`, margin + 60, 22);

  doc.setFontSize(10);
  doc.text(meta.dateISO, pageWidth - margin, 14, { align: "right" });

  y = 38;

  // ========== SUMMARY STATS ==========
  const totalPanels = items.length;
  const shutterCount = items.filter(i => i.panelType === "SHUTTER").length;
  const loftCount = items.filter(i => i.panelType === "LOFT").length;

  doc.setFillColor(241, 245, 249); // Slate-100
  doc.roundedRect(margin, y, contentWidth, 18, 3, 3, "F");

  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");

  const statsY = y + 7;
  doc.text(`Total: ${totalPanels}`, margin + 8, statsY);
  doc.text(`Shutters: ${shutterCount}`, margin + 50, statsY);
  if (loftCount > 0) {
    doc.text(`Loft: ${loftCount}`, margin + 100, statsY);
  }
  doc.text(`Units: ${unitGroups.length}`, margin + 140, statsY);

  // Materials info - second row
  if (materials) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // Slate-600
    const matY = y + 14;
    doc.text(`Plywood: ${materials.plywood || "-"}`, margin + 8, matY);
    doc.text(`Front Laminate: ${materials.frontLaminate || "-"}`, margin + 60, matY);
    doc.text(`Inner Laminate: ${materials.innerLaminate || "-"}`, margin + 125, matY);
  }

  y += 24;

  // ========== UNIT SECTIONS ==========
  unitGroups.forEach((group, groupIdx) => {
    const unitItems = items.filter(i => i.unitId === group.unitId);
    const isLoftOnly = group.shutters.length === 0 && group.loftPanels.length > 0;

    // Estimate height needed for this unit section
    const estimatedHeight = 95 + (unitItems.length * 7);
    checkPageBreak(estimatedHeight);

    // Unit header - larger and more prominent
    if (isLoftOnly) {
      doc.setFillColor(245, 158, 11); // Amber-500
    } else {
      doc.setFillColor(37, 99, 235); // Blue-600
    }
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`${group.roomCode}${group.unitNumber} - ${group.roomName}`, margin + 5, y + 8);

    doc.setFontSize(11);
    doc.text(group.unitLabel + (isLoftOnly ? " (Loft Only)" : ""), margin + 80, y + 8);

    // Dimensions on right - larger
    doc.setFontSize(11);
    doc.text(`W: ${formatMm(group.totalWidthMm, 0)}  H: ${formatMm(group.totalHeightMm, 0)} mm`, pageWidth - margin - 5, y + 8, { align: "right" });

    y += 16;

    // Canvas snapshot + Production diagram side by side
    const sectionHeight = 60;
    const halfWidth = (contentWidth - 6) / 2;
    const canvasSnapshot = canvasSnapshots?.get(group.unitId);

    // Left: Canvas Preview
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, halfWidth, sectionHeight, 3, 3, "FD");

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.setFont("helvetica", "bold");
    doc.text("CANVAS PREVIEW", margin + halfWidth / 2, y + 6, { align: "center" });

    if (canvasSnapshot) {
      try {
        doc.addImage(canvasSnapshot, "PNG", margin + 3, y + 9, halfWidth - 6, sectionHeight - 13);
      } catch {
        doc.setTextColor(156, 163, 175);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Preview N/A", margin + halfWidth / 2, y + sectionHeight / 2 + 3, { align: "center" });
      }
    } else {
      doc.setTextColor(156, 163, 175);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("No Preview", margin + halfWidth / 2, y + sectionHeight / 2 + 3, { align: "center" });
    }

    // Right: Production Diagram
    const rightX = margin + halfWidth + 6;
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(rightX, y, halfWidth, sectionHeight, 3, 3, "FD");

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("PRODUCTION VIEW", rightX + halfWidth / 2, y + 6, { align: "center" });

    // Draw the production diagram
    const diagramX = rightX + 5;
    const diagramY = y + 10;
    const diagramMaxW = halfWidth - 10;
    const diagramMaxH = sectionHeight - 16;
    drawProductionDiagram(doc, group, diagramX, diagramY, diagramMaxW, diagramMaxH, 2);

    y += sectionHeight + 4;

    // Unit Cut List Table - larger fonts
    const tableRows = unitItems.map((item, idx) => {
      const isGrain = grainSettings[item.id] ?? true;
      const isGaddi = gaddiSettings[item.id] ?? false;
      return [
        idx + 1,
        item.panelLabel,
        formatMm(item.widthMm, 0),
        formatMm(item.heightMm, 0),
        materials?.frontLaminate || "-",
        materials?.innerLaminate || "-",
        isGrain ? "↑" : "-",
        isGaddi ? "YES" : "-",
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["#", "Panel", "W (mm)", "H (mm)", "Front Lam", "Inner Lam", "Grain", "Gaddi"]],
      body: tableRows,
      theme: "striped",
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [226, 232, 240],
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: [30, 41, 59], // Slate-800
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        1: { halign: "center", cellWidth: 20, fontStyle: "bold" },
        2: { halign: "right", cellWidth: 22 },
        3: { halign: "right", cellWidth: 22 },
        4: { halign: "left", cellWidth: 38 },
        5: { halign: "left", cellWidth: 38 },
        6: { halign: "center", cellWidth: 18 },
        7: { halign: "center", cellWidth: 18 },
      },
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Separator between units
    if (groupIdx < unitGroups.length - 1) {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(margin + 20, y - 4, pageWidth - margin - 20, y - 4);
    }
  });

  // ========== FULL CUT LIST TABLE (All panels on new page) ==========
  doc.addPage();
  y = 15;

  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 22, "F");
  doc.setFillColor(59, 130, 246); // Blue-500
  doc.rect(0, 22, pageWidth, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("COMPLETE CUT LIST", margin, 14);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${items.length} panels total`, pageWidth - margin, 14, { align: "right" });

  y = 30;

  const fullRows = items.map((item, idx) => {
    const isGrain = grainSettings[item.id] ?? true;
    const isGaddi = gaddiSettings[item.id] ?? false;
    return [
      idx + 1,
      item.roomName,
      item.unitLabel,
      item.panelType,
      item.panelLabel,
      formatMm(item.widthMm, settings.roundingMm),
      formatMm(item.heightMm, settings.roundingMm),
      "1",
      item.laminateCode || materials?.frontLaminate || "-",
      isGrain ? "LOCK" : "FREE",
      isGaddi ? "YES" : "-",
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["#", "Room", "Unit", "Type", "Panel", "W", "H", "Qty", "Material", "Grain", "Gaddi"]],
    body: fullRows,
    theme: "striped",
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "left", cellWidth: 22 },
      2: { halign: "left", cellWidth: 22 },
      3: { halign: "center", cellWidth: 18 },
      4: { halign: "center", cellWidth: 14, fontStyle: "bold" },
      5: { halign: "right", cellWidth: 16 },
      6: { halign: "right", cellWidth: 16 },
      7: { halign: "center", cellWidth: 10 },
      8: { halign: "left", cellWidth: 28 },
      9: { halign: "center", cellWidth: 16 },
      10: { halign: "center", cellWidth: 14 },
    },
    margin: { left: margin, right: margin },
  });

  // ========== FOOTER ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    doc.text(`Generated ${new Date().toLocaleDateString("en-IN")}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  }

  const filename = `Production_Cutlist_${meta.quoteNo}_${client.name || "Customer"}.pdf`
    .replace(/[^a-zA-Z0-9_.-]/g, "_");
  doc.save(filename);
}

export function exportProductionExcel(params: {
  client: ClientInfo;
  meta: QuoteMeta;
  items: ProductionPanelItem[];
  settings: ProductionSettings;
}): void {
  const { client, meta, items, settings } = params;

  const data: (string | number)[][] = [
    ["PRODUCTION CUT LIST"],
    [],
    ["Quote", meta.quoteNo],
    ["Client", client.name || "Customer"],
    ["Date", meta.dateISO],
    [],
    ["#", "Room", "Unit", "Type", "Panel", "W (mm)", "H (mm)", "Qty", "Material", "Grain"],
  ];

  items.forEach((item, idx) => {
    data.push([
      idx + 1,
      item.roomName,
      item.unitLabel,
      item.panelType,
      item.panelLabel,
      formatMm(item.widthMm, settings.roundingMm),
      formatMm(item.heightMm, settings.roundingMm),
      1,
      item.laminateCode || "-",
      item.grainDirection ? "LOCK" : "FREE",
    ]);
  });

  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet["!cols"] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 16 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 6 },
    { wch: 14 },
    { wch: 8 },
  ];

  XLSX.utils.book_append_sheet(wb, sheet, "Cutlist");

  const filename = `Production_Cutlist_${meta.quoteNo}_${client.name || "Customer"}.xlsx`
    .replace(/[^a-zA-Z0-9_.-]/g, "_");
  XLSX.writeFile(wb, filename);
}
