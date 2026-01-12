import React, { useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Box,
  Axis3D,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVisualQuotationStore } from "../store/visualQuotationStore";
import { cn } from "@/lib/utils";
import Room3D, { type Room3DViewMode } from "../components/Canvas3D/Room3D";

const Room3DPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 3D view state
  const [viewMode, setViewMode] = useState<Room3DViewMode>("perspective");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Store state
  const {
    drawnUnits,
    activeUnitIndex,
    setActiveUnitIndex,
    quotationRooms,
    activeRoomIndex,
  } = useVisualQuotationStore();

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 10, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 10, 50));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(100);
  }, []);

  const handleBack = () => {
    const params = searchParams.toString();
    navigate(`/visual-quotation${params ? `?${params}` : ""}`);
  };

  // Get current room name
  const currentRoomName = useMemo(() => {
    if (quotationRooms.length > 0 && quotationRooms[activeRoomIndex]) {
      return quotationRooms[activeRoomIndex].name;
    }
    return "Room";
  }, [quotationRooms, activeRoomIndex]);

  // Canvas dimensions (full page)
  const canvasWidth = 1200;
  const canvasHeight = 800;

  return (
    <div className={cn(
      "h-screen flex flex-col bg-slate-900",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Header */}
      <header className="flex-shrink-0 h-12 bg-slate-800 border-b border-slate-700">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-2 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Box className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">3D Room View</h1>
                <p className="text-[10px] text-slate-400">{currentRoomName}</p>
              </div>
            </div>
          </div>

          {/* Center: View Mode Tabs */}
          <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode("isometric")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                viewMode === "isometric"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-600"
              )}
            >
              <Box className="h-3.5 w-3.5" />
              Isometric
            </button>
            <button
              onClick={() => setViewMode("perspective")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                viewMode === "perspective"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-600"
              )}
            >
              <Axis3D className="h-3.5 w-3.5" />
              Perspective
            </button>
          </div>

          {/* Right: Zoom Controls + Fullscreen */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50}
                className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-600"
                title="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-slate-300 w-12 text-center font-medium">
                {zoomLevel}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 200}
                className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-600"
                title="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-4 bg-slate-600 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetZoom}
                className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-600"
                title="Reset zoom"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex min-h-0">
        {/* Left Sidebar - Unit List */}
        <aside className="flex-shrink-0 w-64 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden">
          {/* Units Header */}
          <div className="flex-shrink-0 px-3 py-2 border-b border-slate-700">
            <h2 className="text-xs font-bold text-white uppercase tracking-wide">
              Units ({drawnUnits.length})
            </h2>
          </div>

          {/* Unit List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {drawnUnits.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No units drawn yet
              </div>
            ) : (
              drawnUnits.map((unit, index) => (
                <button
                  key={unit.id}
                  onClick={() => setActiveUnitIndex(index)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg transition-all",
                    index === activeUnitIndex
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">
                      {unit.unitType.charAt(0).toUpperCase() + unit.unitType.slice(1)}
                    </span>
                    <span className="text-[10px] opacity-70">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="text-[10px] opacity-70 mt-0.5">
                    {unit.widthMm}mm x {unit.heightMm}mm
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Unit Navigation */}
          {drawnUnits.length > 0 && (
            <div className="flex-shrink-0 px-3 py-2 border-t border-slate-700 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                disabled={activeUnitIndex === 0}
                onClick={() => setActiveUnitIndex(activeUnitIndex - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-slate-400">
                {activeUnitIndex + 1} / {drawnUnits.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                disabled={activeUnitIndex >= drawnUnits.length - 1}
                onClick={() => setActiveUnitIndex(activeUnitIndex + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </aside>

        {/* 3D Canvas Area */}
        <div className="flex-1 min-w-0 min-h-0 relative">
          <Room3D
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            viewMode={viewMode}
            zoomLevel={zoomLevel}
          />

          {/* Instructions Overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/90 backdrop-blur rounded-full text-xs text-slate-300 flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">Drag</kbd> to rotate
            </span>
            <span className="text-slate-600">|</span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">Scroll</kbd> to zoom
            </span>
            <span className="text-slate-600">|</span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">Right-drag</kbd> to pan
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Room3DPage;
