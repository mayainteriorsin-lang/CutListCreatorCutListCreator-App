import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CuttingListSummary } from "@shared/schema";
import type { MaterialSummary } from "@/lib/summary/SummaryEngine";

export interface SummaryPanelProps {
  cabinets: any[];
  cuttingListSummary: CuttingListSummary;
  liveMaterialSummary: MaterialSummary;
  shutterCount: number;
  onExportExcel: () => void;
  onExportGoogleSheets: () => void;
  onPrint: () => void;
}

export default function SummaryPanel({
  cabinets,
  cuttingListSummary,
  liveMaterialSummary,
  shutterCount,
  onExportExcel,
  onExportGoogleSheets,
  onPrint,
}: SummaryPanelProps) {
  if (cabinets.length === 0) {
    return null;
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-cube text-white text-sm"></i>
              </div>
              <div>
                <div className="text-xs text-blue-600">Cabinets</div>
                <div className="text-lg font-bold text-blue-800">
                  {cabinets.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-th-large text-white text-sm"></i>
              </div>
              <div>
                <div className="text-xs text-green-600">Total Panels</div>
                <div className="text-lg font-bold text-green-800">
                  {cuttingListSummary.totalPanels}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-expand text-white text-sm"></i>
              </div>
              <div>
                <div className="text-xs text-purple-600">Total Area</div>
                <div className="text-lg font-bold text-purple-800">
                  {cuttingListSummary.totalArea.toFixed(1)} m²
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-door-open text-white text-sm"></i>
              </div>
              <div>
                <div className="text-xs text-orange-600">Shutters</div>
                <div className="text-lg font-bold text-orange-800">
                  {shutterCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Material Summary Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-gray-900">
            <div className="flex items-center">
              <i className="fas fa-boxes mr-2 text-blue-600"></i>
              Material Requirements
            </div>
            <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow-sm">
              ESTIMATE
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 1. PLYWOOD LIST */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
              <div className="bg-amber-600 text-white px-4 py-2 font-bold text-sm flex items-center">
                <i className="fas fa-layer-group mr-2"></i>
                PLYWOOD SHEETS - Total: {liveMaterialSummary.totalPlywoodSheets}
              </div>
              <div className="divide-y divide-gray-200">
                {Object.keys(liveMaterialSummary.plywood).length > 0 ? (
                  Object.entries(liveMaterialSummary.plywood)
                    .sort(([, a], [, b]) => b - a)
                    .map(([brand, count], idx) => (
                      <div
                        key={brand}
                        className="flex justify-between items-center px-4 py-3 hover:bg-gray-50"
                      >
                        <div className="flex items-center">
                          <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-800">
                            {brand}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-amber-600">
                          {count}
                        </span>
                      </div>
                    ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 italic">
                    No plywood required
                  </div>
                )}
              </div>
            </div>

            {/* 2. LAMINATE LIST */}
            {Object.keys(liveMaterialSummary.laminates).length > 0 && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                <div className="bg-blue-600 text-white px-4 py-2 font-bold text-sm flex items-center">
                  <i className="fas fa-paint-roller mr-2"></i>
                  LAMINATE SHEETS - Total:{" "}
                  {Object.values(liveMaterialSummary.laminates).reduce(
                    (sum, count) => sum + count,
                    0
                  )}
                </div>
                <div className="divide-y divide-gray-200">
                  {Object.entries(liveMaterialSummary.laminates)
                    .sort(([, a], [, b]) => b - a)
                    .map(([code, count], idx) => (
                      <div
                        key={code}
                        className="flex justify-between items-center px-4 py-3 hover:bg-gray-50"
                      >
                        <div className="flex items-center">
                          <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-800">
                            {code}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-blue-600">
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="text-xs text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200 flex items-start">
              <i className="fas fa-info-circle mr-2 mt-0.5"></i>
              <span>
                These are optimized estimates based on actual sheet layout.
                Generate PDF preview for exact counts after optimization.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cutting List Summary */}
      <Card className="bg-white border-gray-200 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-900">
            <i className="fas fa-list-alt mr-2 text-blue-400"></i>
            Cutting List Summary
            <span className="ml-2 px-2 py-1 bg-blue-400/20 text-blue-600 text-xs rounded-full border border-blue-400/30">
              {cuttingListSummary.totalPanels} panels
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cuttingListSummary.panelGroups.map((group, index) => (
              <div
                key={index}
                className="border border-blue-400/30 rounded-lg p-3 bg-blue-50/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-400 rounded-full mr-2 shadow-sm"></div>
                    <span className="font-medium text-sm text-gray-300">
                      {group.laminateCode}
                    </span>
                  </div>
                  <span className="text-xs text-slate-600">
                    {group.panels.length} panels
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                  <div>
                    <div className="font-medium">Total Area:</div>
                    <div>{group.totalArea.toFixed(2)} m²</div>
                  </div>
                  <div>
                    <div className="font-medium">Panels:</div>
                    <div className="max-h-16 overflow-y-auto">
                      {group.panels.slice(0, 3).map((panel, idx) => (
                        <div key={idx} className="text-xs text-slate-500">
                          {panel.width}×{panel.height}mm
                        </div>
                      ))}
                      {group.panels.length > 3 && (
                        <div className="text-xs text-slate-400">
                          +{group.panels.length - 3} more...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="border-t border-slate-200 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-blue-600">Total Panels:</div>
                  <div className="font-semibold text-white">
                    {cuttingListSummary.totalPanels}
                  </div>
                </div>
                <div>
                  <div className="text-blue-600">Total Area:</div>
                  <div className="font-semibold text-white">
                    {cuttingListSummary.totalArea.toFixed(2)} m²
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button
                onClick={onExportExcel}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <i className="fas fa-file-excel mr-1"></i>
                Excel
              </Button>
              <Button
                onClick={onExportGoogleSheets}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <i className="fab fa-google mr-1"></i>
                Sheets
              </Button>
              <Button onClick={onPrint} variant="outline" size="sm">
                <i className="fas fa-print mr-1"></i>
                Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
