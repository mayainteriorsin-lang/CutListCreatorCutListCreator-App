/**
 * Visual Quotation Export Engine
 * ------------------------------
 * Professional Visual PDF, Excel, and Share exports for quotations.
 * PDF includes the actual canvas drawing with room photo for visual appeal.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { QuotationRoom, ClientInfo, QuoteMeta, DrawnUnit } from "../store/visualQuotationStore";
import { calculatePricing, type PricingResult } from "./pricingEngine";

// Unit type labels
const UNIT_TYPE_LABELS: Record<string, string> = {
  wardrobe: "Wardrobe",
  kitchen: "Kitchen",
  tv_unit: "TV Unit",
  dresser: "Dresser",
  other: "Other",
};

// Format mm to feet'inches"
function formatDimension(mm: number): string {
  if (mm === 0) return "-";
  const inches = Math.round(mm / 25.4);
  const feet = Math.floor(inches / 12);
  const rem = inches % 12;
  if (feet === 0) return `${rem}"`;
  if (rem === 0) return `${feet}'`;
  return `${feet}'${rem}"`;
}

// Format currency
function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

// Calculate all rooms pricing
interface RoomPricing {
  room: QuotationRoom;
  pricing: PricingResult;
  validUnits: DrawnUnit[];
}

function calculateAllRoomsPricing(
  quotationRooms: QuotationRoom[],
  currentDrawnUnits: DrawnUnit[],
  activeRoomIndex: number,
  sqftRate: number
): { roomPricings: RoomPricing[]; grandTotal: { subtotal: number; gst: number; total: number } } {
  const roomPricings: RoomPricing[] = [];
  let grandSubtotal = 0;

  if (quotationRooms.length === 0) {
    // No rooms - use current drawnUnits
    const validUnits = currentDrawnUnits.filter(u => u.widthMm > 0 && u.heightMm > 0);
    const pricing = calculatePricing(validUnits, sqftRate);
    grandSubtotal = pricing.subtotal;
    // Create a dummy room for single-room case
    roomPricings.push({
      room: {
        id: "default",
        name: "Quotation",
        unitType: "wardrobe",
        drawnUnits: currentDrawnUnits,
        activeUnitIndex: 0,
        shutterCount: 3,
        shutterDividerXs: [],
        loftEnabled: false,
        loftHeightRatio: 0.17,
        loftShutterCount: 2,
        loftDividerXs: [],
      },
      pricing,
      validUnits,
    });
  } else {
    quotationRooms.forEach((room, index) => {
      const roomUnits = index === activeRoomIndex ? currentDrawnUnits : room.drawnUnits;
      const validUnits = roomUnits.filter(u => u.widthMm > 0 && u.heightMm > 0);
      const pricing = calculatePricing(validUnits, sqftRate);
      grandSubtotal += pricing.subtotal;
      roomPricings.push({ room, pricing, validUnits });
    });
  }

  const grandGst = grandSubtotal * 0.18;
  const grandTotal = grandSubtotal + grandGst;

  return {
    roomPricings,
    grandTotal: {
      subtotal: Math.round(grandSubtotal),
      gst: Math.round(grandGst),
      total: Math.round(grandTotal),
    },
  };
}

/**
 * Generate Professional Visual PDF Quotation
 * - Scrollable single-page website style layout
 * - Shows ALL room canvases with their pricing
 * - Each room section: Canvas image + mini pricing table
 * - Grand total at the bottom
 */
export function generateQuotationPDF({
  client,
  meta,
  quotationRooms,
  currentDrawnUnits,
  activeRoomIndex,
  sqftRate,
  canvasImageData,
  allCanvasImages,
}: {
  client: ClientInfo;
  meta: QuoteMeta;
  quotationRooms: QuotationRoom[];
  currentDrawnUnits: DrawnUnit[];
  activeRoomIndex: number;
  sqftRate: number;
  canvasImageData?: string; // Base64 image of current canvas (fallback)
  allCanvasImages?: Map<number, string>; // Map of roomIndex -> canvasImageData
}): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - (margin * 2);
  let y = 0;

  // Calculate all pricing
  const { roomPricings, grandTotal } = calculateAllRoomsPricing(
    quotationRooms,
    currentDrawnUnits,
    activeRoomIndex,
    sqftRate
  );

  // Helper: Add new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (y + requiredHeight > pageHeight - 25) {
      doc.addPage();
      y = 15;
      return true;
    }
    return false;
  };

  // ========== PAGE 1: HEADER + CLIENT INFO ==========
  // Livinza.in brand - Celadon Green header
  doc.setFillColor(168, 220, 171); // Celadon #A8DCAB
  doc.rect(0, 0, pageWidth, 28, "F");

  // Darker celadon accent stripe
  doc.setFillColor(120, 180, 125); // Darker Celadon
  doc.rect(0, 24, pageWidth, 4, "F");

  // Quote title - Dark text for light celadon background
  doc.setTextColor(45, 80, 50); // Dark Green for contrast
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("QUOTATION", margin, 14);

  // Quote number on right
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`#${meta.quoteNo}`, pageWidth - margin, 10, { align: "right" });
  doc.text(meta.dateISO, pageWidth - margin, 16, { align: "right" });

  y = 34;

  // ========== CLIENT INFO BAR ==========
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.rect(0, y - 2, pageWidth, 16, "F");

  doc.setTextColor(71, 85, 105); // Slate-600
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENT", margin, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFontSize(10);
  const clientName = client.name || "Customer";
  const clientDetails = [clientName, client.phone, client.location].filter(Boolean).join(" • ");
  doc.text(clientDetails, margin + 18, y + 4);

  y = y + 20;

  // ========== ROOM SECTIONS (SCROLLABLE STYLE) ==========
  // Each room gets: Canvas image (65mm height) + mini pricing table
  const canvasHeight = 65;
  const roomSectionHeight = canvasHeight + 45; // canvas + table + spacing

  roomPricings.forEach(({ room, pricing, validUnits }, roomIndex) => {
    // Check if we need a new page for this room
    checkPageBreak(roomSectionHeight);

    // Room header bar - Livinza Celadon Green
    doc.setFillColor(168, 220, 171); // Celadon #A8DCAB
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, "F");
    doc.setTextColor(45, 80, 50); // Dark Green for contrast
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(room.name.toUpperCase(), margin + 4, y + 5.5);

    // Room subtotal on right
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(45, 80, 50); // Dark Green
    doc.text(formatCurrency(pricing.subtotal), pageWidth - margin - 4, y + 5.5, { align: "right" });

    y += 12;

    // Canvas image for this room
    const roomCanvasImage = allCanvasImages?.get(roomIndex) || (roomIndex === activeRoomIndex ? canvasImageData : undefined);

    if (roomCanvasImage) {
      // Shadow effect
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(margin + 1.5, y + 1.5, contentWidth, canvasHeight, 2, 2, "F");

      // Border frame
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y, contentWidth, canvasHeight, 2, 2, "S");

      // Canvas image
      try {
        doc.addImage(roomCanvasImage, "PNG", margin + 0.5, y + 0.5, contentWidth - 1, canvasHeight - 1);
      } catch {
        // Fallback placeholder
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin + 0.5, y + 0.5, contentWidth - 1, canvasHeight - 1, 2, 2, "F");
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(10);
        doc.text(`${room.name} Preview`, pageWidth / 2, y + canvasHeight / 2, { align: "center" });
      }
    } else {
      // No image placeholder
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y, contentWidth, canvasHeight, 2, 2, "FD");
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(10);
      doc.text(`${room.name} - No Preview Available`, pageWidth / 2, y + canvasHeight / 2, { align: "center" });
    }

    y += canvasHeight + 4;

    // Mini pricing table for this room
    if (validUnits.length > 0) {
      const tableData: (string | number)[][] = [];

      validUnits.forEach((unit, idx) => {
        const unitPricing = pricing.units[idx];
        if (!unitPricing) return;

        const typeLabel = UNIT_TYPE_LABELS[unit.unitType] || unit.unitType;
        const dimensions = `${formatDimension(unit.widthMm)} × ${formatDimension(unit.heightMm)}`;

        tableData.push([
          typeLabel,
          dimensions,
          `${unitPricing.wardrobeSqft} sqft`,
          formatCurrency(unitPricing.wardrobePrice),
        ]);

        // Add loft if enabled
        if (unit.loftEnabled && unit.loftWidthMm > 0 && unit.loftHeightMm > 0) {
          const loftDimensions = `${formatDimension(unit.loftWidthMm)} × ${formatDimension(unit.loftHeightMm)}`;
          tableData.push([
            "  └ Loft",
            loftDimensions,
            `${unitPricing.loftSqft} sqft`,
            formatCurrency(unitPricing.loftPrice),
          ]);
        }
      });

      autoTable(doc, {
        startY: y,
        head: [["Item", "Size", "Area", "Amount"]],
        body: tableData,
        theme: "plain",
        headStyles: {
          fillColor: [210, 240, 212], // Light Celadon
          textColor: [45, 80, 50],    // Dark Green
          fontStyle: "bold",
          fontSize: 7,
          cellPadding: 1.5,
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 1.5,
          textColor: [30, 41, 59],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { halign: "left", cellWidth: 45 },
          1: { halign: "center", cellWidth: 40 },
          2: { halign: "center", cellWidth: 30 },
          3: { halign: "right", cellWidth: 35 },
        },
        margin: { left: margin, right: margin },
        tableLineColor: [203, 213, 225], // Slate-300
        tableLineWidth: 0.1,
      });

      y = (doc as any).lastAutoTable.finalY + 8;
    } else {
      // No units in this room
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8);
      doc.text("No items in this room", pageWidth / 2, y + 5, { align: "center" });
      y += 15;
    }

    // Room separator line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  });

  // ========== QUOTATION SUMMARY TABLE (LAST PAGE) ==========
  // Group rooms by floor
  interface FloorGroup {
    floor: string;
    rooms: { room: string; unitType: string; area: number; amount: number }[];
    floorTotal: number;
  }

  const floorGroups: Map<string, FloorGroup> = new Map();

  roomPricings.forEach(({ room, pricing }) => {
    // Parse floor from room name (e.g., "Kids Room (1st Floor)" -> "1st Floor")
    const floorMatch = room.name.match(/\(([^)]+)\)/);
    const floor = floorMatch ? floorMatch[1] : "Ground";
    const roomName = room.name.replace(/\s*\([^)]+\)/, "").trim();

    if (!floorGroups.has(floor)) {
      floorGroups.set(floor, { floor, rooms: [], floorTotal: 0 });
    }

    const group = floorGroups.get(floor)!;
    group.rooms.push({
      room: roomName,
      unitType: UNIT_TYPE_LABELS[room.unitType] || room.unitType,
      area: pricing.totalSqft,
      amount: pricing.subtotal,
    });
    group.floorTotal += pricing.subtotal;
  });

  // Calculate required height for summary section
  let totalRows = 0;
  floorGroups.forEach(group => {
    totalRows += 1 + group.rooms.length + 1; // floor header + rooms + floor total row
  });
  const summaryHeight = 20 + (totalRows * 10) + 50;
  checkPageBreak(summaryHeight);

  // Summary section header - Livinza Celadon Green
  doc.setFillColor(168, 220, 171); // Celadon #A8DCAB
  doc.roundedRect(margin, y, contentWidth, 10, 2, 2, "F");
  doc.setTextColor(45, 80, 50); // Dark Green for contrast
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("QUOTATION SUMMARY", margin + 4, y + 7);
  y += 16;

  // Render each floor section - Livinza brand theme
  floorGroups.forEach((group) => {
    // Check for page break before each floor section
    const floorSectionHeight = 12 + (group.rooms.length * 8) + 10;
    checkPageBreak(floorSectionHeight);

    // Floor header bar - Livinza Celadon Green
    doc.setFillColor(168, 220, 171); // Celadon #A8DCAB
    doc.roundedRect(margin, y, contentWidth, 7, 1, 1, "F");
    doc.setTextColor(45, 80, 50); // Dark Green for contrast
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(group.floor.toUpperCase(), margin + 4, y + 5);
    y += 10;

    // Room table for this floor
    const floorTableData = group.rooms.map(room => [
      room.room,
      room.unitType,
      `${room.area} sqft`,
      formatCurrency(room.amount),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Room", "Type", "Area", "Amount"]],
      body: floorTableData,
      theme: "plain",
      headStyles: {
        fillColor: [210, 240, 212], // Light Celadon
        textColor: [45, 80, 50],    // Dark Green
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: 2,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [30, 41, 59], // Slate-800
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // Slate-50
      },
      columnStyles: {
        0: { halign: "left", cellWidth: 55 },
        1: { halign: "center", cellWidth: 35 },
        2: { halign: "center", cellWidth: 35 },
        3: { halign: "right", cellWidth: 45 },
      },
      margin: { left: margin, right: margin },
      tableLineColor: [203, 213, 225], // Slate-300
      tableLineWidth: 0.1,
    });

    y = (doc as any).lastAutoTable.finalY + 2;

    // Floor total row - Light celadon background
    doc.setFillColor(210, 240, 212); // Light Celadon
    doc.roundedRect(margin, y, contentWidth, 7, 1, 1, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(45, 80, 50); // Dark Green
    doc.text(`${group.floor} Total`, margin + 4, y + 5);
    doc.text(formatCurrency(group.floorTotal), pageWidth - margin - 4, y + 5, { align: "right" });

    y += 12;
  });

  // ========== GRAND TOTALS BOX ==========
  // Ensure grand totals fit on page
  checkPageBreak(50);

  const totalsBoxWidth = 90;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;

  // Totals background box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.roundedRect(totalsBoxX - 5, y - 2, totalsBoxWidth + 5, 38, 3, 3, "FD");

  // Subtotal
  y += 4;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Subtotal", totalsBoxX, y);
  doc.setTextColor(30, 41, 59);
  doc.text(formatCurrency(grandTotal.subtotal), pageWidth - margin, y, { align: "right" });
  y += 7;

  // GST
  doc.setTextColor(100, 116, 139);
  doc.text("GST (18%)", totalsBoxX, y);
  doc.setTextColor(30, 41, 59);
  doc.text(formatCurrency(grandTotal.gst), pageWidth - margin, y, { align: "right" });
  y += 5;

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(totalsBoxX, y, pageWidth - margin, y);
  y += 7;

  // Grand Total Box - Livinza Celadon Green
  doc.setFillColor(168, 220, 171); // Celadon #A8DCAB
  doc.roundedRect(totalsBoxX - 3, y - 5, totalsBoxWidth + 3, 16, 3, 3, "F");
  doc.setTextColor(45, 80, 50); // Dark Green for contrast
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("GRAND TOTAL", totalsBoxX + 2, y + 5);
  doc.setFontSize(14);
  doc.text(formatCurrency(grandTotal.total), pageWidth - margin - 2, y + 5, { align: "right" });

  y += 20;

  // ========== FOOTER ON LAST PAGE ==========
  const footerY = pageHeight - 15;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Terms: 50% advance • Delivery 25-30 days • Prices subject to change", margin, footerY);

  if (meta.validTillISO) {
    doc.text(`Valid till: ${meta.validTillISO}`, margin, footerY + 4);
  }

  doc.text(`Generated ${new Date().toLocaleDateString("en-IN")}`, pageWidth - margin, footerY + 4, { align: "right" });

  doc.setFontSize(8);
  doc.setTextColor(120, 180, 125); // Darker Celadon - Livinza brand
  doc.setFont("helvetica", "bold");
  doc.text("Livinza.in", pageWidth - margin, footerY, { align: "right" });

  // Save PDF
  const filename = `Quotation_${meta.quoteNo}_${client.name || "Customer"}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, "_");
  doc.save(filename);
}

/**
 * Generate Excel Quotation
 */
export function generateQuotationExcel({
  client,
  meta,
  quotationRooms,
  currentDrawnUnits,
  activeRoomIndex,
  sqftRate,
}: {
  client: ClientInfo;
  meta: QuoteMeta;
  quotationRooms: QuotationRoom[];
  currentDrawnUnits: DrawnUnit[];
  activeRoomIndex: number;
  sqftRate: number;
}): void {
  // Calculate all pricing
  const { roomPricings, grandTotal } = calculateAllRoomsPricing(
    quotationRooms,
    currentDrawnUnits,
    activeRoomIndex,
    sqftRate
  );

  // Create workbook
  const wb = XLSX.utils.book_new();

  // ========== SUMMARY SHEET ==========
  const summaryData: any[][] = [
    ["QUOTATION SUMMARY"],
    [],
    ["Quote No:", meta.quoteNo],
    ["Date:", meta.dateISO],
    ["Valid Till:", meta.validTillISO || "-"],
    [],
    ["CLIENT DETAILS"],
    ["Name:", client.name || "-"],
    ["Phone:", client.phone || "-"],
    ["Location:", client.location || "-"],
    [],
    ["PRICING SUMMARY"],
    ["Room/Area", "Units", "Sqft", "Amount"],
  ];

  let totalUnits = 0;
  let totalSqft = 0;

  roomPricings.forEach(({ room, pricing }) => {
    summaryData.push([
      room.name,
      pricing.units.length,
      pricing.totalSqft,
      pricing.subtotal,
    ]);
    totalUnits += pricing.units.length;
    totalSqft += pricing.totalSqft;
  });

  summaryData.push([]);
  summaryData.push(["TOTAL", totalUnits, totalSqft, grandTotal.subtotal]);
  summaryData.push(["GST (18%)", "", "", grandTotal.gst]);
  summaryData.push(["GRAND TOTAL", "", "", grandTotal.total]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Set column widths
  summarySheet["!cols"] = [
    { wch: 25 },
    { wch: 10 },
    { wch: 12 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // ========== DETAILED ITEMS SHEET ==========
  const itemsData: any[][] = [
    ["DETAILED QUOTATION"],
    [],
    ["#", "Room", "Item Type", "Width", "Height", "Area (sqft)", "Rate/sqft", "Amount"],
  ];

  let itemNo = 1;

  roomPricings.forEach(({ room, pricing, validUnits }) => {
    validUnits.forEach((unit, idx) => {
      const unitPricing = pricing.units[idx];
      if (!unitPricing) return;

      itemsData.push([
        itemNo++,
        room.name,
        UNIT_TYPE_LABELS[unit.unitType] || unit.unitType,
        formatDimension(unit.widthMm),
        formatDimension(unit.heightMm),
        unitPricing.wardrobeSqft,
        sqftRate,
        unitPricing.wardrobePrice,
      ]);

      // Add loft if enabled
      if (unit.loftEnabled && unit.loftWidthMm > 0 && unit.loftHeightMm > 0) {
        itemsData.push([
          itemNo++,
          room.name,
          "Loft",
          formatDimension(unit.loftWidthMm),
          formatDimension(unit.loftHeightMm),
          unitPricing.loftSqft,
          sqftRate,
          unitPricing.loftPrice,
        ]);
      }
    });
  });

  // Add totals
  itemsData.push([]);
  itemsData.push(["", "", "", "", "Subtotal", "", "", grandTotal.subtotal]);
  itemsData.push(["", "", "", "", "GST (18%)", "", "", grandTotal.gst]);
  itemsData.push(["", "", "", "", "Grand Total", "", "", grandTotal.total]);

  const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);

  // Set column widths
  itemsSheet["!cols"] = [
    { wch: 5 },
    { wch: 20 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(wb, itemsSheet, "Details");

  // Save Excel
  const filename = `Quotation_${meta.quoteNo}_${client.name || "Customer"}.xlsx`.replace(/[^a-zA-Z0-9_.-]/g, "_");
  XLSX.writeFile(wb, filename);
}

/**
 * Generate shareable link data (base64 encoded state)
 */
export function generateShareData({
  client,
  meta,
  quotationRooms,
  currentDrawnUnits,
  activeRoomIndex,
  sqftRate,
}: {
  client: ClientInfo;
  meta: QuoteMeta;
  quotationRooms: QuotationRoom[];
  currentDrawnUnits: DrawnUnit[];
  activeRoomIndex: number;
  sqftRate: number;
}): string {
  const sharePayload = {
    v: 1, // version
    c: client,
    m: meta,
    r: quotationRooms.map(room => ({
      id: room.id,
      name: room.name,
      unitType: room.unitType,
      units: room.drawnUnits.map(u => ({
        id: u.id,
        type: u.unitType,
        w: u.widthMm,
        h: u.heightMm,
        lw: u.loftWidthMm,
        lh: u.loftHeightMm,
        loft: u.loftEnabled,
      })),
    })),
    cu: currentDrawnUnits.map(u => ({
      id: u.id,
      type: u.unitType,
      w: u.widthMm,
      h: u.heightMm,
      lw: u.loftWidthMm,
      lh: u.loftHeightMm,
      loft: u.loftEnabled,
    })),
    ai: activeRoomIndex,
    rate: sqftRate,
  };

  return btoa(JSON.stringify(sharePayload));
}

/**
 * Copy quotation summary to clipboard (for WhatsApp/SMS sharing)
 */
export async function copyQuotationToClipboard({
  client,
  meta,
  quotationRooms,
  currentDrawnUnits,
  activeRoomIndex,
  sqftRate,
}: {
  client: ClientInfo;
  meta: QuoteMeta;
  quotationRooms: QuotationRoom[];
  currentDrawnUnits: DrawnUnit[];
  activeRoomIndex: number;
  sqftRate: number;
}): Promise<boolean> {
  // Calculate all pricing
  const { roomPricings, grandTotal } = calculateAllRoomsPricing(
    quotationRooms,
    currentDrawnUnits,
    activeRoomIndex,
    sqftRate
  );

  let text = `*QUOTATION*\n`;
  text += `Quote No: ${meta.quoteNo}\n`;
  text += `Date: ${meta.dateISO}\n`;
  text += `\n`;
  text += `*Customer:* ${client.name || "N/A"}\n`;
  if (client.phone) text += `Phone: ${client.phone}\n`;
  if (client.location) text += `Location: ${client.location}\n`;
  text += `\n`;
  text += `*Items:*\n`;

  roomPricings.forEach(({ room, pricing, validUnits }) => {
    if (quotationRooms.length > 1) {
      text += `\n_${room.name}_\n`;
    }

    validUnits.forEach((unit, idx) => {
      const unitPricing = pricing.units[idx];
      if (!unitPricing) return;

      const dimensions = `${formatDimension(unit.widthMm)} x ${formatDimension(unit.heightMm)}`;
      text += `- ${UNIT_TYPE_LABELS[unit.unitType] || unit.unitType} (${dimensions}): Rs. ${unitPricing.wardrobePrice.toLocaleString("en-IN")}\n`;

      if (unit.loftEnabled && unitPricing.loftPrice > 0) {
        const loftDimensions = `${formatDimension(unit.loftWidthMm)} x ${formatDimension(unit.loftHeightMm)}`;
        text += `  + Loft (${loftDimensions}): Rs. ${unitPricing.loftPrice.toLocaleString("en-IN")}\n`;
      }
    });
  });

  text += `\n`;
  text += `Subtotal: Rs. ${grandTotal.subtotal.toLocaleString("en-IN")}\n`;
  text += `GST (18%): Rs. ${grandTotal.gst.toLocaleString("en-IN")}\n`;
  text += `*Grand Total: Rs. ${grandTotal.total.toLocaleString("en-IN")}*\n`;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
