/**
 * ProductionPage - Refactored (SaaS Architecture)
 * ------------------------------------------------
 * This page is an ORCHESTRATOR only.
 * - Business logic lives in productionService.ts
 * - State management lives in useProductionState.ts
 * - localStorage abstraction lives in storageService.ts
 * - UI components are separated into /components folder
 *
 * Route: /2d-quotation/production
 */

import React, { useCallback, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Zap, Loader2 } from "lucide-react";

// Hooks
import { useProductionState } from "./hooks/useProductionState";
import { useOptimization } from "../../hooks/useOptimization";

// Components
import {
  ProductionHeader,
  ProductionMaterialBar,
  ProductionUnitCard,
} from "./components";

// Engine (pure functions - untouched)
import {
  exportProductionExcel,
  exportProductionPDF,
} from "../../engine/productionExportEngine";

// Optimization preview
import { SheetPreview } from "@/components/optimization/SheetPreview";

// Service constants
import { DEFAULT_GAP_MM } from "../../services/productionService";

const ProductionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Detect route context
  const is2DQuotation = location.pathname.includes("/2d-quotation");
  const baseRoute = is2DQuotation ? "/2d-quotation" : "/3d-quotation";

  // Optimization dialog state
  const [showOptimization, setShowOptimization] = useState(false);

  // Get all production state from hook
  const {
    items,
    cadGroups,
    hasData,
    stats,
    materials,
    setPlywood,
    setFrontLaminate,
    setInnerLaminate,
    isMaterialsSelected,
    panelOverrides,
    handlePanelDimensionChange,
    gaddiSettings,
    handleToggleGaddi,
    grainSettings,
    handleDeletePanel,
    unitGapSettings,
    handleGapChange,
    editing,
    editValue,
    startEdit,
    handleValueChange,
    closeEdit,
    storeData,
  } = useProductionState();

  // Optimization hook
  const {
    isOptimizing,
    optimizationResult,
    runOptimization,
    clearResult,
    sheetWidth,
    sheetHeight,
    kerf,
  } = useOptimization();

  // Navigation
  const handleBack = useCallback(() => {
    const params = searchParams.toString();
    navigate(`${baseRoute}${params ? `?${params}` : ""}`);
  }, [navigate, baseRoute, searchParams]);

  // Export handlers
  const handleExportPdf = useCallback(() => {
    if (!hasData) return alert("Add unit dimensions first.");
    exportProductionPDF({
      client: storeData.client,
      meta: storeData.meta,
      items,
      settings: storeData.productionSettings,
      canvasSnapshots: storeData.productionCanvasSnapshots,
      materials: {
        plywood: materials.plywood,
        frontLaminate: materials.frontLaminate,
        innerLaminate: materials.innerLaminate,
      },
      grainSettings,
      gaddiSettings,
      panelOverrides,
      unitGapSettings,
    });
  }, [hasData, storeData, items, materials, grainSettings, gaddiSettings, panelOverrides, unitGapSettings]);

  const handleExportExcel = useCallback(() => {
    if (!hasData) return alert("Add unit dimensions first.");
    exportProductionExcel({
      client: storeData.client,
      meta: storeData.meta,
      items,
      settings: storeData.productionSettings,
    });
  }, [hasData, storeData, items]);

  // Optimization
  const handleRunOptimization = useCallback(async () => {
    if (!hasData) return alert("Add unit dimensions first.");
    if (!isMaterialsSelected) {
      alert("Please select Plywood, Front Laminate, and Inner Laminate before running optimization.");
      return;
    }
    await runOptimization(
      items,
      {
        plywoodBrand: materials.plywood,
        frontLaminate: materials.frontLaminate,
        innerLaminate: materials.innerLaminate,
      },
      {
        grainSettings,
        gaddiSettings,
      }
    );
    setShowOptimization(true);
  }, [hasData, isMaterialsSelected, items, materials, grainSettings, gaddiSettings, runOptimization]);

  const handleCloseOptimization = useCallback(() => {
    setShowOptimization(false);
    clearResult();
  }, [clearResult]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <ProductionHeader
        onBack={handleBack}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onRunOptimization={handleRunOptimization}
        hasData={hasData}
        isOptimizing={isOptimizing}
        isMaterialsSelected={isMaterialsSelected}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            Add unit dimensions in quotation to see production view.
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Stats + Material Selection */}
            <ProductionMaterialBar
              stats={stats}
              materials={materials}
              onPlywoodChange={setPlywood}
              onFrontLaminateChange={setFrontLaminate}
              onInnerLaminateChange={setInnerLaminate}
            />

            {/* Unit Cards */}
            <div className="space-y-4">
              {cadGroups.map((group) => (
                <ProductionUnitCard
                  key={group.key}
                  group={group}
                  gapMm={unitGapSettings[group.key] ?? DEFAULT_GAP_MM}
                  canvasSnapshot={storeData.productionCanvasSnapshots.get(group.unitId)}
                  editing={editing}
                  editValue={editValue}
                  panelOverrides={panelOverrides}
                  frontLaminate={materials.frontLaminate}
                  innerLaminate={materials.innerLaminate}
                  grainSettings={grainSettings}
                  gaddiSettings={gaddiSettings}
                  onStartEdit={startEdit}
                  onValueChange={handleValueChange}
                  onCloseEdit={closeEdit}
                  onPanelDimensionChange={handlePanelDimensionChange}
                  onGapChange={handleGapChange}
                  onToggleGaddi={handleToggleGaddi}
                  onDeletePanel={handleDeletePanel}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Optimization Results Dialog */}
      <Dialog open={showOptimization} onOpenChange={setShowOptimization}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Sheet Optimization Results
              </div>
              {optimizationResult && (
                <div className="flex items-center gap-4 text-sm font-normal">
                  <span className="text-gray-600">
                    Sheets: <span className="font-bold text-black">{optimizationResult.totalSheets}</span>
                  </span>
                  <span className="text-gray-600">
                    Efficiency: <span className={`font-bold ${optimizationResult.efficiency >= 85 ? 'text-green-600' : optimizationResult.efficiency >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {optimizationResult.efficiency}%
                    </span>
                  </span>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          {optimizationResult ? (
            <div className="space-y-4">
              {optimizationResult.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <p className="font-medium">Optimization Error</p>
                  <p className="text-sm mt-1">{optimizationResult.error}</p>
                </div>
              )}

              {optimizationResult.skippedCount && optimizationResult.skippedCount > 0 && !optimizationResult.error && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                  ⚠️ {optimizationResult.skippedCount} panel(s) were too large for the sheet and were skipped.
                </div>
              )}

              {optimizationResult.brandResults.map((brandResult, idx) => (
                <SheetPreview
                  key={idx}
                  brandResult={brandResult}
                  sheetWidth={sheetWidth}
                  sheetHeight={sheetHeight}
                  kerf={kerf}
                  companyName={storeData.client?.name || "Production Cut List"}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mr-3" />
              Running optimization...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductionPage;
