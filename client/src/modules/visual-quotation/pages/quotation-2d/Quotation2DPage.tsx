/**
 * Quotation2DPage - 2D Quotation Page (Redesigned)
 *
 * Full-screen layout with single toolbar and auto-hiding left panel.
 * Clean, minimal design maximizing canvas space.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Stage, Layer, Rect, Line, Group, Image as KonvaImage } from "react-konva";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Trash2,
  FileText,
  FileSpreadsheet,
  Share2,
  Loader2,
  Cuboid,
  Image,
  Settings2,
  Maximize2,
  Minimize2,
  Grid3X3,
  MoreVertical,
  Lock,
  Unlock,
  Plus,
  FilePlus,
  Calculator,
  Download,
  X,
  Menu,
  Home,
  Layers,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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
import { LibraryQuickPicker } from "../../components/LibraryQuickPicker";
import { FLOOR_OPTIONS, ROOM_OPTIONS, formatUnitTypeLabel } from "../../constants";
import { CSS3DCanvas } from "./CSS3DCanvas";
import { Quotation2DThumbnails } from "./Quotation2DThumbnails";
import ViewToggle from "../../components/ViewToggle/ViewToggle";

type ViewMode = "photo" | "css3d";

const Quotation2DPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("photo");
  const [showConfig, setShowConfig] = useState(false);
  const [showAddUnitTypeInput, setShowAddUnitTypeInput] = useState(false);

  // Export hook
  const {
    stageRef,
    isExporting,
    hasExportData,
    handleExportPDF,
    handleExportExcel,
    handleWhatsAppShare,
  } = useQuotation2DExport();

  // State hook
  const {
    dimensions,
    recalculateDimensions,
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
    setShowRateCard,
    locked,
    allUnitTypes,
    photoTransform,
    handleAddNewUnitType,
    handleRoomChange,
    handleFloorChange,
    handleMainPhotoUpload,
    handleRefPhotoUpload,
    handleNew,
    handleDelete,
  } = useQuotation2DState({ stageRef });

  // Recalculate dimensions when view mode changes (thumbnails panel appears/disappears)
  useEffect(() => {
    // Small delay to allow DOM to update after view switch
    const timer = setTimeout(() => {
      recalculateDimensions();
    }, 50);
    return () => clearTimeout(timer);
  }, [viewMode, recalculateDimensions]);

  // Drawing hook
  const {
    drawStart,
    drawCurrent,
    drawModeType,
    setDrawModeType,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useQuotation2DDrawing({ canvasFocused });

  // Store values
  const {
    roomPhoto,
    clearRoomPhoto,
    referencePhotos,
    removeReferencePhoto,
    drawMode,
    setDrawMode,
    drawnUnits,
    activeUnitIndex,
    selectedUnitIndices,
    setActiveUnitIndex,
    captureOnlyUnitId,
    updateDrawnUnitById,
    unitType,
    addUnit,
    deleteUnit,
    deleteSelectedUnits,
    undo,
    redo,
    // Multi-canvas support
    activeCanvasIndex,
    addNewCanvas,
    switchCanvas,
    getCanvasNames,
    deleteCanvas,
    // Custom floor/room support
    addCustomFloor,
    addCustomRoom,
    getAllFloors,
    getAllRooms,
  } = useDesignCanvasStore();

  const { client, setClientField } = useQuotationMetaStore();

  const activeDrawnUnit = drawnUnits[activeUnitIndex];

  // Calculate totals
  const totalPrice = drawnUnits.reduce((sum, u) => sum + (u.price || 0), 0);

  // Handler for library unit
  const handleAddLibraryUnit = (unit: DrawnUnit) => {
    const newIndex = drawnUnits.length;
    addUnit(unit);
    setActiveUnitIndex(newIndex);
    setDrawMode(false);
  };

  // Keyboard shortcuts
  // Note: Backspace is NOT used for delete - only Delete key works for units
  useKeyboardShortcuts([
    { key: 'e', ctrl: true, handler: handleExportPDF, description: 'Export PDF' },
    { key: 'd', ctrl: true, handler: () => setDrawMode(!drawMode), description: 'Toggle Draw' },
    { key: 'z', ctrl: true, handler: undo, description: 'Undo' },
    { key: 'y', ctrl: true, handler: redo, description: 'Redo' },
    { key: 'Escape', handler: () => { setDrawMode(false); setActiveUnitIndex(-1); }, description: 'Clear Selection' },
    { key: 'Delete', handler: () => { if (activeUnitIndex >= 0) deleteUnit(activeUnitIndex); }, description: 'Delete Selected Unit' },
    { key: 'a', ctrl: true, handler: () => { /* Select all - could implement multi-select */ }, description: 'Select All' },
    { key: 'n', ctrl: true, handler: handleNew, description: 'New Canvas' },
    { key: 'f', handler: () => setIsFullscreen(!isFullscreen), description: 'Toggle Fullscreen' },
  ]);

  return (
    <div className={cn(
      "h-screen flex flex-col overflow-hidden bg-slate-900",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Single Compact Toolbar */}
      <header className="flex-shrink-0 h-10 bg-slate-800/95 backdrop-blur border-b border-slate-700/50 px-1 sm:px-2 flex items-center justify-between z-20">
        {/* Left: Back + Menu + Client */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => navigate("/")}
            className="h-7 w-7 rounded-md bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Hamburger Menu - New Canvas, Floor, Room */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 rounded-md bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <Menu className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={handleNew} className="text-xs">
                <FilePlus className="h-3.5 w-3.5 mr-2" />
                New Canvas
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {/* Floor Sub-menu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs">
                  <Layers className="h-3.5 w-3.5 mr-2" />
                  Floor
                  <span className="ml-auto text-[10px] text-slate-500">{floor}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-36">
                  {FLOOR_OPTIONS.map((f) => (
                    <DropdownMenuItem
                      key={f.value}
                      onClick={() => handleFloorChange(f.value)}
                      className={cn("text-xs", floor === f.value && "bg-blue-100 dark:bg-blue-900")}
                    >
                      {f.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Room Sub-menu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs">
                  <Home className="h-3.5 w-3.5 mr-2" />
                  Room
                  <span className="ml-auto text-[10px] text-slate-500">{room}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-36">
                  {ROOM_OPTIONS.map((r) => (
                    <DropdownMenuItem
                      key={r.value}
                      onClick={() => handleRoomChange(r.value)}
                      className={cn("text-xs", room === r.value && "bg-blue-100 dark:bg-blue-900")}
                    >
                      {r.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Mobile-only: Client info */}
              <DropdownMenuSeparator className="md:hidden" />
              <DropdownMenuLabel className="md:hidden text-[10px] text-slate-500">Client Info</DropdownMenuLabel>
              <div className="md:hidden px-2 py-1 space-y-1">
                <Input
                  type="text"
                  placeholder="Client Name"
                  value={client.name}
                  onChange={(e) => setClientField("name", e.target.value)}
                  className="h-6 text-xs"
                />
                <Input
                  type="text"
                  placeholder="Location"
                  value={client.location}
                  onChange={(e) => setClientField("location", e.target.value)}
                  className="h-6 text-xs"
                />
              </div>

              {/* Mobile-only: Rate Card */}
              <DropdownMenuSeparator className="md:hidden" />
              <DropdownMenuItem onClick={() => navigate("/rate-cards")} className="md:hidden text-xs">
                <Calculator className="h-3.5 w-3.5 mr-2" />
                Rate Card
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Client inputs - hidden on mobile, visible from md up */}
          <div className="hidden md:flex items-center gap-1 bg-slate-700/30 rounded px-2 py-1">
            <Input
              type="text"
              placeholder="Client Name"
              value={client.name}
              onChange={(e) => setClientField("name", e.target.value)}
              className="h-5 w-32 border-0 bg-transparent text-xs text-white placeholder:text-slate-500 focus-visible:ring-0 p-0"
            />
            <span className="text-slate-600">|</span>
            <Input
              type="text"
              placeholder="Location"
              value={client.location}
              onChange={(e) => setClientField("location", e.target.value)}
              className="h-5 w-24 border-0 bg-transparent text-xs text-white placeholder:text-slate-500 focus-visible:ring-0 p-0"
            />
          </div>
        </div>

        {/* Center: View Mode Toggle */}
        <div className="flex items-center gap-1 sm:gap-1.5">

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-700/50 rounded p-0.5">
            <button
              onClick={() => viewMode === "photo" ? fileInputRef.current?.click() : setViewMode("photo")}
              className={cn(
                "h-6 px-1.5 sm:px-2 rounded text-[10px] sm:text-[11px] flex items-center gap-0.5 sm:gap-1 transition-colors",
                viewMode === "photo" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              <Image className="h-3 w-3" />
              <span className="hidden xs:inline">Photo</span>
            </button>
            <button
              onClick={() => setViewMode("css3d")}
              className={cn(
                "h-6 px-1.5 sm:px-2 rounded text-[10px] sm:text-[11px] flex items-center gap-0.5 sm:gap-1 transition-colors",
                viewMode === "css3d" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              <Cuboid className="h-3 w-3" />
              <span className="hidden xs:inline">Iso</span>
            </button>
          </div>

          {roomPhoto && (
            <button
              onClick={clearRoomPhoto}
              className="h-6 w-6 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Right: Actions + Price */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Draw Mode Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-1.5 sm:px-2 text-[10px] sm:text-[11px] gap-0.5 sm:gap-1",
                  drawMode ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                <Grid3X3 className="h-3 w-3" />
                <span className="hidden sm:inline">Draw</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem
                onClick={() => { setDrawModeType("shutter"); setDrawMode(true); }}
                className={cn("text-xs", drawModeType === "shutter" && drawMode && "bg-blue-100 dark:bg-blue-900")}
              >
                <div className="w-4 h-4 mr-2 border border-slate-400 rounded-sm flex items-center justify-center text-[8px]">▯</div>
                Shutter Only
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setDrawModeType("shutter_loft"); setDrawMode(true); }}
                className={cn("text-xs", drawModeType === "shutter_loft" && drawMode && "bg-blue-100 dark:bg-blue-900")}
              >
                <div className="w-4 h-4 mr-2 border border-slate-400 rounded-sm flex flex-col">
                  <div className="h-1/4 border-b border-slate-300 bg-slate-200" />
                  <div className="flex-1" />
                </div>
                Shutter + Loft
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setDrawModeType("loft_only"); setDrawMode(true); }}
                className={cn("text-xs", drawModeType === "loft_only" && drawMode && "bg-blue-100 dark:bg-blue-900")}
              >
                <div className="w-4 h-4 mr-2 border border-slate-400 rounded-sm bg-slate-200" />
                Loft Only
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { setDrawModeType("carcass"); setDrawMode(true); }}
                className={cn("text-xs", drawModeType === "carcass" && drawMode && "bg-amber-100 dark:bg-amber-900")}
              >
                <div className="w-4 h-4 mr-2 border-2 border-amber-500 rounded-sm flex">
                  <div className="w-1/3 border-r border-amber-400" />
                  <div className="w-1/3 border-r border-amber-400" />
                  <div className="w-1/3" />
                </div>
                Carcass Only
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setDrawModeType("carcass_loft"); setDrawMode(true); }}
                className={cn("text-xs", drawModeType === "carcass_loft" && drawMode && "bg-amber-100 dark:bg-amber-900")}
              >
                <div className="w-4 h-4 mr-2 border-2 border-amber-500 rounded-sm flex flex-col">
                  <div className="h-1/4 border-b border-amber-400 bg-amber-200" />
                  <div className="flex-1 flex">
                    <div className="w-1/3 border-r border-amber-400" />
                    <div className="w-1/3 border-r border-amber-400" />
                    <div className="w-1/3" />
                  </div>
                </div>
                Carcass + Loft
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { setDrawModeType("iso_kitchen"); setDrawMode(true); }}
                className={cn("text-xs", drawModeType === "iso_kitchen" && drawMode && "bg-blue-100 dark:bg-blue-900")}
              >
                <Cuboid className="h-4 w-4 mr-2 text-orange-500" />
                Kitchen Base
              </DropdownMenuItem>
              {drawMode && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDrawMode(false)}
                    className="text-xs text-red-500"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Exit Draw Mode
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Library Quick Picker - Load saved wardrobe templates - hidden on mobile */}
          <div className="hidden md:block">
            <LibraryQuickPicker onSelectModule={handleAddLibraryUnit} />
          </div>

          {/* Rate Card quick access - hidden on mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/rate-cards")}
            className="hidden md:flex h-7 px-2 text-[11px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
          >
            <Calculator className="h-3 w-3 mr-1" />
            Rates
          </Button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className={cn(
              "h-7 w-7 rounded flex items-center justify-center transition-colors",
              showConfig ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>

          {/* More Tools Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setDrawMode(true)} className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-2" />
                Add Unit (Draw)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => activeUnitIndex >= 0 && deleteUnit(activeUnitIndex)}
                disabled={activeUnitIndex < 0}
                className="text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete Selected Unit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={deleteSelectedUnits}
                disabled={selectedUnitIndices.length === 0}
                className="text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete All Selected ({selectedUnitIndices.length})
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/rate-cards")} className="text-xs">
                <Calculator className="h-3.5 w-3.5 mr-2" />
                Rate Card
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs">
                {locked ? (
                  <>
                    <Lock className="h-3.5 w-3.5 mr-2" />
                    Canvas Locked
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5 mr-2" />
                    Canvas Unlocked
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleNew} className="text-xs">
                <FilePlus className="h-3.5 w-3.5 mr-2" />
                New Canvas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-xs text-red-500">
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Clear All Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-5 bg-slate-600 hidden sm:block" />

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-7 px-1.5 sm:px-2 rounded flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                disabled={isExporting}
              >
                {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                <span className="hidden sm:inline">Export</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={handleExportPDF}
                disabled={!hasExportData}
                className="text-xs"
              >
                <FileText className="h-3.5 w-3.5 mr-2 text-red-500" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportExcel}
                disabled={!hasExportData}
                className="text-xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-green-500" />
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleWhatsAppShare}
                disabled={!hasExportData}
                className="text-xs"
              >
                <Share2 className="h-3.5 w-3.5 mr-2 text-blue-500" />
                Share via WhatsApp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-5 bg-slate-600 hidden sm:block" />

          {/* Total Price - compact on mobile */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-emerald-500/20 rounded px-1.5 sm:px-2 py-1">
            <span className="text-[10px] text-emerald-400">₹</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-400">{totalPrice.toLocaleString('en-IN')}</span>
            <span className="text-[9px] sm:text-[10px] text-emerald-400/70 hidden xs:inline">({drawnUnits.length})</span>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="hidden sm:flex h-7 w-7 rounded text-slate-400 hover:text-white hover:bg-slate-700 items-center justify-center"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          <div className="w-px h-5 bg-slate-600 hidden md:block" />

          {/* 2D/3D Page Toggle - hidden on small mobile */}
          <div className="hidden sm:block">
            <ViewToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex min-h-0 relative">
        {/* Manual Toggle Config Panel - Overlay on mobile, sidebar on desktop */}
        {showConfig && (
          <>
            {/* Mobile backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setShowConfig(false)}
            />
            <aside className={cn(
              "bg-white/95 backdrop-blur shadow-xl flex-shrink-0 z-50 flex flex-col",
              // Mobile: full screen overlay
              "fixed inset-0 w-full h-full",
              // Desktop: sidebar
              "md:static md:h-full md:w-[280px]"
            )}>
              {/* Panel Header with Close Button */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
                <span className="text-xs font-semibold text-slate-600">Configuration</span>
                <button
                  onClick={() => setShowConfig(false)}
                  className="h-6 w-6 rounded hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4 md:hidden" />
                  <ChevronLeft className="h-4 w-4 hidden md:block" />
                </button>
              </div>
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
          </>
        )}

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Current Location Indicator - Always visible with dropdowns */}
          <div className="flex-shrink-0 bg-blue-600 px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {/* Floor Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-[10px] sm:text-xs text-white/90 hover:text-white hover:bg-blue-500 px-1.5 sm:px-2 py-0.5 rounded flex items-center gap-0.5 sm:gap-1 transition-colors flex-shrink-0">
                  {getAllFloors().find(f => f.value === floor)?.label || floor.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuLabel className="text-[10px] text-slate-500">Select Floor</DropdownMenuLabel>
                {getAllFloors().map((f) => {
                  const hasUnits = Object.keys(useDesignCanvasStore.getState().roomUnits).some(
                    key => key.startsWith(`${f.value}_`) && useDesignCanvasStore.getState().roomUnits[key]?.length > 0
                  );
                  return (
                    <DropdownMenuItem
                      key={f.value}
                      onClick={() => handleFloorChange(f.value)}
                      className={cn("text-xs flex items-center justify-between", floor === f.value && "bg-blue-100 dark:bg-blue-900")}
                    >
                      <span>{f.label}</span>
                      {hasUnits && <span className="w-2 h-2 rounded-full bg-green-500" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add New Floor Button */}
            <button
              onClick={addCustomFloor}
              className="text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-blue-500 text-white hover:bg-blue-400 transition-colors flex-shrink-0"
              title="Add new floor"
            >
              <Plus className="h-3 w-3" />
            </button>

            <ChevronRight className="h-3 w-3 text-white/50 flex-shrink-0" />

            {/* Room Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-[10px] sm:text-xs text-white font-medium hover:bg-blue-500 px-1.5 sm:px-2 py-0.5 rounded flex items-center gap-0.5 sm:gap-1 transition-colors flex-shrink-0">
                  {getAllRooms().find(r => r.value === room)?.label || room.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 max-h-64 overflow-y-auto">
                <DropdownMenuLabel className="text-[10px] text-slate-500">Select Room</DropdownMenuLabel>
                {getAllRooms().map((r) => {
                  const roomKey = `${floor}_${r.value}`;
                  const roomUnits = useDesignCanvasStore.getState().roomUnits[roomKey];
                  const unitCount = roomUnits?.length || 0;
                  const isCurrentRoom = room === r.value;
                  const currentUnits = isCurrentRoom ? drawnUnits.length : unitCount;
                  return (
                    <DropdownMenuItem
                      key={r.value}
                      onClick={() => handleRoomChange(r.value)}
                      className={cn("text-xs flex items-center justify-between", room === r.value && "bg-blue-100 dark:bg-blue-900")}
                    >
                      <span>{r.label}</span>
                      {currentUnits > 0 && (
                        <span className="text-[10px] bg-green-500 text-white px-1.5 rounded-full">
                          {currentUnits}
                        </span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add New Room Button */}
            <button
              onClick={addCustomRoom}
              className="text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-blue-500 text-white hover:bg-blue-400 transition-colors flex-shrink-0"
              title="Add new room"
            >
              <Plus className="h-3 w-3" />
            </button>

            {/* Unit Type Dropdown - always shown, changes selected unit or sets default for new units */}
            <ChevronRight className="h-3 w-3 text-white/50 flex-shrink-0" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "text-[10px] font-medium hover:bg-blue-500 px-1.5 sm:px-2 py-0.5 rounded flex items-center gap-0.5 sm:gap-1 transition-colors flex-shrink-0",
                  activeDrawnUnit
                    ? "text-yellow-300 border border-yellow-400/50"
                    : "text-white/80 border border-white/30"
                )}>
                  {formatUnitTypeLabel(activeDrawnUnit?.unitType || unitType || 'wardrobe')}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 max-h-64 overflow-y-auto">
                <DropdownMenuLabel className="text-[10px] text-slate-500">
                  {activeDrawnUnit ? "Change Unit Type" : "Default Unit Type"}
                </DropdownMenuLabel>
                {allUnitTypes.map((ut) => {
                  const currentType = activeDrawnUnit?.unitType || unitType || 'wardrobe';
                  const isSelected = currentType === ut.value;
                  return (
                    <DropdownMenuItem
                      key={ut.value}
                      onClick={() => {
                        if (activeDrawnUnit) {
                          updateDrawnUnitById(activeDrawnUnit.id, { unitType: ut.value });
                        } else {
                          // Set default type for new units
                          useDesignCanvasStore.getState().setUnitType(ut.value);
                        }
                      }}
                      className={cn("text-xs", isSelected && "bg-yellow-100 dark:bg-yellow-900")}
                    >
                      {ut.label}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                {!showAddUnitTypeInput ? (
                  <DropdownMenuItem
                    onClick={(e) => { e.preventDefault(); setShowAddUnitTypeInput(true); }}
                    className="text-xs text-blue-600"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Custom Type
                  </DropdownMenuItem>
                ) : (
                  <div className="px-2 py-1 flex items-center gap-1">
                    <Input
                      type="text"
                      placeholder="Custom type..."
                      value={newUnitType}
                      onChange={(e) => setNewUnitType(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddNewUnitType();
                          if (newUnitType.trim()) {
                            const normalized = newUnitType.trim().toLowerCase().replace(/\s+/g, "_");
                            if (activeDrawnUnit) {
                              updateDrawnUnitById(activeDrawnUnit.id, { unitType: normalized });
                            } else {
                              useDesignCanvasStore.getState().setUnitType(normalized);
                            }
                          }
                          setShowAddUnitTypeInput(false);
                        }
                        if (e.key === 'Escape') {
                          setShowAddUnitTypeInput(false);
                          setNewUnitType('');
                        }
                      }}
                      className="h-6 text-xs flex-1"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        handleAddNewUnitType();
                        if (newUnitType.trim()) {
                          const normalized = newUnitType.trim().toLowerCase().replace(/\s+/g, "_");
                          if (activeDrawnUnit) {
                            updateDrawnUnitById(activeDrawnUnit.id, { unitType: normalized });
                          } else {
                            useDesignCanvasStore.getState().setUnitType(normalized);
                          }
                        }
                        setShowAddUnitTypeInput(false);
                      }}
                      className="h-6 w-6 bg-blue-500 text-white rounded flex items-center justify-center hover:bg-blue-600"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add New Canvas Button - right next to Unit Type dropdown */}
            <button
              onClick={addNewCanvas}
              className="text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition-colors flex-shrink-0"
              title="Add new canvas"
            >
              <Plus className="h-3 w-3" />
            </button>

            {/* Units - show all units as clickable chips - hidden on very small screens */}
            {drawnUnits.length > 0 && (
              <>
                <ChevronRight className="h-3 w-3 text-white/50 flex-shrink-0 hidden xs:block" />
                <div className="hidden xs:flex items-center gap-1 overflow-x-auto max-w-[150px] sm:max-w-[300px] md:max-w-[400px] scrollbar-hide">
                  {drawnUnits.map((unit, idx) => (
                    <button
                      key={unit.id}
                      onClick={() => setActiveUnitIndex(idx)}
                      className={cn(
                        "text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap transition-colors flex-shrink-0",
                        activeUnitIndex === idx
                          ? "bg-yellow-400 text-slate-900 font-semibold"
                          : "bg-blue-500/50 text-white/80 hover:bg-blue-400/70 hover:text-white"
                      )}
                    >
                      {formatUnitTypeLabel(unit.unitType || 'wardrobe').split(' ')[0]}
                      {unit.unitType === 'wardrobe_carcass' ? '(C)' : ''}
                      #{idx + 1}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Canvas Tabs - Multiple canvases per room (only show if more than 1 canvas) */}
            {getCanvasNames().length > 1 && (
              <div className="ml-auto flex items-center gap-1 flex-shrink-0 overflow-x-auto scrollbar-hide">
                {getCanvasNames().map(({ index, name }) => (
                  <div
                    key={`canvas-${index}`}
                    className={cn(
                      "text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap transition-colors flex items-center gap-0.5 sm:gap-1 flex-shrink-0",
                      activeCanvasIndex === index
                        ? "bg-emerald-500 text-white font-semibold"
                        : "bg-slate-600 text-white/70 hover:bg-slate-500 hover:text-white"
                    )}
                  >
                    <button onClick={() => switchCanvas(index)} className="hover:underline">
                      {name}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCanvas(index);
                      }}
                      className="hover:bg-red-500 hover:text-white rounded-full p-0.5 -mr-1"
                      title="Delete canvas (Ctrl+Z to undo)"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Canvas + Thumbnails side by side */}
          <div className="flex-1 flex min-h-0">
            {viewMode === "css3d" ? (
              <CSS3DCanvas
                drawnUnits={drawnUnits}
                activeUnitIndex={activeUnitIndex}
                setActiveUnitIndex={setActiveUnitIndex}
                onDeleteUnit={deleteUnit}
                onUndo={undo}
                onRedo={redo}
                dimensions={dimensions}
                unitType={unitType}
              />
            ) : (
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
                  drawMode ? "cursor-crosshair" : "cursor-default"
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
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <Layer>
                    {/* Background */}
                    {!captureOnlyUnitId && (
                      <Rect x={0} y={0} width={dimensions.width} height={dimensions.height} fill="#ffffff" />
                    )}

                    {/* Photo */}
                    {!captureOnlyUnitId && photoImage && (
                      <KonvaImage
                        image={photoImage}
                        x={photoTransform.x}
                        y={photoTransform.y}
                        width={photoTransform.width}
                        height={photoTransform.height}
                      />
                    )}

                    {/* Grid */}
                    {!captureOnlyUnitId && !roomPhoto && (
                      <Group>
                        {Array.from({ length: Math.ceil(dimensions.width / 80) }).map((_, i) => (
                          <Line key={`v-${i}`} points={[i * 80, 0, i * 80, dimensions.height]} stroke="#e2e8f0" strokeWidth={1} />
                        ))}
                        {Array.from({ length: Math.ceil(dimensions.height / 80) }).map((_, i) => (
                          <Line key={`h-${i}`} points={[0, i * 80, dimensions.width, i * 80]} stroke="#e2e8f0" strokeWidth={1} />
                        ))}
                      </Group>
                    )}

                    {/* Units */}
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
                              if (!locked) updateDrawnUnitById(unit.id, { box: newBox });
                            }}
                          />
                        );
                      })}

                    {/* Draw Preview */}
                    {drawStart && drawCurrent && (
                      <Rect
                        x={Math.min(drawStart.x, drawCurrent.x)}
                        y={Math.min(drawStart.y, drawCurrent.y)}
                        width={Math.abs(drawCurrent.x - drawStart.x)}
                        height={Math.abs(drawCurrent.y - drawStart.y)}
                        stroke="#6366f1"
                        strokeWidth={2}
                        fill="rgba(99, 102, 241, 0.15)"
                        dash={[6, 3]}
                      />
                    )}
                  </Layer>
                </Stage>

                {/* Minimal Overlays */}
                {roomPhoto && (
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur rounded px-2 py-1">
                    <p className="text-white text-[10px]">{roomPhoto.width}×{roomPhoto.height}</p>
                  </div>
                )}

                {/* Draw mode indicator */}
                {drawMode && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                    Draw Mode - Click and drag to create unit
                  </div>
                )}
              </div>
            )}

            {/* Right Thumbnails - hidden on mobile */}
            {viewMode === "photo" && (
              <div className="hidden sm:block">
                <Quotation2DThumbnails
                  roomPhoto={roomPhoto}
                  referencePhotos={referencePhotos}
                  fileInputRef={fileInputRef}
                  refFileInputRef={refFileInputRef}
                  removeReferencePhoto={removeReferencePhoto}
                  clearRoomPhoto={clearRoomPhoto}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleMainPhotoUpload} />
      <input ref={refFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleRefPhotoUpload} />
    </div>
  );
};

export default function Quotation2DPageWithErrorBoundary() {
  return (
    <Quotation2DErrorBoundary>
      <Quotation2DPage />
    </Quotation2DErrorBoundary>
  );
}

export { Quotation2DPage };
