/**
 * CanvasToolbarDropdowns
 *
 * Dropdown components extracted from CanvasToolbar for better organization.
 * Includes View, Layout, Room/DrawTool, and Export dropdowns.
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  Eye,
  Box,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  Rotate3D,
  Square,
  SquareDashedBottom,
  Pencil,
  Layers,
  Download,
  Camera,
  Film,
  FileText,
  Package,
  Trash2,
  Grid3X3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDesignCanvasStore } from "../../store/v2/useDesignCanvasStore";
import type { KitchenLayoutType, FloorPlanDrawMode } from "../../features/floor-plan-3d/state/types";
import type { FloorPlan3DViewMode, FloorPlan3DHandle } from "../../features/floor-plan-3d";

// Floor plan layout options
export const LAYOUT_OPTIONS: { id: KitchenLayoutType; label: string; icon: string }[] = [
  { id: "straight", label: "Straight", icon: "━" },
  { id: "l_shape", label: "L-Shape", icon: "┗" },
  { id: "u_shape", label: "U-Shape", icon: "┗┛" },
  { id: "parallel", label: "Parallel", icon: "═" },
  { id: "island", label: "Island", icon: "▣" },
];

// Floor plan draw tool options
export const DRAW_OPTIONS: { id: FloorPlanDrawMode | "create_4_walls"; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "floor", label: "Floor", icon: <Square className="h-3 w-3" />, color: "amber" },
  { id: "wall", label: "Wall", icon: <Pencil className="h-3 w-3" />, color: "slate" },
  { id: "create_4_walls", label: "Create 4 Walls", icon: <SquareDashedBottom className="h-3 w-3" />, color: "amber" },
  { id: "kitchen_base", label: "Base Unit", icon: <Box className="h-3 w-3" />, color: "green" },
  { id: "kitchen_wall", label: "Wall Unit", icon: <Layers className="h-3 w-3" />, color: "blue" },
];

/**
 * Hook for managing dropdown open/close with click-outside detection
 */
export function useDropdownState() {
  const [layoutDropdownOpen, setLayoutDropdownOpen] = useState(false);
  const [drawToolDropdownOpen, setDrawToolDropdownOpen] = useState(false);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const layoutDropdownRef = useRef<HTMLDivElement>(null);
  const drawToolDropdownRef = useRef<HTMLDivElement>(null);
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (layoutDropdownRef.current && !layoutDropdownRef.current.contains(event.target as Node)) {
        setLayoutDropdownOpen(false);
      }
      if (drawToolDropdownRef.current && !drawToolDropdownRef.current.contains(event.target as Node)) {
        setDrawToolDropdownOpen(false);
      }
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
        setViewDropdownOpen(false);
      }
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
    };

    if (layoutDropdownOpen || drawToolDropdownOpen || viewDropdownOpen || exportDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [layoutDropdownOpen, drawToolDropdownOpen, viewDropdownOpen, exportDropdownOpen]);

  return {
    layoutDropdownOpen, setLayoutDropdownOpen, layoutDropdownRef,
    drawToolDropdownOpen, setDrawToolDropdownOpen, drawToolDropdownRef,
    viewDropdownOpen, setViewDropdownOpen, viewDropdownRef,
    exportDropdownOpen, setExportDropdownOpen, exportDropdownRef,
  };
}

// ============================================================================
// ViewDropdown
// ============================================================================

interface ViewDropdownProps {
  show3DView: boolean;
  setShow3DView: (enabled: boolean) => void;
  view3DMode: FloorPlan3DViewMode;
  setSelected3DViewMode: (mode: FloorPlan3DViewMode) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

export function ViewDropdown({
  show3DView,
  setShow3DView,
  view3DMode,
  setSelected3DViewMode,
  isOpen,
  setIsOpen,
  dropdownRef,
}: ViewDropdownProps) {
  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1 px-2 py-0.5 border rounded text-[9px] font-bold transition-all",
          show3DView ? "bg-purple-500/20 border-purple-500/40 text-purple-300" : "bg-blue-500/20 border-blue-500/40 text-blue-300"
        )}
      >
        {show3DView ? <Box className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        <span>{show3DView ? "3D" : "2D"}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 py-1 bg-slate-800 border border-slate-500 rounded-md shadow-2xl z-[100] min-w-[140px]">
          <div className="px-2 py-1 border-b border-slate-700">
            <div className="flex items-center p-0.5 bg-slate-900/50 rounded">
              <button
                onClick={() => { setShow3DView(false); setIsOpen(false); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[9px] font-medium rounded transition-all",
                  !show3DView ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                2D
              </button>
              <button
                onClick={() => { setShow3DView(true); setIsOpen(false); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[9px] font-medium rounded transition-all",
                  show3DView ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                <Box className="h-2.5 w-2.5" />
                3D
              </button>
            </div>
          </div>
          {show3DView && (
            <>
              <div className="px-2 pt-1 pb-0.5">
                <span className="text-[8px] text-slate-500 uppercase font-semibold">Camera</span>
              </div>
              <button onClick={() => { setSelected3DViewMode("perspective"); setIsOpen(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold hover:bg-slate-700", view3DMode === "perspective" ? "text-purple-400 bg-purple-500/20" : "text-slate-300")}>
                <Eye className="h-3 w-3" /> Perspective
              </button>
              <button onClick={() => { setSelected3DViewMode("top"); setIsOpen(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold hover:bg-slate-700", view3DMode === "top" ? "text-purple-400 bg-purple-500/20" : "text-slate-300")}>
                <ArrowUp className="h-3 w-3" /> Top
              </button>
              <button onClick={() => { setSelected3DViewMode("front"); setIsOpen(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold hover:bg-slate-700", view3DMode === "front" ? "text-purple-400 bg-purple-500/20" : "text-slate-300")}>
                <span className="w-3 h-3 flex items-center justify-center text-[10px]">F</span> Front
              </button>
              <button onClick={() => { setSelected3DViewMode("left"); setIsOpen(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold hover:bg-slate-700", view3DMode === "left" ? "text-purple-400 bg-purple-500/20" : "text-slate-300")}>
                <ArrowLeft className="h-3 w-3" /> Left
              </button>
              <button onClick={() => { setSelected3DViewMode("right"); setIsOpen(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold hover:bg-slate-700", view3DMode === "right" ? "text-purple-400 bg-purple-500/20" : "text-slate-300")}>
                <ArrowRight className="h-3 w-3" /> Right
              </button>
              <button onClick={() => { setSelected3DViewMode("isometric"); setIsOpen(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold hover:bg-slate-700", view3DMode === "isometric" ? "text-purple-400 bg-purple-500/20" : "text-slate-300")}>
                <Rotate3D className="h-3 w-3" /> Isometric
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LayoutDropdown
// ============================================================================

interface LayoutDropdownProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onLayoutSelect: (layoutType: KitchenLayoutType) => void;
}

export function LayoutDropdown({
  isOpen,
  setIsOpen,
  dropdownRef,
  onLayoutSelect,
}: LayoutDropdownProps) {
  const { floorPlan } = useDesignCanvasStore();
  const currentLayout = LAYOUT_OPTIONS.find((l) => l.id === floorPlan.kitchenConfig?.layoutType) || LAYOUT_OPTIONS[0];

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded text-[9px] font-bold text-amber-300"
      >
        <span className="text-sm font-mono">{currentLayout?.icon}</span>
        <span>{currentLayout?.label}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 py-1 bg-slate-800 border border-slate-500 rounded-md shadow-2xl z-[100] min-w-[120px]">
          {LAYOUT_OPTIONS.map((layout) => (
            <button
              key={layout.id}
              onClick={() => { setIsOpen(false); onLayoutSelect(layout.id); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold hover:bg-slate-700",
                floorPlan.kitchenConfig?.layoutType === layout.id ? "text-amber-400 bg-amber-500/20" : "text-slate-300"
              )}
            >
              <span className="text-base font-mono">{layout.icon}</span>
              <span>{layout.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DrawToolDropdown (Room Dropdown)
// ============================================================================

interface DrawToolDropdownProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onCreateAllWalls: () => void;
}

export function DrawToolDropdown({
  isOpen,
  setIsOpen,
  dropdownRef,
  onCreateAllWalls,
}: DrawToolDropdownProps) {
  const { floorPlan, setFloorPlanDrawMode } = useDesignCanvasStore();
  const currentDrawTool = DRAW_OPTIONS.find((d) => d.id === floorPlan.drawMode) || DRAW_OPTIONS[0];

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1 px-2 py-0.5 border rounded text-[9px] font-bold",
          floorPlan.drawMode === "floor" ? "bg-amber-500/20 border-amber-500/40 text-amber-300" :
            floorPlan.drawMode === "wall" ? "bg-slate-500/20 border-slate-500/40 text-slate-300" :
              floorPlan.drawMode === "kitchen_base" ? "bg-green-500/20 border-green-500/40 text-green-300" :
                floorPlan.drawMode === "kitchen_wall" ? "bg-blue-500/20 border-blue-500/40 text-blue-300" :
                  "bg-slate-700/50 border-slate-600 text-slate-300"
        )}
      >
        {currentDrawTool?.icon}
        <span>Room</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 py-1 bg-slate-800 border border-slate-500 rounded-md shadow-2xl z-[100] min-w-[130px]">
          {DRAW_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                setIsOpen(false);
                if (option.id === "create_4_walls") {
                  onCreateAllWalls();
                } else {
                  setFloorPlanDrawMode(option.id as FloorPlanDrawMode);
                }
              }}
              disabled={option.id === "create_4_walls" && floorPlan.floors.length === 0}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold hover:bg-slate-700",
                option.id === "create_4_walls" && floorPlan.floors.length === 0
                  ? "text-slate-500 cursor-not-allowed"
                  : floorPlan.drawMode === option.id
                    ? option.color === "green" ? "text-green-400 bg-green-500/20" :
                      option.color === "amber" ? "text-amber-400 bg-amber-500/20" :
                        option.color === "slate" ? "text-slate-200 bg-slate-500/20" :
                          "text-blue-400 bg-blue-500/20"
                    : "text-slate-300"
              )}
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ExportDropdown
// ============================================================================

interface ExportDropdownProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  exportHandle: FloorPlan3DHandle | null;
  isExporting: boolean;
  setIsExporting: (value: boolean) => void;
  setImport3DModalOpen: (open: boolean) => void;
}

export function ExportDropdown({
  isOpen,
  setIsOpen,
  dropdownRef,
  exportHandle,
  isExporting,
  setIsExporting,
  setImport3DModalOpen,
}: ExportDropdownProps) {
  const { clearFloorPlan } = useDesignCanvasStore();

  const handleScreenshot = useCallback(async () => {
    setIsOpen(false);
    if (!exportHandle || isExporting) return;
    setIsExporting(true);
    try {
      const dataUrl = await exportHandle.captureScreenshot("png");
      if (dataUrl) {
        const link = document.createElement("a");
        link.download = `3d-view-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } finally {
      setIsExporting(false);
    }
  }, [exportHandle, isExporting, setIsExporting, setIsOpen]);

  const handlePanorama = useCallback(async () => {
    setIsOpen(false);
    if (!exportHandle || isExporting) return;
    setIsExporting(true);
    try {
      const frames = await exportHandle.capture360Panorama(24);
      if (frames.length > 0) {
        const link = document.createElement("a");
        link.download = `3d-panorama-${Date.now()}.png`;
        link.href = frames[0]!;
        link.click();
      }
    } finally {
      setIsExporting(false);
    }
  }, [exportHandle, isExporting, setIsExporting, setIsOpen]);

  const handleExportPDF = useCallback(async () => {
    setIsOpen(false);
    if (!exportHandle || isExporting) return;
    setIsExporting(true);
    try {
      await exportHandle.exportToPDF("3D Room Design");
    } finally {
      setIsExporting(false);
    }
  }, [exportHandle, isExporting, setIsExporting, setIsOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-0.5 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 rounded text-[9px] font-bold text-slate-300"
      >
        <Download className="h-3 w-3" />
        <span>Export</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 py-1 bg-slate-800 border border-slate-500 rounded-md shadow-2xl z-[100] min-w-[150px]">
          <button
            onClick={handleScreenshot}
            disabled={!exportHandle || isExporting}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold hover:bg-slate-700 text-slate-300 disabled:opacity-50"
          >
            <Camera className="h-3 w-3" /> Screenshot (PNG)
          </button>
          <button
            onClick={handlePanorama}
            disabled={!exportHandle || isExporting}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold hover:bg-slate-700 text-slate-300 disabled:opacity-50"
          >
            <Film className="h-3 w-3" /> 360° Panorama
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!exportHandle || isExporting}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold hover:bg-slate-700 text-slate-300 disabled:opacity-50"
          >
            <FileText className="h-3 w-3" /> Export to PDF
          </button>
          <div className="border-t border-slate-700 my-1" />
          <button
            onClick={() => { setIsOpen(false); setImport3DModalOpen(true); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold hover:bg-slate-700 text-amber-300"
          >
            <Package className="h-3 w-3" /> Import 3D Model
          </button>
          <div className="border-t border-slate-700 my-1" />
          <button
            onClick={() => { setIsOpen(false); clearFloorPlan(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold hover:bg-red-500/20 text-red-400"
          >
            <Trash2 className="h-3 w-3" /> Clear Floor Plan
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// GridToggle (Simple button, not a dropdown)
// ============================================================================

export function GridToggle() {
  const { floorPlan, toggleFloorPlanGrid } = useDesignCanvasStore();

  return (
    <button
      onClick={toggleFloorPlanGrid}
      className={cn(
        "p-1 rounded border text-[9px] font-bold",
        floorPlan.showGrid
          ? "bg-slate-500/30 border-slate-500/50 text-white"
          : "border-slate-600 text-slate-400 hover:text-white hover:bg-slate-600/50"
      )}
      title="Toggle Grid"
    >
      <Grid3X3 className="h-3 w-3" />
    </button>
  );
}
