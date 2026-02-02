/**
 * ModuleDrawDemo - Visual Draw Module Demo
 *
 * Demo page showing how users can:
 * 1. Select module type (Wardrobe, Kitchen, TV Unit)
 * 2. Draw on 2D floor plan
 * 3. See 3D preview
 * 4. View generated cutting list
 */

import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DoorClosed,
  ChefHat,
  Tv,
  BookOpen,
  Footprints,
  Plus,
  Trash2,
  Move,
  MousePointer,
  Layers,
  List,
  Eye,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ============================================
// TYPES
// ============================================

type ModuleType = "wardrobe" | "kitchen_base" | "kitchen_wall" | "tv_unit" | "bookshelf" | "shoe_rack";

interface DrawnModule {
  id: string;
  type: ModuleType;
  name: string;
  // Position on floor (2D)
  x: number;
  y: number;
  // Dimensions in mm
  width: number;
  height: number;
  depth: number;
  // Configuration
  sections: number;
  shelves: number;
  drawers: number;
  hasLoft: boolean;
  shutterCount: number;
  // Material
  carcassMaterial: string;
  shutterMaterial: string;
}

interface Panel {
  name: string;
  length: number;
  width: number;
  thickness: number;
  material: string;
  edgeBanding: string;
  qty: number;
}

// ============================================
// MODULE LIBRARY
// ============================================

const MODULE_LIBRARY: { type: ModuleType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: "wardrobe", label: "Wardrobe", icon: <DoorClosed className="w-5 h-5" />, color: "bg-indigo-500" },
  { type: "kitchen_base", label: "Kitchen Base", icon: <ChefHat className="w-5 h-5" />, color: "bg-orange-500" },
  { type: "kitchen_wall", label: "Kitchen Wall", icon: <ChefHat className="w-5 h-5" />, color: "bg-amber-500" },
  { type: "tv_unit", label: "TV Unit", icon: <Tv className="w-5 h-5" />, color: "bg-purple-500" },
  { type: "bookshelf", label: "Bookshelf", icon: <BookOpen className="w-5 h-5" />, color: "bg-emerald-500" },
  { type: "shoe_rack", label: "Shoe Rack", icon: <Footprints className="w-5 h-5" />, color: "bg-rose-500" },
];

// Default dimensions by module type
const DEFAULT_DIMENSIONS: Record<ModuleType, { w: number; h: number; d: number }> = {
  wardrobe: { w: 1200, h: 2100, d: 600 },
  kitchen_base: { w: 600, h: 850, d: 550 },
  kitchen_wall: { w: 600, h: 700, d: 350 },
  tv_unit: { w: 1800, h: 500, d: 450 },
  bookshelf: { w: 900, h: 1800, d: 300 },
  shoe_rack: { w: 900, h: 1200, d: 350 },
};

// ============================================
// PANEL GENERATOR
// ============================================

function generatePanels(module: DrawnModule): Panel[] {
  const panels: Panel[] = [];
  const t = 18; // thickness

  // Left Side
  panels.push({
    name: `${module.name}_LEFT`,
    length: module.height,
    width: module.depth,
    thickness: t,
    material: module.carcassMaterial,
    edgeBanding: "L1+W1",
    qty: 1,
  });

  // Right Side
  panels.push({
    name: `${module.name}_RIGHT`,
    length: module.height,
    width: module.depth,
    thickness: t,
    material: module.carcassMaterial,
    edgeBanding: "L1+W1",
    qty: 1,
  });

  // Top
  panels.push({
    name: `${module.name}_TOP`,
    length: module.width - 2 * t,
    width: module.depth,
    thickness: t,
    material: module.carcassMaterial,
    edgeBanding: "L1",
    qty: 1,
  });

  // Bottom
  panels.push({
    name: `${module.name}_BOTTOM`,
    length: module.width - 2 * t,
    width: module.depth,
    thickness: t,
    material: module.carcassMaterial,
    edgeBanding: "L1",
    qty: 1,
  });

  // Back
  panels.push({
    name: `${module.name}_BACK`,
    length: module.height - 4,
    width: module.width - 4,
    thickness: 6,
    material: "PLY 6mm",
    edgeBanding: "-",
    qty: 1,
  });

  // Partitions
  if (module.sections > 1) {
    panels.push({
      name: `${module.name}_PARTITION`,
      length: module.height - 2 * t,
      width: module.depth - 20,
      thickness: t,
      material: module.carcassMaterial,
      edgeBanding: "L1",
      qty: module.sections - 1,
    });
  }

  // Shelves
  if (module.shelves > 0) {
    const shelfWidth = (module.width - (module.sections + 1) * t) / module.sections;
    panels.push({
      name: `${module.name}_SHELF`,
      length: shelfWidth,
      width: module.depth - 22,
      thickness: t,
      material: module.carcassMaterial,
      edgeBanding: "L1",
      qty: module.shelves * module.sections,
    });
  }

  // Shutters
  if (module.shutterCount > 0) {
    const shutterWidth = (module.width - 4) / module.shutterCount;
    const shutterHeight = module.hasLoft ? module.height - 400 : module.height - 4;
    panels.push({
      name: `${module.name}_SHUTTER`,
      length: shutterHeight,
      width: shutterWidth - 4,
      thickness: 18,
      material: module.shutterMaterial,
      edgeBanding: "ALL",
      qty: module.shutterCount,
    });
  }

  // Loft shutters
  if (module.hasLoft) {
    panels.push({
      name: `${module.name}_LOFT_SHUTTER`,
      length: 380,
      width: (module.width - 4) / 2 - 4,
      thickness: 18,
      material: module.shutterMaterial,
      edgeBanding: "ALL",
      qty: 2,
    });
  }

  // Drawers
  if (module.drawers > 0) {
    const drawerWidth = (module.width - 2 * t) / module.sections - 6;
    panels.push({
      name: `${module.name}_DRW_FRONT`,
      length: 180,
      width: drawerWidth,
      thickness: 18,
      material: module.shutterMaterial,
      edgeBanding: "ALL",
      qty: module.drawers,
    });
    panels.push({
      name: `${module.name}_DRW_SIDE`,
      length: module.depth - 80,
      width: 150,
      thickness: 12,
      material: "PLY 12mm",
      edgeBanding: "L1",
      qty: module.drawers * 2,
    });
    panels.push({
      name: `${module.name}_DRW_BACK`,
      length: drawerWidth - 30,
      width: 150,
      thickness: 12,
      material: "PLY 12mm",
      edgeBanding: "-",
      qty: module.drawers,
    });
    panels.push({
      name: `${module.name}_DRW_BASE`,
      length: drawerWidth - 30,
      width: module.depth - 80,
      thickness: 6,
      material: "PLY 6mm",
      edgeBanding: "-",
      qty: module.drawers,
    });
  }

  return panels;
}

// ============================================
// 3D MODULE COMPONENT
// ============================================

const Module3D: React.FC<{
  module: DrawnModule;
  isSelected: boolean;
  onClick: () => void;
  position: { x: number; y: number };
}> = ({ module, isSelected, onClick, position }) => {
  const scale = 0.15; // Scale mm to pixels
  const w = module.width * scale;
  const h = module.height * scale;
  const d = module.depth * scale;

  const moduleColors: Record<ModuleType, { front: string; side: string; top: string }> = {
    wardrobe: { front: "from-slate-100 to-slate-200", side: "from-slate-200 to-slate-300", top: "from-slate-50 to-slate-100" },
    kitchen_base: { front: "from-orange-100 to-orange-200", side: "from-orange-200 to-orange-300", top: "from-orange-50 to-orange-100" },
    kitchen_wall: { front: "from-amber-100 to-amber-200", side: "from-amber-200 to-amber-300", top: "from-amber-50 to-amber-100" },
    tv_unit: { front: "from-purple-100 to-purple-200", side: "from-purple-200 to-purple-300", top: "from-purple-50 to-purple-100" },
    bookshelf: { front: "from-emerald-100 to-emerald-200", side: "from-emerald-200 to-emerald-300", top: "from-emerald-50 to-emerald-100" },
    shoe_rack: { front: "from-rose-100 to-rose-200", side: "from-rose-200 to-rose-300", top: "from-rose-50 to-rose-100" },
  };

  const colors = moduleColors[module.type];

  return (
    <div
      className={cn(
        "absolute cursor-pointer transition-all",
        isSelected && "ring-2 ring-blue-500 ring-offset-2"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${w}px`,
        height: `${d}px`,
        transformStyle: "preserve-3d",
      }}
      onClick={onClick}
    >
      {/* Base/Floor footprint */}
      <div
        className={cn("absolute inset-0 bg-gradient-to-br border-2", colors.top, isSelected ? "border-blue-500" : "border-slate-400")}
      />

      {/* Front face */}
      <div
        className={cn("absolute bg-gradient-to-b border-2", colors.front, isSelected ? "border-blue-500" : "border-slate-400")}
        style={{
          width: `${w}px`,
          height: `${h}px`,
          bottom: "100%",
          left: 0,
          transformOrigin: "bottom",
          transform: "rotateX(-90deg)",
        }}
      >
        {/* Shutters */}
        <div className="absolute inset-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${module.shutterCount || 2}, 1fr)` }}>
          {Array.from({ length: module.shutterCount || 2 }).map((_, i) => (
            <div key={i} className="bg-white/50 border border-slate-300 rounded relative">
              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-slate-400 rounded" />
            </div>
          ))}
        </div>

        {/* Module label */}
        <div className="absolute bottom-1 left-1 text-[8px] font-bold text-slate-600 bg-white/80 px-1 rounded">
          {module.name}
        </div>
      </div>

      {/* Side face */}
      <div
        className={cn("absolute bg-gradient-to-b border-2", colors.side, isSelected ? "border-blue-500" : "border-slate-400")}
        style={{
          width: `${d}px`,
          height: `${h}px`,
          bottom: "100%",
          right: 0,
          transformOrigin: "bottom right",
          transform: "rotateX(-90deg) rotateY(90deg)",
        }}
      />

      {/* Top face */}
      <div
        className={cn("absolute bg-gradient-to-br border-2", colors.top, isSelected ? "border-blue-500" : "border-slate-400")}
        style={{
          width: `${w}px`,
          height: `${d}px`,
          transform: `translateZ(${h}px)`,
        }}
      />
    </div>
  );
};

// ============================================
// MAIN DEMO COMPONENT
// ============================================

const ModuleDrawDemo: React.FC = () => {
  const navigate = useNavigate();
  const floorRef = useRef<HTMLDivElement>(null);

  // State
  const [modules, setModules] = useState<DrawnModule[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [drawingType, setDrawingType] = useState<ModuleType | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d");
  const [showCutList, setShowCutList] = useState(false);

  // Selected module
  const selectedModule = modules.find((m) => m.id === selectedModuleId);

  // All panels from all modules
  const allPanels = modules.flatMap((m) => generatePanels(m));

  // Handlers
  const handleFloorMouseDown = (e: React.MouseEvent) => {
    if (!drawingType || !floorRef.current) return;

    const rect = floorRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawCurrent({ x, y });
  };

  const handleFloorMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !floorRef.current) return;

    const rect = floorRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDrawCurrent({ x, y });
  };

  const handleFloorMouseUp = () => {
    if (!isDrawing || !drawStart || !drawCurrent || !drawingType) {
      setIsDrawing(false);
      return;
    }

    const minX = Math.min(drawStart.x, drawCurrent.x);
    const minY = Math.min(drawStart.y, drawCurrent.y);
    const width = Math.abs(drawCurrent.x - drawStart.x);
    const depth = Math.abs(drawCurrent.y - drawStart.y);

    if (width > 30 && depth > 20) {
      const defaults = DEFAULT_DIMENSIONS[drawingType];
      const scale = 0.15;

      const newModule: DrawnModule = {
        id: `mod_${Date.now()}`,
        type: drawingType,
        name: `${drawingType.toUpperCase().replace("_", "")}_${modules.length + 1}`,
        x: minX,
        y: minY,
        width: Math.round(width / scale),
        height: defaults.h,
        depth: Math.round(depth / scale),
        sections: drawingType === "wardrobe" ? 3 : 1,
        shelves: 4,
        drawers: drawingType === "kitchen_base" ? 2 : 0,
        hasLoft: drawingType === "wardrobe",
        shutterCount: drawingType === "wardrobe" ? 3 : 2,
        carcassMaterial: "BWP PLY 18mm",
        shutterMaterial: "Laminate 1mm",
      };

      setModules([...modules, newModule]);
      setSelectedModuleId(newModule.id);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
    setDrawingType(null);
  };

  const handleDeleteModule = () => {
    if (!selectedModuleId) return;
    setModules(modules.filter((m) => m.id !== selectedModuleId));
    setSelectedModuleId(null);
  };

  const updateSelectedModule = (updates: Partial<DrawnModule>) => {
    if (!selectedModuleId) return;
    setModules(modules.map((m) => (m.id === selectedModuleId ? { ...m, ...updates } : m)));
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {/* Header */}
      <header className="h-12 bg-slate-800 border-b border-slate-700 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white"
            onClick={() => navigate("/2d-quotation")}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h1 className="text-white font-semibold">Module Draw Demo</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
            <Button
              variant={viewMode === "2d" ? "default" : "ghost"}
              size="sm"
              className={cn("h-7 px-3 text-xs", viewMode === "2d" ? "bg-blue-600" : "text-slate-300")}
              onClick={() => setViewMode("2d")}
            >
              2D Floor
            </Button>
            <Button
              variant={viewMode === "3d" ? "default" : "ghost"}
              size="sm"
              className={cn("h-7 px-3 text-xs", viewMode === "3d" ? "bg-purple-600" : "text-slate-300")}
              onClick={() => setViewMode("3d")}
            >
              3D View
            </Button>
          </div>

          {/* Cut List Toggle */}
          <Button
            variant={showCutList ? "default" : "outline"}
            size="sm"
            className={cn("h-8", showCutList && "bg-green-600")}
            onClick={() => setShowCutList(!showCutList)}
          >
            <List className="w-4 h-4 mr-1" />
            Cut List ({allPanels.length})
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Module Library */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              Module Library
            </h2>
            <p className="text-xs text-slate-500 mt-1">Click to select, then draw on floor</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-2">
              {MODULE_LIBRARY.map((mod) => (
                <button
                  key={mod.type}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all text-center",
                    drawingType === mod.type
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  )}
                  onClick={() => setDrawingType(drawingType === mod.type ? null : mod.type)}
                >
                  <div className={cn("w-10 h-10 rounded-lg mx-auto flex items-center justify-center text-white mb-2", mod.color)}>
                    {mod.icon}
                  </div>
                  <span className="text-xs font-medium text-slate-700">{mod.label}</span>
                </button>
              ))}
            </div>

            {drawingType && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 font-medium">
                  ✏️ Draw mode: {MODULE_LIBRARY.find((m) => m.type === drawingType)?.label}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Click and drag on the floor to place
                </p>
              </div>
            )}
          </div>

          {/* Placed Modules */}
          {modules.length > 0 && (
            <div className="border-t border-slate-200 p-3">
              <h3 className="text-xs font-semibold text-slate-600 mb-2">Placed Modules ({modules.length})</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {modules.map((mod) => (
                  <button
                    key={mod.id}
                    className={cn(
                      "w-full text-left p-2 rounded text-xs transition-all",
                      selectedModuleId === mod.id ? "bg-blue-100 text-blue-800" : "hover:bg-slate-100"
                    )}
                    onClick={() => setSelectedModuleId(mod.id)}
                  >
                    <span className="font-medium">{mod.name}</span>
                    <span className="text-slate-400 ml-2">{mod.width}×{mod.height}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Center: Floor Plan / 3D View */}
        <div className="flex-1 relative overflow-hidden">
          {viewMode === "2d" ? (
            /* 2D Floor Plan */
            <div
              ref={floorRef}
              className={cn(
                "absolute inset-4 bg-white rounded-xl border-2 border-slate-300 overflow-hidden",
                drawingType && "cursor-crosshair"
              )}
              onMouseDown={handleFloorMouseDown}
              onMouseMove={handleFloorMouseMove}
              onMouseUp={handleFloorMouseUp}
              onMouseLeave={handleFloorMouseUp}
            >
              {/* Grid */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)",
                  backgroundSize: "50px 50px",
                }}
              />

              {/* Modules in 2D */}
              {modules.map((mod) => {
                const scale = 0.15;
                return (
                  <div
                    key={mod.id}
                    className={cn(
                      "absolute border-2 rounded cursor-pointer transition-all",
                      selectedModuleId === mod.id
                        ? "border-blue-500 bg-blue-100/50"
                        : "border-slate-400 bg-slate-100/50 hover:bg-slate-200/50"
                    )}
                    style={{
                      left: mod.x,
                      top: mod.y,
                      width: mod.width * scale,
                      height: mod.depth * scale,
                    }}
                    onClick={() => setSelectedModuleId(mod.id)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-slate-700">{mod.name}</span>
                    </div>
                  </div>
                );
              })}

              {/* Draw preview */}
              {isDrawing && drawStart && drawCurrent && (
                <div
                  className="absolute border-2 border-dashed border-blue-500 bg-blue-100/30 rounded"
                  style={{
                    left: Math.min(drawStart.x, drawCurrent.x),
                    top: Math.min(drawStart.y, drawCurrent.y),
                    width: Math.abs(drawCurrent.x - drawStart.x),
                    height: Math.abs(drawCurrent.y - drawStart.y),
                  }}
                />
              )}

              {/* Instructions */}
              {modules.length === 0 && !drawingType && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-slate-400">
                    <MousePointer className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">Select a module from the library</p>
                    <p className="text-sm">Then draw on this floor plan</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 3D View */
            <div
              className="absolute inset-4 rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200"
              style={{ perspective: "1500px" }}
            >
              {/* 3D Room Container */}
              <div
                ref={floorRef}
                className={cn(
                  "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/4",
                  drawingType && "cursor-crosshair"
                )}
                style={{
                  width: "600px",
                  height: "400px",
                  transformStyle: "preserve-3d",
                  transform: "rotateX(55deg) rotateZ(-45deg)",
                }}
                onMouseDown={handleFloorMouseDown}
                onMouseMove={handleFloorMouseMove}
                onMouseUp={handleFloorMouseUp}
                onMouseLeave={handleFloorMouseUp}
              >
                {/* Floor */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-150 border-2 border-slate-300">
                  {/* Grid */}
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage: "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)",
                      backgroundSize: "60px 60px",
                    }}
                  />
                </div>

                {/* Back Wall */}
                <div
                  className="absolute bg-gradient-to-b from-white to-slate-100 border-2 border-slate-300"
                  style={{
                    width: "600px",
                    height: "300px",
                    bottom: "100%",
                    left: 0,
                    transformOrigin: "bottom",
                    transform: "rotateX(-90deg)",
                  }}
                />

                {/* Side Wall */}
                <div
                  className="absolute bg-gradient-to-b from-slate-50 to-slate-150 border-2 border-slate-300"
                  style={{
                    width: "400px",
                    height: "300px",
                    bottom: "100%",
                    right: 0,
                    transformOrigin: "bottom right",
                    transform: "rotateX(-90deg) rotateY(90deg)",
                  }}
                />

                {/* 3D Modules */}
                {modules.map((mod) => (
                  <Module3D
                    key={mod.id}
                    module={mod}
                    isSelected={selectedModuleId === mod.id}
                    onClick={() => setSelectedModuleId(mod.id)}
                    position={{ x: mod.x, y: mod.y }}
                  />
                ))}

                {/* Draw preview in 3D */}
                {isDrawing && drawStart && drawCurrent && (
                  <div
                    className="absolute border-2 border-dashed border-blue-500 bg-blue-200/40"
                    style={{
                      left: Math.min(drawStart.x, drawCurrent.x),
                      top: Math.min(drawStart.y, drawCurrent.y),
                      width: Math.abs(drawCurrent.x - drawStart.x),
                      height: Math.abs(drawCurrent.y - drawStart.y),
                    }}
                  />
                )}
              </div>

              {/* View label */}
              <div className="absolute bottom-6 left-6 bg-purple-600/90 rounded-lg px-4 py-2">
                <p className="text-white font-medium">3D Room View</p>
                <p className="text-purple-200 text-xs">{modules.length} module(s) placed</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Config Panel or Cut List */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col">
          {showCutList ? (
            /* Cut List View */
            <>
              <div className="p-3 border-b border-slate-100 bg-green-50">
                <h2 className="font-semibold text-green-800 flex items-center gap-2">
                  <List className="w-4 h-4" />
                  Production Cut List
                </h2>
                <p className="text-xs text-green-600 mt-1">{allPanels.length} panels from {modules.length} modules</p>
              </div>

              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium text-slate-600">Panel</th>
                      <th className="text-right p-2 font-medium text-slate-600">L×W</th>
                      <th className="text-center p-2 font-medium text-slate-600">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allPanels.map((panel, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2">
                          <div className="font-medium text-slate-800">{panel.name}</div>
                          <div className="text-slate-400">{panel.material}</div>
                        </td>
                        <td className="p-2 text-right text-slate-600">
                          {panel.length}×{panel.width}
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-slate-200 px-2 py-0.5 rounded font-medium">{panel.qty}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {allPanels.length === 0 && (
                  <div className="p-8 text-center text-slate-400">
                    <List className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No modules placed yet</p>
                    <p className="text-xs mt-1">Draw modules to see cut list</p>
                  </div>
                )}
              </div>

              {allPanels.length > 0 && (
                <div className="p-3 border-t border-slate-200 bg-slate-50">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    Export to Optimizer
                  </Button>
                </div>
              )}
            </>
          ) : selectedModule ? (
            /* Module Config */
            <>
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">{selectedModule.name}</h2>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={handleDeleteModule}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* Dimensions */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-600 mb-2">Dimensions (mm)</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">Width</label>
                      <Input
                        type="number"
                        value={selectedModule.width}
                        onChange={(e) => updateSelectedModule({ width: +e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Height</label>
                      <Input
                        type="number"
                        value={selectedModule.height}
                        onChange={(e) => updateSelectedModule({ height: +e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Depth</label>
                      <Input
                        type="number"
                        value={selectedModule.depth}
                        onChange={(e) => updateSelectedModule({ depth: +e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Configuration */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-600 mb-2">Configuration</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-slate-600">Sections</label>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        value={selectedModule.sections}
                        onChange={(e) => updateSelectedModule({ sections: +e.target.value })}
                        className="h-8 w-20 text-sm text-center"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-slate-600">Shelves</label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={selectedModule.shelves}
                        onChange={(e) => updateSelectedModule({ shelves: +e.target.value })}
                        className="h-8 w-20 text-sm text-center"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-slate-600">Shutters</label>
                      <Input
                        type="number"
                        min={1}
                        max={6}
                        value={selectedModule.shutterCount}
                        onChange={(e) => updateSelectedModule({ shutterCount: +e.target.value })}
                        className="h-8 w-20 text-sm text-center"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-slate-600">Drawers</label>
                      <Input
                        type="number"
                        min={0}
                        max={6}
                        value={selectedModule.drawers}
                        onChange={(e) => updateSelectedModule({ drawers: +e.target.value })}
                        className="h-8 w-20 text-sm text-center"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-slate-600">Has Loft</label>
                      <Switch
                        checked={selectedModule.hasLoft}
                        onCheckedChange={(checked) => updateSelectedModule({ hasLoft: checked })}
                      />
                    </div>
                  </div>
                </div>

                {/* Panel Preview */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-600 mb-2">
                    Panels Generated ({generatePanels(selectedModule).length})
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-2 max-h-48 overflow-y-auto">
                    {generatePanels(selectedModule).map((panel, i) => (
                      <div key={i} className="text-xs py-1 border-b border-slate-100 last:border-0 flex justify-between">
                        <span className="text-slate-700">{panel.name}</span>
                        <span className="text-slate-400">{panel.length}×{panel.width} ×{panel.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center p-6 text-center text-slate-400">
              <div>
                <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No module selected</p>
                <p className="text-sm mt-1">Click a module or draw a new one</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default ModuleDrawDemo;
