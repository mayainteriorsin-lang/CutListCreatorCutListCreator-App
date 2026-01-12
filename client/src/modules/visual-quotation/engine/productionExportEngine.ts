import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { ClientInfo, QuoteMeta, ProductionSettings } from "../store/visualQuotationStore";
import type { ProductionPanelItem } from "./productionEngine";
import { formatMm } from "./productionEngine";

export function exportProductionPDF(params: {
  client: ClientInfo;
  meta: QuoteMeta;
  items: ProductionPanelItem[];
  settings: ProductionSettings;
}): void {
  const { client, meta, items, settings } = params;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PRODUCTION CUT LIST", 14, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Quote: ${meta.quoteNo}`, 14, 20);
  doc.text(`Client: ${client.name || "Customer"}`, 14, 24);
  doc.text(`Date: ${meta.dateISO}`, 14, 28);

  const rows = items.map((item, idx) => ([
    idx + 1,
    item.roomName,
    item.unitLabel,
    item.panelType,
    item.panelLabel,
    formatMm(item.widthMm, settings.roundingMm),
    formatMm(item.heightMm, settings.roundingMm),
    "1",
    item.laminateCode || "-",
    item.grainDirection ? "LOCK" : "FREE",
  ]));

  autoTable(doc, {
    startY: 34,
    head: [[
      "#",
      "Room",
      "Unit",
      "Type",
      "Panel",
      "W (mm)",
      "H (mm)",
      "Qty",
      "Material",
      "Grain",
    ]],
    body: rows,
    styles: {
      fontSize: 7,
      cellPadding: 1,
    },
    headStyles: {
      fillColor: [226, 232, 240],
      textColor: [15, 23, 42],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 10, right: 10 },
  });

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
