import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import SpreadsheetPro from "@/components/SpreadsheetPro";
import { runOptimizerEngine } from "@/lib/optimizer";
import { exportCutlistPDF } from "@/lib/pdf";
import { toast } from "@/hooks/use-toast";
import {
  Layers,
  Box,
  Table2,
  LayoutGrid,
  Play,
  FileDown,
  Loader2,
  Package,
  Scissors,
  AlertCircle,
  ExternalLink,
  FileText,
} from "lucide-react";

const STORAGE_KEY = "cutlist_spreadsheet_v1";

type SpreadsheetRow = {
  id: string;
  height?: string;
  width?: string;
  qty?: string;
  plywoodBrand?: string;
  frontLaminate?: string;
  innerLaminate?: string;
  panelType?: string;
  roomName?: string;
  cabinetName?: string;
};

type OptimizationSheet = {
  sheetId: string;
  brand: string;
  frontLaminate: string;
  innerLaminate: string;
  placed: Array<{
    id: string;
    w: number;
    h: number;
    x: number;
    y: number;
    type: string;
    rotated: boolean;
  }>;
  usedArea: number;
  wasteArea: number;
  efficiency: number;
};

export default function SpreadsheetPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"spreadsheet" | "optimize">("spreadsheet");
  const [rowCount, setRowCount] = useState(0);
  const [rows, setRows] = useState<SpreadsheetRow[]>([]);

  // Optimization state
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [sheetWidth, setSheetWidth] = useState(1220);
  const [sheetHeight, setSheetHeight] = useState(2440);
  const [kerf, setKerf] = useState(4);

  // Load spreadsheet data
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) {
          setRows(data);
          setRowCount(data.length);
        }
      }
    } catch (err) {
      console.error("Error reading spreadsheet data:", err);
    }
  }, [activeTab]);

  const handleRowCountChange = useCallback((count: number) => {
    setRowCount(count);
    // Reload rows when count changes
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) {
          setRows(data);
        }
      }
    } catch (err) {
      console.error("Error reading spreadsheet data:", err);
    }
  }, []);

  // Convert spreadsheet rows to panels for optimizer
  const panelsFromSpreadsheet = useMemo(() => {
    return rows
      .filter(r => r.height && r.width && parseInt(r.height) > 0 && parseInt(r.width) > 0)
      .map((r, idx) => ({
        id: r.id || `panel-${idx}`,
        width: parseInt(r.width || "0"),
        height: parseInt(r.height || "0"),
        quantity: parseInt(r.qty || "1"),
        plywoodBrand: r.plywoodBrand || "Default",
        frontLaminate: r.frontLaminate || "Default",
        innerLaminate: r.innerLaminate || "Default",
        panelType: r.panelType || "PANEL",
        roomName: r.roomName || "",
        cabinetName: r.cabinetName || "",
      }));
  }, [rows]);

  // Run optimization
  const handleOptimize = async () => {
    if (panelsFromSpreadsheet.length === 0) {
      toast({
        title: "No panels to optimize",
        description: "Add panels with valid dimensions first.",
        variant: "destructive",
      });
      return;
    }

    setOptimizing(true);
    setOptimizationResult(null);

    try {
      // Group panels by material (plywood + laminate combo)
      const panelsByMaterial: Record<string, typeof panelsFromSpreadsheet> = {};

      for (const panel of panelsFromSpreadsheet) {
        const key = `${panel.plywoodBrand}|${panel.frontLaminate}|${panel.innerLaminate}`;
        if (!panelsByMaterial[key]) {
          panelsByMaterial[key] = [];
        }
        // Expand by quantity
        for (let i = 0; i < panel.quantity; i++) {
          panelsByMaterial[key].push({ ...panel, quantity: 1 });
        }
      }

      // Create mock cabinets for optimizer (one per material group)
      const mockCabinets = Object.entries(panelsByMaterial).map(([key, panels], idx) => {
        const [plywood, front, inner] = key.split("|");
        return {
          id: `spread-cab-${idx}`,
          name: `Spreadsheet Group ${idx + 1}`,
          height: 720,
          width: 600,
          depth: 550,
          plywoodType: plywood,
          topPanelLaminateCode: front,
          bottomPanelLaminateCode: front,
          leftPanelLaminateCode: front,
          rightPanelLaminateCode: front,
          backPanelLaminateCode: inner,
          shutters: [],
          // Custom panels from spreadsheet
          customPanels: panels.map(p => ({
            width: p.width,
            height: p.height,
            type: p.panelType,
          })),
        };
      });

      // Build manual panels for optimizer
      const manualPanels = panelsFromSpreadsheet.map((p, idx) => ({
        id: `manual-${idx}`,
        width: p.width,
        height: p.height,
        quantity: 1,
        plywoodBrand: p.plywoodBrand,
        frontLaminate: p.frontLaminate,
        innerLaminate: p.innerLaminate,
        panelType: p.panelType,
        targetSheet: "auto",
      }));

      const result = await runOptimizerEngine({
        cabinets: [],
        manualPanels,
        sheetWidth,
        sheetHeight,
        kerf,
        woodGrainsPreferences: {},
        deletedPreviewSheets: [],
        deletedPreviewPanels: [],
      });

      if (result.error) {
        throw new Error(result.error.message || "Optimization failed");
      }

      setOptimizationResult(result);
      toast({
        title: "Optimization complete",
        description: `Generated ${result.brandResults?.reduce((sum: number, br: any) => sum + (br.sheets?.length || 0), 0) || 0} sheets`,
      });
    } catch (err: any) {
      console.error("Optimization error:", err);
      toast({
        title: "Optimization failed",
        description: err.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setOptimizing(false);
    }
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!optimizationResult?.brandResults) return null;

    let totalSheets = 0;
    let totalPanels = 0;
    let totalUsedArea = 0;
    let totalSheetArea = 0;

    for (const br of optimizationResult.brandResults) {
      if (br.sheets) {
        totalSheets += br.sheets.length;
        for (const sheet of br.sheets) {
          totalPanels += sheet.placed?.length || 0;
          totalUsedArea += sheet.usedArea || 0;
          totalSheetArea += sheetWidth * sheetHeight;
        }
      }
    }

    const efficiency = totalSheetArea > 0 ? (totalUsedArea / totalSheetArea) * 100 : 0;

    return {
      totalSheets,
      totalPanels,
      efficiency: efficiency.toFixed(1),
    };
  }, [optimizationResult, sheetWidth, sheetHeight]);

  return (
    <AppLayout
      title="Panel Spreadsheet"
      subtitle="Excel-like editing with cut optimization"
      headerActions={
        <Button
          onClick={() => navigate("/cabinets")}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
        >
          <Box className="w-4 h-4 mr-2" />
          Go to Cabinets
        </Button>
      }
    >
      <div className="h-[calc(100vh-140px)] flex flex-col gap-3">
        {/* Tab Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setActiveTab("spreadsheet")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "spreadsheet"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Table2 className="w-4 h-4" />
              Spreadsheet
            </button>
            <button
              onClick={() => setActiveTab("optimize")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "optimize"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Optimization
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">{rowCount}</span>
              <span className="text-gray-500">panels</span>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === "spreadsheet" ? (
          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <SpreadsheetPro onRowCountChange={handleRowCountChange} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* Optimization Controls */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  {/* Sheet Size */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Sheet W:</label>
                    <input
                      type="number"
                      value={sheetWidth}
                      onChange={(e) => setSheetWidth(parseInt(e.target.value) || 1220)}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Sheet H:</label>
                    <input
                      type="number"
                      value={sheetHeight}
                      onChange={(e) => setSheetHeight(parseInt(e.target.value) || 2440)}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Kerf:</label>
                    <input
                      type="number"
                      value={kerf}
                      onChange={(e) => setKerf(parseInt(e.target.value) || 4)}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Link to Cabinets for full optimization */}
                  <Button
                    variant="outline"
                    onClick={() => navigate("/cabinets")}
                    className="text-gray-600"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Full Optimizer
                  </Button>

                  {/* Export PDF */}
                  {optimizationResult && (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          await exportCutlistPDF({
                            brandResults: optimizationResult.brandResults,
                            cabinets: [],
                            sheetWidth,
                            sheetHeight,
                            kerf,
                            clientName: "Spreadsheet Export",
                            pdfOrientation: "landscape",
                          });
                          toast({ title: "PDF exported successfully" });
                        } catch (err: any) {
                          toast({ title: "PDF export failed", description: err.message, variant: "destructive" });
                        }
                      }}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                  )}

                  <Button
                    onClick={handleOptimize}
                    disabled={optimizing || panelsFromSpreadsheet.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {optimizing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Optimization
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-auto">
              {!optimizationResult ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                  <Scissors className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">No optimization results</p>
                  <p className="text-sm text-center max-w-md mb-4">
                    Add panels in the Spreadsheet tab, then click "Run Optimization" to generate cutting layouts.
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("spreadsheet")}
                    >
                      <Table2 className="w-4 h-4 mr-2" />
                      Go to Spreadsheet
                    </Button>
                    <span className="text-xs text-gray-400">or</span>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/cabinets")}
                    >
                      <Box className="w-4 h-4 mr-2" />
                      Use Cabinets Module
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  {/* Summary */}
                  {summaryStats && (
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                          <Package className="w-4 h-4" />
                          <span className="text-xs font-medium">Total Sheets</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{summaryStats.totalSheets}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-emerald-600 mb-1">
                          <Layers className="w-4 h-4" />
                          <span className="text-xs font-medium">Panels Placed</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-900">{summaryStats.totalPanels}</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-amber-600 mb-1">
                          <Scissors className="w-4 h-4" />
                          <span className="text-xs font-medium">Efficiency</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-900">{summaryStats.efficiency}%</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 flex flex-col justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Save optimization result to localStorage for cabinets to use
                            localStorage.setItem("spreadsheet_optimization_transfer", JSON.stringify({
                              brandResults: optimizationResult.brandResults,
                              panels: panelsFromSpreadsheet,
                              sheetWidth,
                              sheetHeight,
                              kerf,
                              timestamp: Date.now(),
                            }));
                            toast({ title: "Data ready for Cabinets", description: "Go to Cabinets to view full preview" });
                            navigate("/cabinets");
                          }}
                          className="text-purple-700 border-purple-300 hover:bg-purple-100"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open in Cabinets
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Sheet visualizations */}
                  <div className="space-y-4">
                    {optimizationResult.brandResults?.map((br: any, brIdx: number) => (
                      <div key={brIdx}>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          {br.brand || "Default"} - {br.frontLaminate || "Default"} / {br.innerLaminate || "Default"}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {br.sheets?.map((sheet: any, sheetIdx: number) => (
                            <div key={sheetIdx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-600">
                                  Sheet {sheetIdx + 1}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {sheet.placed?.length || 0} panels
                                </span>
                              </div>

                              {/* Mini sheet visualization */}
                              <div
                                className="relative bg-white border border-gray-300 rounded"
                                style={{
                                  aspectRatio: `${sheetWidth}/${sheetHeight}`,
                                  maxHeight: '200px'
                                }}
                              >
                                {sheet.placed?.map((panel: any, pIdx: number) => {
                                  const scaleX = 100 / sheetWidth;
                                  const scaleY = 100 / sheetHeight;
                                  return (
                                    <div
                                      key={pIdx}
                                      className="absolute bg-emerald-200 border border-emerald-400 text-[8px] flex items-center justify-center overflow-hidden"
                                      style={{
                                        left: `${panel.x * scaleX}%`,
                                        top: `${panel.y * scaleY}%`,
                                        width: `${panel.w * scaleX}%`,
                                        height: `${panel.h * scaleY}%`,
                                      }}
                                      title={`${panel.w} x ${panel.h} - ${panel.type || 'PANEL'}`}
                                    >
                                      <span className="truncate px-0.5">{panel.w}x{panel.h}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Sheet stats */}
                              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                <span>
                                  {((sheet.usedArea || 0) / (sheetWidth * sheetHeight) * 100).toFixed(0)}% used
                                </span>
                                <span>{sheetWidth} x {sheetHeight} mm</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* No results warning */}
                  {(!optimizationResult.brandResults || optimizationResult.brandResults.length === 0) && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">No sheets generated</p>
                        <p className="text-xs text-amber-600">Check that your panels have valid dimensions and fit within the sheet size.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
