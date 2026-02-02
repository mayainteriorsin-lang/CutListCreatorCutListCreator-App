/**
 * CanvasStageRoot
 *
 * Main canvas component that orchestrates all subcomponents.
 * Manages store connections and high-level layout.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useDesignCanvasStore } from "../../store/v2/useDesignCanvasStore";
import { useQuotationMetaStore } from "../../store/v2/useQuotationMetaStore";
import { useRoomStore } from "../../store/v2/useRoomStore";
import { useLegacyBridge } from "../../store/v2/useLegacyBridge";
import { useServices } from "../../services/useServices";
import { FloorPlan3D } from "../../features/floor-plan-3d";
import type { FloorPlan3DViewMode, FloorPlan3DHandle } from "../../features/floor-plan-3d";
import Import3DModal from "../modals/Import3DModal";
import { CanvasToolbar } from "./CanvasToolbar";
import { CanvasDrawingLayer } from "./CanvasDrawingLayer";
import { useCanvasInteractions } from "./hooks/useCanvasInteractions";

// Re-export utility functions for external use
export { captureCanvasImage, captureCanvasRegion, setGlobalStageRef, setGridGroupRef } from "./canvasUtils";

export default function CanvasStageRoot() {
  const { pricingService } = useServices();

  // Enable bidirectional sync to ensure legacy components (2D, Services) get updates
  useLegacyBridge({ syncDirection: 'bidirectional' });

  const {
    roomPhoto, referencePhotos,
    drawMode, editMode,
    drawnUnits, setDrawMode,
    setActiveEditPart,
    canvas3DViewEnabled, setCanvas3DViewEnabled,
    setFloorPlanEnabled
  } = useDesignCanvasStore();

  const {
    quotationRooms, activeRoomIndex
  } = useRoomStore();

  const {
    status
  } = useQuotationMetaStore();

  const locked = status === "APPROVED";

  // Refs
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Local state
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isSelected, setIsSelected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasFocused, setCanvasFocused] = useState(false);

  // 3D view state
  const show3DView = canvas3DViewEnabled;
  const setShow3DView = setCanvas3DViewEnabled;
  const [selected3DViewMode, setSelected3DViewMode] = useState<FloorPlan3DViewMode>("perspective");
  const view3DMode: FloorPlan3DViewMode = show3DView ? selected3DViewMode : "top";
  const [exportHandle, setExportHandle] = useState<FloorPlan3DHandle | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [import3DModalOpen, setImport3DModalOpen] = useState(false);

  // Config panel state
  const [configPanelOpen, setConfigPanelOpen] = useState(false);

  // Get interactions hook
  const {
    drawStart,
    drawCurrent,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    deleteCurrentUnit,
  } = useCanvasInteractions({
    locked,
    canvasFocused,
    isSelected,
    setIsSelected,
  });

  // Calculate grand total across all rooms
  const grandTotal = useMemo(() => {
    if (quotationRooms.length === 0) {
      const validUnits = drawnUnits.filter((u) => u.widthMm > 0 && u.heightMm > 0);
      const price = pricingService.calculate(validUnits);
      return price.total;
    }

    let totalSubtotal = 0;
    let totalAddOns = 0;
    quotationRooms.forEach((room, index) => {
      const roomUnits = index === activeRoomIndex ? drawnUnits : room.drawnUnits;
      const roomValidUnits = roomUnits.filter((u) => u.widthMm > 0 && u.heightMm > 0);
      const roomPrice = pricingService.calculate(roomValidUnits);
      totalSubtotal += roomPrice.subtotal;
      totalAddOns += roomPrice.addOnsTotal;
    });
    const grandSubtotal = totalSubtotal + totalAddOns;
    const totalGst = grandSubtotal * 0.18;
    return Math.round(grandSubtotal + totalGst);
  }, [quotationRooms, activeRoomIndex, drawnUnits, pricingService]);

  // Responsive canvas sizing
  useEffect(() => {
    const updateDimensions = () => {
      const ref = canvasContainerRef.current || mainContainerRef.current;
      if (ref) {
        const { width, height } = ref.getBoundingClientRect();
        setDimensions({ width: Math.max(400, width), height: Math.max(300, height) });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (canvasContainerRef.current) resizeObserver.observe(canvasContainerRef.current);
    if (mainContainerRef.current) resizeObserver.observe(mainContainerRef.current);

    return () => {
      window.removeEventListener("resize", updateDimensions);
      resizeObserver.disconnect();
    };
  }, []);

  // Add another unit - enters draw mode for new unit
  const handleAddAnother = useCallback(() => {
    if (locked) return;
    setFloorPlanEnabled(false);
    setShow3DView(false);
    setDrawMode(true);
    setIsSelected(false);
    setActiveEditPart("shutter");
  }, [locked, setDrawMode, setShow3DView, setFloorPlanEnabled, setActiveEditPart]);

  const isDrawingMode = drawMode && (editMode === "shutter" || editMode === "carcass");

  return (
    <div
      ref={mainContainerRef}
      tabIndex={0}
      onFocus={() => setCanvasFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setCanvasFocused(false);
        }
      }}
      onClick={() => {
        mainContainerRef.current?.focus();
      }}
      className={cn(
        "flex-1 min-h-0 h-full flex flex-col rounded-xl overflow-hidden border border-slate-700/60 bg-gradient-to-b from-slate-800 to-slate-800/95 shadow-2xl shadow-black/20 outline-none",
        isFullscreen && "fixed inset-0 z-50 rounded-none border-0",
        canvasFocused && "ring-2 ring-blue-500/50"
      )}
    >
      {/* Toolbar */}
      <CanvasToolbar
        show3DView={show3DView}
        setShow3DView={setShow3DView}
        view3DMode={view3DMode}
        setSelected3DViewMode={setSelected3DViewMode}
        exportHandle={exportHandle}
        isExporting={isExporting}
        setIsExporting={setIsExporting}
        setImport3DModalOpen={setImport3DModalOpen}
        isFullscreen={isFullscreen}
        setIsFullscreen={setIsFullscreen}
        configPanelOpen={configPanelOpen}
        setConfigPanelOpen={setConfigPanelOpen}
        drawMode={drawMode}
        editMode={editMode}
        isSelected={isSelected}
        setIsSelected={setIsSelected}
        grandTotal={grandTotal}
        handleAddAnother={handleAddAnother}
        deleteCurrentUnit={deleteCurrentUnit}
      />

      {/* DRAWING MODE - Shutter/Carcass Canvas with Photo Reference */}
      {isDrawingMode && (
        <div className="flex-1 min-h-0 flex">
          <CanvasDrawingLayer
            dimensions={dimensions}
            drawStart={drawStart}
            drawCurrent={drawCurrent}
            editMode={editMode}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            setIsSelected={setIsSelected}
          />

          {/* RIGHT PANEL - 3D View */}
          <div className="w-1/2 bg-slate-900">
            <FloorPlan3D
              viewMode={view3DMode}
              canvasWidth={dimensions.width / 2}
              canvasHeight={dimensions.height}
              onExportReady={setExportHandle}
            />
          </div>
        </div>
      )}

      {/* 2D/3D VIEW MODE - Full Canvas View */}
      {!isDrawingMode && (
        <div ref={canvasContainerRef} className="flex-1 min-h-0 flex">
          <div className="w-full h-full bg-slate-900">
            <FloorPlan3D
              viewMode={view3DMode}
              canvasWidth={dimensions.width}
              canvasHeight={dimensions.height}
              onExportReady={setExportHandle}
            />
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="flex-shrink-0 px-2 py-0.5 border-t border-slate-700 bg-slate-800/80 flex items-center justify-between text-[9px] text-slate-500">
        <div className="flex items-center gap-2">
          <span>
            {roomPhoto ? `Main: ${roomPhoto.width}×${roomPhoto.height}` : "No main photo"}
          </span>
          {referencePhotos.length > 0 && (
            <span className="text-slate-600">
              | {referencePhotos.length} ref{referencePhotos.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="text-slate-600">
          {dimensions.width}x{dimensions.height}
        </span>
      </div>

      {/* Import 3D Model Modal */}
      <Import3DModal
        open={import3DModalOpen}
        onOpenChange={setImport3DModalOpen}
      />
    </div>
  );
}
