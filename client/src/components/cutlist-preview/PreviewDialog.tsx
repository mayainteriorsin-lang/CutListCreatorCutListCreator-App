import {
  Dialog,
  DialogContent
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

import { generateCutlistPDF } from "@/lib/pdf/PDFEngine";
import React, { useMemo } from "react";
import { buildCutlistSummaries } from "@/lib/cutlist-summary/SummaryEngine";
import { computePageCounts, getVisibleSheets } from "@/lib/preview/PreviewHelpers";
import { filterDeletedPanels } from "@/lib/preview/SheetFilters";
import { computeColorFrameSummary } from "@/lib/colorframe/ColorFrameEngine";
import ColorFramePanel from "@/components/summary/ColorFramePanel";

export default function PreviewDialog({
  open,
  onOpenChange,
  cabinets,
  brandResults,
  deletedPreviewSheets,
  deletedPreviewPanels,
  woodGrainsReady,
  sheetWidth,
  sheetHeight,
  kerf,
  pdfOrientation,
  clientName,
  liveMaterialSummary,
  colourFrameEnabled,
  colourFrameForm,
  manualPanels
}: any) {

  if (!open) return null;

  const {
    materialSummary,
    laminateSummary,
    totalPanels,
    totalPages,
    roomNames,
  } = useMemo(() => buildCutlistSummaries({
    brandResults,
    deletedPreviewSheets,
    deletedPreviewPanels,
    cabinets,
  }), [brandResults, deletedPreviewSheets, deletedPreviewPanels, cabinets]);

  const visibleSheets = useMemo(
    () => getVisibleSheets(brandResults, deletedPreviewSheets),
    [brandResults, deletedPreviewSheets]
  );

  const { pageMap } = useMemo(
    () => computePageCounts(brandResults, deletedPreviewSheets),
    [brandResults, deletedPreviewSheets]
  );

  function renderSheet(sheet: any, title: string, brand: string, laminateDisplay: string, isBackPanel: boolean, sheetId: string, pageNumber: number) {
    return (
      <div
        key={sheetId}
        style={{ width: "100%", border: "1px solid #000", padding: "12px", minHeight: "600px" }}
      >
        <div className="flex justify-between items-center mb-2 border-b pb-1">
          <div className="font-bold">{title}</div>
          <div className="text-sm">Page {pageNumber}</div>
        </div>

        <div className="text-sm mb-1">
          <span className="font-semibold">Brand:</span> {brand}
        </div>
        <div className="text-sm mb-2">
          <span className="font-semibold">Laminate:</span> {laminateDisplay}
        </div>

        {/* Panels */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          {sheet.placed?.map((p: any, idx: number) => (
            <div key={idx} className="border p-2 rounded bg-gray-50 text-xs">
              <div className="font-semibold">{p.type}</div>
              <div>{p.w} × {p.h} mm</div>
              <div className="mt-1 text-gray-600">ID: {p.id}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Build all sheets
  const allSheetPages: React.ReactNode[] = visibleSheets.map((entry: any) => {
    const title = entry.isBackPanel ? `Back Panel Sheet - ${entry.brand}` : `Sheet - ${entry.brand}`;
    const sheetForRender = filterDeletedPanels(entry.sheet, deletedPreviewPanels);

    return (
      <div key={entry.sheetId} style={{ pageBreakAfter: "always" }}>
        {renderSheet(
          sheetForRender,
          title,
          entry.brand,
          entry.laminateDisplay,
          entry.isBackPanel,
          entry.sheetId,
          pageMap[entry.sheetId]
        )}
      </div>
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">

        <div id="pdf-wrapper" className="space-y-6">
          {/* Summary Page */}
          <div className="bg-white border p-6" style={{ pageBreakAfter: "always" }}>
            <div className="border-b pb-2 mb-2 flex justify-between">
              <h1 className="text-xl font-bold">Cutting List Summary</h1>
              <div className="text-gray-500">{new Date().toLocaleDateString()}</div>
            </div>

            <div className="mb-2">
              {clientName && (
                <div><strong>Client:</strong> {clientName}</div>
              )}
              {roomNames.length > 0 && (
                <div><strong>Rooms:</strong> {roomNames.join(", ")}</div>
              )}
              <div><strong>Cabinets:</strong> {cabinets.length}</div>
              <div>
                <strong>Total Panels:</strong>{" "}
                <span className="font-semibold text-green-600">{totalPanels}</span>
              </div>
            </div>

            <h2 className="font-bold text-lg mt-4 border-b pb-1">Material Summary</h2>
            {Object.values(materialSummary).map((m: any, idx: number) => {
              const [front, inner] = m.laminateDisplay.split(" + ");
              return (
                <div key={idx} className="text-sm mt-1">
                  <strong>{m.brand}</strong> (Front: {front}, Inner: {inner}) ={" "}
                  <span className="text-blue-600 font-bold">{m.count} Sheets</span>
                </div>
              );
            })}

            <h2 className="font-bold text-lg mt-4 border-b pb-1">Laminate Summary</h2>
            {(Object.entries(laminateSummary) as [string, number][]).map(([code, count]) => (
              <div key={code} className="flex justify-between text-sm border-b last:border-0 py-1">
                <span>{code}</span>
                <span className="font-semibold text-purple-600">{count} Sheets</span>
              </div>
            ))}

            <ColorFramePanel
              colorFrame={computeColorFrameSummary(colourFrameForm)}
              enabled={colourFrameEnabled}
            />
          </div>

          {/* Sheets */}
          {allSheetPages}

        </div>

        {/* Export PDF */}
        <div className="pt-4 flex justify-center">
          <Button
            disabled={!woodGrainsReady}
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              if (!woodGrainsReady) {
                return toast({
                  variant: "destructive",
                  title: "Please Wait",
                  description: "Wood grain preferences are still loading."
                });
              }

              try {
                const pdf = generateCutlistPDF({
                  brandResults,
                  sheet: { w: sheetWidth, h: sheetHeight, kerf },
                  filename: `cutting-list-${Date.now()}.pdf`,
                  orientationPreference: pdfOrientation,
                  cabinets,
                  materialSummary: liveMaterialSummary,
                  deletedSheets: deletedPreviewSheets
                });

                pdf.save(`cutting-list-${Date.now()}.pdf`);

                toast({
                  title: "PDF Generated",
                  description: "Two-column vector PDF created successfully."
                });
              } catch (err: any) {
                toast({
                  variant: "destructive",
                  title: "Export Failed",
                  description: err?.message || "Unknown error"
                });
              }
            }}
          >
            Export PDF
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
