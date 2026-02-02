/**
 * CanvasToolbar
 *
 * Main toolbar component that assembles all toolbar UI elements.
 * Uses extracted dropdown components for better organization.
 */

import React, { useCallback } from "react";
import {
  Maximize2,
  Minimize2,
  Move,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  IndianRupee,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDesignCanvasStore } from "../../store/v2/useDesignCanvasStore";
import { useRoomStore } from "../../store/v2/useRoomStore";
import { useQuotationMetaStore } from "../../store/v2/useQuotationMetaStore";
import { type KitchenLayoutType } from "../../features/floor-plan-3d/state/types";
import { UNIT_TYPE_LABELS } from "../../constants";
import type { FloorPlan3DViewMode, FloorPlan3DHandle } from "../../features/floor-plan-3d";
import {
  useDropdownState,
  ViewDropdown,
  LayoutDropdown,
  DrawToolDropdown,
  ExportDropdown,
  GridToggle,
} from "./CanvasToolbarDropdowns";

interface CanvasToolbarProps {
  // View state
  show3DView: boolean;
  setShow3DView: (enabled: boolean) => void;
  view3DMode: FloorPlan3DViewMode;
  setSelected3DViewMode: (mode: FloorPlan3DViewMode) => void;

  // Export
  exportHandle: FloorPlan3DHandle | null;
  isExporting: boolean;
  setIsExporting: (value: boolean) => void;
  setImport3DModalOpen: (open: boolean) => void;

  // Fullscreen
  isFullscreen: boolean;
  setIsFullscreen: (value: boolean) => void;

  // Config panel
  configPanelOpen: boolean;
  setConfigPanelOpen: (open: boolean) => void;

  // Draw mode
  drawMode: boolean;
  editMode: "shutter" | "carcass";
  isSelected: boolean;
  setIsSelected: (value: boolean) => void;

  // Grand total
  grandTotal: number;

  // Actions
  handleAddAnother: () => void;
  deleteCurrentUnit: () => void;
}

export function CanvasToolbar({
  show3DView,
  setShow3DView,
  view3DMode,
  setSelected3DViewMode,
  exportHandle,
  isExporting,
  setIsExporting,
  setImport3DModalOpen,
  isFullscreen,
  setIsFullscreen,
  configPanelOpen,
  setConfigPanelOpen,
  drawMode,
  editMode,
  isSelected,
  setIsSelected,
  grandTotal,
  handleAddAnother,
  deleteCurrentUnit,
}: CanvasToolbarProps) {
  const { status } = useQuotationMetaStore();
  const locked = status === "APPROVED";

  const {
    wardrobeBox,
    drawnUnits,
    activeUnitIndex,
    unitType,
    setActiveUnitIndex,
    floorPlan,
    setFloorPlanDrawMode,
    setKitchenConfig,
    addKitchenRun,
    addFloorPlanWall,
  } = useDesignCanvasStore();

  const {
    quotationRooms,
    activeRoomIndex,
    setActiveRoomIndex,
    addRoom,
    deleteRoom,
  } = useRoomStore();

  // Use dropdown state hook
  const {
    layoutDropdownOpen, setLayoutDropdownOpen, layoutDropdownRef,
    drawToolDropdownOpen, setDrawToolDropdownOpen, drawToolDropdownRef,
    viewDropdownOpen, setViewDropdownOpen, viewDropdownRef,
    exportDropdownOpen, setExportDropdownOpen, exportDropdownRef,
  } = useDropdownState();

  // Layout selection handler
  const handleLayoutSelect = useCallback(
    (layoutType: KitchenLayoutType) => {
      const canvasCenterX = 450;
      const canvasCenterY = 250;
      const defaultRunLength = 8;
      const runLengthPx = 200;

      const createBaseRun = (startX: number, startY: number, endX: number, endY: number, lengthFt: number) => {
        addKitchenRun("base", {
          wallId: "",
          lengthFt,
          depthMm: 600,
          heightMm: 850,
          startPoint: { x: startX, y: startY },
          endPoint: { x: endX, y: endY },
          rotation: Math.atan2(endY - startY, endX - startX) * (180 / Math.PI),
        });
      };

      const createWallRun = (startX: number, startY: number, endX: number, endY: number, lengthFt: number) => {
        addKitchenRun("wall", {
          wallId: "",
          lengthFt,
          depthMm: 350,
          heightMm: 600,
          startPoint: { x: startX, y: startY },
          endPoint: { x: endX, y: endY },
          rotation: Math.atan2(endY - startY, endX - startX) * (180 / Math.PI),
        });
      };

      setKitchenConfig({
        layoutType,
        baseUnit: null,
        wallUnit: null,
        tallUnit: null,
        counterTopOverhang: 25,
        splashbackHeight: 450,
        ceilingHeight: 2700,
      });

      setTimeout(() => {
        switch (layoutType) {
          case "straight":
            createBaseRun(canvasCenterX - runLengthPx, canvasCenterY, canvasCenterX + runLengthPx, canvasCenterY, defaultRunLength);
            createWallRun(canvasCenterX - runLengthPx, canvasCenterY - 80, canvasCenterX + runLengthPx, canvasCenterY - 80, defaultRunLength);
            break;
          case "l_shape":
            createBaseRun(canvasCenterX - runLengthPx, canvasCenterY - 60, canvasCenterX + 40, canvasCenterY - 60, 6);
            createBaseRun(canvasCenterX + 40, canvasCenterY - 60, canvasCenterX + 40, canvasCenterY + runLengthPx - 60, 5);
            createWallRun(canvasCenterX - runLengthPx, canvasCenterY - 140, canvasCenterX + 40, canvasCenterY - 140, 6);
            break;
          case "u_shape":
            createBaseRun(canvasCenterX - 120, canvasCenterY - 80, canvasCenterX - 120, canvasCenterY + 80, 4);
            createBaseRun(canvasCenterX - 120, canvasCenterY + 80, canvasCenterX + 120, canvasCenterY + 80, 6);
            createBaseRun(canvasCenterX + 120, canvasCenterY + 80, canvasCenterX + 120, canvasCenterY - 80, 4);
            createWallRun(canvasCenterX - 120, canvasCenterY - 160, canvasCenterX - 120, canvasCenterY, 4);
            createWallRun(canvasCenterX + 120, canvasCenterY - 160, canvasCenterX + 120, canvasCenterY, 4);
            break;
          case "parallel":
            createBaseRun(canvasCenterX - runLengthPx, canvasCenterY - 80, canvasCenterX + runLengthPx, canvasCenterY - 80, defaultRunLength);
            createBaseRun(canvasCenterX - runLengthPx, canvasCenterY + 80, canvasCenterX + runLengthPx, canvasCenterY + 80, defaultRunLength);
            createWallRun(canvasCenterX - runLengthPx, canvasCenterY - 160, canvasCenterX + runLengthPx, canvasCenterY - 160, defaultRunLength);
            createWallRun(canvasCenterX - runLengthPx, canvasCenterY + 160, canvasCenterX + runLengthPx, canvasCenterY + 160, defaultRunLength);
            break;
          case "island":
            createBaseRun(canvasCenterX - runLengthPx, canvasCenterY - 100, canvasCenterX + 40, canvasCenterY - 100, 6);
            createBaseRun(canvasCenterX + 40, canvasCenterY - 100, canvasCenterX + 40, canvasCenterY + 60, 4);
            createBaseRun(canvasCenterX - 80, canvasCenterY + 60, canvasCenterX + 80, canvasCenterY + 60, 4);
            createWallRun(canvasCenterX - runLengthPx, canvasCenterY - 180, canvasCenterX + 40, canvasCenterY - 180, 6);
            break;
        }
      }, 100);
    },
    [addKitchenRun, setKitchenConfig]
  );

  // Create all 4 walls handler
  const handleCreateAllWalls = useCallback(() => {
    const floor = floorPlan.floors[0];
    if (!floor) return;

    const { x, y, width, height } = floor;
    const scaleMmPerPx = floorPlan.scaleMmPerPx;

    const wallThicknessPx = 15;
    const halfThickness = wallThicknessPx / 2;

    const horizontalLengthMm = (width + wallThicknessPx * 2) * scaleMmPerPx;

    // Top wall
    addFloorPlanWall({
      startPoint: { x: x - halfThickness, y: y - halfThickness },
      endPoint: { x: x + width + halfThickness, y: y - halfThickness },
      lengthMm: horizontalLengthMm,
      thicknessMm: 150,
      heightMm: 2700,
      rotation: 0,
      isExterior: true,
      openings: [],
    });

    // Bottom wall
    addFloorPlanWall({
      startPoint: { x: x - halfThickness, y: y + height + halfThickness },
      endPoint: { x: x + width + halfThickness, y: y + height + halfThickness },
      lengthMm: horizontalLengthMm,
      thicknessMm: 150,
      heightMm: 2700,
      rotation: 0,
      isExterior: true,
      openings: [],
    });

    // Left wall
    addFloorPlanWall({
      startPoint: { x: x - halfThickness, y: y - halfThickness },
      endPoint: { x: x - halfThickness, y: y + height + halfThickness },
      lengthMm: (height + wallThicknessPx * 2) * scaleMmPerPx,
      thicknessMm: 150,
      heightMm: 2700,
      rotation: 90,
      isExterior: true,
      openings: [],
    });

    // Right wall
    addFloorPlanWall({
      startPoint: { x: x + width + halfThickness, y: y - halfThickness },
      endPoint: { x: x + width + halfThickness, y: y + height + halfThickness },
      lengthMm: (height + wallThicknessPx * 2) * scaleMmPerPx,
      thicknessMm: 150,
      heightMm: 2700,
      rotation: 90,
      isExterior: true,
      openings: [],
    });
  }, [floorPlan.floors, floorPlan.scaleMmPerPx, addFloorPlanWall]);

  const isDrawingMode = drawMode && (editMode === "shutter" || editMode === "carcass");

  return (
    <div className="flex-shrink-0 flex items-center justify-between px-2 py-1 border-b border-slate-700/60 bg-slate-800/98 backdrop-blur-sm relative z-20">
      {/* Left: Room tabs + Dropdowns */}
      <div className="flex items-center gap-1.5">
        {/* Room Tabs - Compact */}
        {quotationRooms.map((room, index) => (
          <div
            key={room.id}
            className={cn(
              "group flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-medium cursor-pointer transition-all",
              index === activeRoomIndex
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            )}
            onClick={() => setActiveRoomIndex(index)}
          >
            <span>{room.name}</span>
            {quotationRooms.length > 1 && (
              <button
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteRoom(index);
                }}
                title="Delete Room"
              >
                <X className="h-2 w-2" />
              </button>
            )}
          </div>
        ))}
        {quotationRooms.length > 0 && (
          <button
            className="h-5 w-5 flex items-center justify-center text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded"
            onClick={() => addRoom({
              id: Date.now().toString(),
              name: `Room ${quotationRooms.length + 1}`,
              unitType: "wardrobe",
              drawnUnits: [],
              roomPhoto: null,
              wardrobeBox: null,
              shutterCount: 2,
              shutterDividerXs: [],
              loftEnabled: false,
              loftHeightRatio: 0.2, // Default
              loftShutterCount: 2,
              loftDividerXs: [],
              sectionCount: 1,
              loftDividerYs: [],
            })}
            title="Add room"
          >
            <Plus className="h-2.5 w-2.5" />
          </button>
        )}

        {quotationRooms.length > 0 && <div className="w-px h-4 bg-slate-600/50" />}

        {/* VIEW Dropdown */}
        <ViewDropdown
          show3DView={show3DView}
          setShow3DView={setShow3DView}
          view3DMode={view3DMode}
          setSelected3DViewMode={setSelected3DViewMode}
          isOpen={viewDropdownOpen}
          setIsOpen={setViewDropdownOpen}
          dropdownRef={viewDropdownRef}
        />

        {/* Layout and Room dropdowns - hidden in draw mode */}
        {!isDrawingMode && (
          <>
            <LayoutDropdown
              isOpen={layoutDropdownOpen}
              setIsOpen={setLayoutDropdownOpen}
              dropdownRef={layoutDropdownRef}
              onLayoutSelect={handleLayoutSelect}
            />

            <DrawToolDropdown
              isOpen={drawToolDropdownOpen}
              setIsOpen={setDrawToolDropdownOpen}
              dropdownRef={drawToolDropdownRef}
              onCreateAllWalls={handleCreateAllWalls}
            />

            <GridToggle />
          </>
        )}

        {/* EXPORT Dropdown */}
        <ExportDropdown
          isOpen={exportDropdownOpen}
          setIsOpen={setExportDropdownOpen}
          dropdownRef={exportDropdownRef}
          exportHandle={exportHandle}
          isExporting={isExporting}
          setIsExporting={setIsExporting}
          setImport3DModalOpen={setImport3DModalOpen}
        />
        {isExporting && (
          <span className="text-[8px] text-amber-400 animate-pulse">Exporting...</span>
        )}
      </div>

      {/* Center: Unit Navigation */}
      <div className="flex items-center gap-1">
        <div className="flex items-center bg-slate-700/40 rounded p-0.5">
          <button
            className="h-5 w-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 rounded disabled:opacity-30"
            disabled={drawnUnits.length === 0 || activeUnitIndex === 0}
            onClick={() => setActiveUnitIndex(activeUnitIndex - 1)}
            title="Previous Unit"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <div className="flex items-center px-1.5 text-[9px] min-w-[50px] justify-center">
            <span className="font-semibold text-white">
              {drawnUnits.length === 0 ? 1 : activeUnitIndex + 1}
            </span>
            <span className="text-slate-500">
              /{Math.max(1, drawnUnits.length + (wardrobeBox && drawnUnits.length === activeUnitIndex ? 1 : 0))}
            </span>
          </div>
          <button
            className="h-5 w-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 rounded disabled:opacity-30"
            disabled={drawnUnits.length === 0 || activeUnitIndex >= drawnUnits.length - 1}
            onClick={() => setActiveUnitIndex(activeUnitIndex + 1)}
            title="Next Unit"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <button
          className="h-5 px-1.5 text-[9px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded font-medium flex items-center disabled:opacity-30"
          disabled={locked || drawMode}
          onClick={handleAddAnother}
        >
          <Plus className="h-2.5 w-2.5 mr-0.5" />
          Add
        </button>
        <button
          className="h-5 w-5 flex items-center justify-center text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded disabled:opacity-30"
          disabled={locked || (!wardrobeBox && !drawnUnits[activeUnitIndex])}
          onClick={() => {
            deleteCurrentUnit();
            setIsSelected(false);
          }}
          title="Delete Unit"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>

        {/* Status badges */}
        {drawMode && (
          <span className="px-1.5 py-0.5 text-[8px] font-semibold bg-blue-600 text-white rounded animate-pulse">
            Drawing
          </span>
        )}
        {isSelected && !drawMode && (
          <span className="px-1.5 py-0.5 text-[8px] font-semibold bg-emerald-600 text-white rounded">
            Selected
          </span>
        )}
      </div>

      {/* Right: Config + Price + Pan + Fullscreen */}
      <div className="flex items-center gap-1">
        {/* Config Panel Button */}
        <button
          onClick={() => setConfigPanelOpen(!configPanelOpen)}
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold transition-all",
            configPanelOpen
              ? "bg-amber-500 text-white"
              : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40"
          )}
          title={`${UNIT_TYPE_LABELS[drawnUnits[activeUnitIndex]?.unitType] || unitType} Card`}
        >
          <Settings2 className="h-3 w-3" />
          <span className="hidden sm:inline">{UNIT_TYPE_LABELS[drawnUnits[activeUnitIndex]?.unitType] || unitType} Card</span>
        </button>

        {/* Price Badge */}
        {grandTotal > 0 && (
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded text-[9px] font-bold">
            <IndianRupee className="h-2.5 w-2.5" />
            {grandTotal.toLocaleString("en-IN")}
          </div>
        )}

        {/* Pan/Rotate Button */}
        <button
          onClick={() => setFloorPlanDrawMode(floorPlan.drawMode === "pan" ? "select" : "pan")}
          className={cn(
            "h-5 w-5 flex items-center justify-center rounded transition-all",
            floorPlan.drawMode === "pan"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-700"
          )}
          title={floorPlan.drawMode === "pan" ? "Exit Pan Mode" : "Pan/Rotate View"}
        >
          <Move className="h-3 w-3" />
        </button>

        {/* Fullscreen Button */}
        <button
          className={cn(
            "h-5 w-5 flex items-center justify-center rounded",
            isFullscreen ? "text-amber-400 hover:bg-amber-500/10" : "text-slate-400 hover:text-white hover:bg-slate-700"
          )}
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}
