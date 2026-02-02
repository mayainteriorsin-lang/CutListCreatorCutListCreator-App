/**
 * ProductionHeader Component
 * --------------------------
 * Header bar for Production page with navigation and export buttons.
 */

import React from "react";
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Wrench,
  Zap,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductionHeaderProps {
  onBack: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onRunOptimization: () => void;
  hasData: boolean;
  isOptimizing: boolean;
  isMaterialsSelected: boolean;
}

const ProductionHeader: React.FC<ProductionHeaderProps> = ({
  onBack,
  onExportPdf,
  onExportExcel,
  onRunOptimization,
  hasData,
  isOptimizing,
  isMaterialsSelected,
}) => {
  return (
    <header className="flex-shrink-0 h-14 bg-white border-b border-gray-300">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left: Back button and title */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-black">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
              <Wrench className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-black">Production Cut List</h1>
              <p className="text-[10px] text-gray-500">Click any dimension to edit</p>
            </div>
          </div>
        </div>

        {/* Right: Export buttons */}
        <div className="flex items-center gap-2">
          {/* Optimization button */}
          <div className="relative group">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasData || isOptimizing || !isMaterialsSelected}
              onClick={onRunOptimization}
              className={`gap-2 ${!isMaterialsSelected && hasData ? "border-amber-400 text-amber-600" : "border-gray-400"}`}
            >
              {isOptimizing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : !isMaterialsSelected && hasData ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {isOptimizing ? "Optimizing..." : "Run Optimization"}
            </Button>
            {!isMaterialsSelected && hasData && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg shadow-lg text-xs text-amber-800 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                Select Plywood & Laminate first
              </div>
            )}
          </div>

          {/* PDF Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPdf}
            disabled={!hasData}
            className="gap-2 border-gray-400"
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>

          {/* Excel Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExportExcel}
            disabled={!hasData}
            className="gap-2 border-gray-400"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>
    </header>
  );
};

export default React.memo(ProductionHeader);
