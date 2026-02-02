/**
 * Quotation2DPage - 2D Quotation Page (Decomposed)
 *
 * Main page component that orchestrates the 2D quotation view.
 * Uses extracted hooks for state, drawing, and export functionality.
 * Migrated to V2 Stores.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Stage, Layer, Rect, Line, Group, Image as KonvaImage } from "react-konva";
import { cn } from "@/lib/utils";
import { useDesignCanvasStore } from "../../store/v2/useDesignCanvasStore";
import { useQuotationMetaStore } from "../../store/v2/useQuotationMetaStore";
import type { DrawnUnit } from "../../types";

// Hooks
import { useQuotation2DExport, useQuotation2DDrawing, useQuotation2DState } from "./hooks";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

// Error Boundary
import { Quotation2DErrorBoundary } from "@/components/errors/Quotation2DErrorBoundary";

// Components
import ShutterUnit from "../../components/Canvas/ShutterUnit";
import UnitsCompact from "../../components/Wardrobe/UnitsCompact";
import LaminateCompact from "../../components/Materials/LaminateCompact";
import PriceCompact from "../../components/Pricing/PriceCompact";
import ViewToggle from "../../components/ViewToggle/ViewToggle";
import RoomTabsBar from "../../components/RoomTabs/RoomTabsBar";

// Sub-components
import { Quotation2DHeader } from "./Quotation2DHeader";
import { Quotation2DToolbar } from "./Quotation2DToolbar";
import { Quotation2DThumbnails } from "./Quotation2DThumbnails";
import { CSS3DCanvas } from "./CSS3DCanvas";

// View mode type (Photo or 3D only)
type ViewMode = "photo" | "css3d";

const Quotation2DPage: React.FC = () => {
  const navigate = useNavigate();

  // View mode state (photo or css3d)
  const [viewMode, setViewMode] = useState<ViewMode>("photo");

  // Export hook provides stageRef
  const {
    stageRef,
    isExporting,
    error: exportError,
    copied,
    hasExportData,
    handleExportPDF,
    handleExportExcel,
    handleCopyToClipboard,
    handleWhatsAppShare,
  } = useQuotation2DExport();

  // State hook for local state management
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    dimensions,
    isFullscreen,
    setIsFullscreen,
    canvasFocused,
    setCanvasFocused,
    photoImage,
    containerRef,
    fileInputRef,
    refFileInputRef,
    floor,
    room,
    newUnitType,
    setNewUnitType,
    showAddUnit,
    setShowAddUnit,
    showRateCard,
    setShowRateCard,
    locked,
    allUnitTypes,
    currentRateCardConfig,
    photoTransform,
    handleAddNewUnitType,
    handleUnitTypeChange,
    handleRoomChange,
    handleFloorChange,
    handleMainPhotoUpload,
    handleRefPhotoUpload,
    handleNew,
    handleDelete,
    handleSaveRateCard,
  } = useQuotation2DState({ stageRef });

  // Drawing hook
  const {
    drawStart,
    drawCurrent,
    drawModeType,
    setDrawModeType,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = useQuotation2DDrawing({ canvasFocused });

  // Store values - V2
  const {
    roomPhoto,
    clearRoomPhoto,
    referencePhotos,
    removeReferencePhoto,
    drawMode,
    setDrawMode,
    editMode,
    drawnUnits,
    activeUnitIndex,
    selectedUnitIndices,
    setActiveUnitIndex,
    captureOnlyUnitId,
    updateDrawnUnitById,
    unitType,
    shutterCount,
    setShutterCount,
    sectionCount,
    setSectionCount,
    loftEnabled,
    setLoftEnabled,
    loftShutterCount,
    setLoftShutterCount,
    updateActiveDrawnUnit,
    setActiveEditPart,
    // Actions needed for library unit
    addUnit,
  } = useDesignCanvasStore();

  const { status } = useQuotationMetaStore();

  const activeDrawnUnit = drawnUnits[activeUnitIndex];
  const currentSections = activeDrawnUnit?.sectionCount || sectionCount || 1;

  // Handler for adding a library unit to the canvas
  const handleAddLibraryUnit = (unit: DrawnUnit) => {
    // V2 Store action
    // We need to set active index to new length (since addUnit appends)
    const newIndex = drawnUnits.length;
    addUnit(unit);
    setActiveUnitIndex(newIndex);
    setDrawMode(false);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'e',
      ctrl: true,
      handler: handleExportPDF,
      description: 'Export to PDF',
    },
    {
      key: 's',
      ctrl: true,
      handler: handleExportPDF,
      description: 'Save/Export PDF',
    },
    {
      key: 'd',
      ctrl: true,
      handler: () => setDrawMode(!drawMode),
      description: 'Toggle Draw Mode',
    },
    {
      key: 'Delete',
      handler: () => {
        if (activeUnitIndex >= 0 && !locked) {
          // Delete active unit logic handled in hook defaults or we add specific here if hook doesn't cover
          // Hook covers generic Delete/Backspace
        }
      },
      description: 'Delete Selected Unit',
    },
    {
      key: 'Escape',
      handler: () => {
        if (drawMode) setDrawMode(false);
        setActiveUnitIndex(-1);
      },
      description: 'Clear Selection/Exit Draw Mode',
    },
  ]);

  return (
    <div
      className={cn(
        "h-screen flex flex-col overflow-hidden bg-slate-100",
        isFullscreen && "fixed inset-0 z-50"
      )}
    >
      {/* Header Row 1 & 2 */}
      <Quotation2DHeader
        navigate={navigate}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        locked={locked}
        room={room}
        floor={floor}
        newUnitType={newUnitType}
        setNewUnitType={setNewUnitType}
        showAddUnit={showAddUnit}
        setShowAddUnit={setShowAddUnit}
        allUnitTypes={allUnitTypes}
        unitType={unitType}
        roomPhoto={roomPhoto}
        isExporting={isExporting}
        copied={copied}
        hasExportData={hasExportData}
        fileInputRef={fileInputRef}
        refFileInputRef={refFileInputRef}
        handleNew={handleNew}
        handleDelete={handleDelete}
        handleRoomChange={handleRoomChange}
        handleFloorChange={handleFloorChange}
        handleAddNewUnitType={handleAddNewUnitType}
        handleUnitTypeChange={handleUnitTypeChange}
        handleMainPhotoUpload={handleMainPhotoUpload}
        handleRefPhotoUpload={handleRefPhotoUpload}
        handleExportPDF={handleExportPDF}
        handleExportExcel={handleExportExcel}
        handleCopyToClipboard={handleCopyToClipboard}
        handleWhatsAppShare={handleWhatsAppShare}
        clearRoomPhoto={clearRoomPhoto}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Room Tabs Bar - Always show */}
      <RoomTabsBar />

      {/* Main Content */}
      <main className="flex-1 flex min-h-0">
        {/* Left Sidebar - Always show */}
        <aside
          className={cn(
            "flex-shrink-0 bg-white border-r border-slate-200 flex flex-col transition-all duration-200",
            sidebarCollapsed ? "w-0 overflow-hidden" : "w-[300px]"
          )}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 border-b border-slate-100">
              <UnitsCompact />
            </div>
            <div className="p-3 border-b border-slate-100">
              <LaminateCompact />
            </div>
            <div className="p-3">
              <PriceCompact onOpenRateCard={() => setShowRateCard(true)} />
            </div>
          </div>
        </aside>

        {/* Right Side - Canvas/Photo Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-900">
          {/* Canvas Toolbar - Always show (shared between 2D and 3D) */}
          <Quotation2DToolbar
            drawMode={drawMode}
            drawModeType={drawModeType}
            setDrawModeType={setDrawModeType}
            setDrawMode={setDrawMode}
            locked={locked}
            activeDrawnUnit={activeDrawnUnit}
            shutterCount={shutterCount}
            setShutterCount={setShutterCount}
            currentSections={currentSections}
            setSectionCount={setSectionCount}
            loftEnabled={loftEnabled}
            setLoftEnabled={setLoftEnabled}
            loftShutterCount={loftShutterCount}
            setLoftShutterCount={setLoftShutterCount}
            updateActiveDrawnUnit={updateActiveDrawnUnit}
            setActiveEditPart={setActiveEditPart}
            drawnUnits={drawnUnits}
            activeUnitIndex={activeUnitIndex}
            setActiveUnitIndex={setActiveUnitIndex}
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
            onAddLibraryUnit={handleAddLibraryUnit}
          />

          {/* Main Canvas + Thumbnails (thumbnails on right side) */}
          <div className="flex-1 flex min-h-0">
            {/* Main Canvas Area - Conditional Rendering based on viewMode */}
            {viewMode === "css3d" ? (
              /* CSS 3D View */
              <CSS3DCanvas
                drawnUnits={drawnUnits}
                activeUnitIndex={activeUnitIndex}
                setActiveUnitIndex={setActiveUnitIndex}
                dimensions={dimensions}
                unitType={unitType}
              />
            ) : (
              /* Photo/Drawing View (default) */
              <div
                ref={containerRef}
                tabIndex={0}
                onFocus={() => setCanvasFocused(true)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setCanvasFocused(false);
                  }
                }}
                onClick={() => containerRef.current?.focus()}
                className={cn(
                  "flex-1 min-w-0 min-h-0 relative outline-none",
                  drawMode ? "cursor-crosshair" : "cursor-default",
                  canvasFocused && "ring-2 ring-blue-500/50 ring-inset"
                )}
              >
                <Stage
                  ref={stageRef}
                  width={dimensions.width}
                  height={dimensions.height}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <Layer>
                    {/* Background */}
                    {!captureOnlyUnitId && (
                      <Rect x={0} y={0} width={dimensions.width} height={dimensions.height} fill="#1e293b" />
                    )}

                    {/* Photo as background */}
                    {!captureOnlyUnitId && photoImage && (
                      <KonvaImage
                        image={photoImage}
                        x={photoTransform.x}
                        y={photoTransform.y}
                        width={photoTransform.width}
                        height={photoTransform.height}
                      />
                    )}

                    {/* Grid when no photo */}
                    {!captureOnlyUnitId && !roomPhoto && (
                      <Group>
                        {Array.from({ length: Math.ceil(dimensions.width / 60) }).map((_, i) => (
                          <Line key={`v-${i}`} points={[i * 60, 0, i * 60, dimensions.height]} stroke="#334155" strokeWidth={1} />
                        ))}
                        {Array.from({ length: Math.ceil(dimensions.height / 60) }).map((_, i) => (
                          <Line key={`h-${i}`} points={[0, i * 60, dimensions.width, i * 60]} stroke="#334155" strokeWidth={1} />
                        ))}
                      </Group>
                    )}

                    {/* Drawn units */}
                    {drawnUnits
                      .filter((unit) => !captureOnlyUnitId || unit.id === captureOnlyUnitId)
                      .map((unit) => {
                        const idx = drawnUnits.findIndex((u) => u.id === unit.id);
                        return (
                          <ShutterUnit
                            key={unit.id}
                            unit={unit}
                            isSelected={!captureOnlyUnitId && selectedUnitIndices.includes(idx)}
                            onClick={() => setActiveUnitIndex(idx)}
                            onResize={(newBox) => {
                              if (!locked) {
                                updateDrawnUnitById(unit.id, { box: newBox });
                              }
                            }}
                          />
                        );
                      })}

                    {/* Draw preview */}
                    {drawStart && drawCurrent && (
                      <Rect
                        x={Math.min(drawStart.x, drawCurrent.x)}
                        y={Math.min(drawStart.y, drawCurrent.y)}
                        width={Math.abs(drawCurrent.x - drawStart.x)}
                        height={Math.abs(drawCurrent.y - drawStart.y)}
                        stroke={editMode === "carcass" ? "#6366f1" : "#3b82f6"}
                        strokeWidth={2}
                        fill={editMode === "carcass" ? "rgba(99, 102, 241, 0.15)" : "rgba(59, 130, 246, 0.15)"}
                        dash={[6, 3]}
                      />
                    )}
                  </Layer>
                </Stage>

                {/* Photo info overlay */}
                {roomPhoto && (
                  <div className="absolute bottom-3 left-3 flex items-end gap-2">
                    <div className="bg-black/70 rounded-lg px-2.5 py-1.5 backdrop-blur-sm">
                      <p className="text-white text-xs font-medium">Main Photo</p>
                      <p className="text-slate-400 text-[10px]">
                        {roomPhoto.width} x {roomPhoto.height}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Thumbnails Strip - Right side, only show in photo view */}
            {viewMode === "photo" && (
              <Quotation2DThumbnails
                roomPhoto={roomPhoto}
                referencePhotos={referencePhotos}
                fileInputRef={fileInputRef}
                refFileInputRef={refFileInputRef}
                removeReferencePhoto={removeReferencePhoto}
              />
            )}
          </div>
        </div>
      </main>

    </div>
  );
};

// Wrap in error boundary for production safety
export default function Quotation2DPageWithErrorBoundary() {
  return (
    <Quotation2DErrorBoundary>
      <Quotation2DPage />
    </Quotation2DErrorBoundary>
  );
}
