import React, { useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowDown,
  ArrowRight,
  FileSpreadsheet,
  FileText,
  Wrench,
  RotateCcw,
  ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVisualQuotationStore } from "../store/visualQuotationStore";
import { buildCutlistItems, formatMm, ProductionPanelItem } from "../engine/productionEngine";
import {
  exportProductionExcel,
  exportProductionPDF,
} from "../engine/productionExportEngine";

// Simple override state for panels
type PanelOverride = { widthMm?: number; heightMm?: number };
type UnitOverrides = {
  overallWidthMm?: number;
  overallHeightMm?: number;
  gapMm?: number;
  panels?: Record<string, PanelOverride>;
};

// Room code mapping for meaningful panel labels
const ROOM_CODE_MAP: Record<string, string> = {
  // Room names (from roomName)
  "master bedroom": "MB",
  "master": "MB",
  "bedroom": "B",
  "kids bedroom": "KB",
  "kids": "KB",
  "guest bedroom": "GB",
  "guest": "GB",
  "living": "LR",
  "living room": "LR",
  "kitchen": "K",
  "dining": "DN",
  "dining room": "DN",
  "study": "ST",
  "study room": "ST",
  "pooja": "PJ",
  "pooja room": "PJ",
  "utility": "UT",
  "balcony": "BL",
  "other": "OT",
  "quotation": "Q",
};

// Unit type code mapping
const UNIT_CODE_MAP: Record<string, string> = {
  wardrobe: "W",
  kitchen: "K",
  tv_unit: "TV",
  dresser: "D",
  other: "U",
};

// Get room code from room name
function getRoomCode(roomName: string): string {
  const lower = roomName.toLowerCase().trim();
  // Try exact match first
  if (ROOM_CODE_MAP[lower]) return ROOM_CODE_MAP[lower];
  // Try partial match
  for (const [key, code] of Object.entries(ROOM_CODE_MAP)) {
    if (lower.includes(key)) return code;
  }
  // Fallback: first 2 chars uppercase
  return roomName.slice(0, 2).toUpperCase();
}

// Get unit code from unit type
function getUnitCode(unitType: string): string {
  return UNIT_CODE_MAP[unitType] || "U";
}

// CadGroup for organizing shutters by unit
type CadGroup = {
  key: string;
  roomIndex: number;
  roomName: string;
  roomCode: string;
  unitLabel: string;
  unitCode: string;
  unitNumber: number;
  unitId: string;
  unitIndex: number;
  colWidthsMm: number[];
  rowHeightsMm: number[];
  totalWidthMm: number;
  totalHeightMm: number;
  shutters: {
    row: number;
    col: number;
    widthMm: number;
    heightMm: number;
    label: string;
    id: string;
  }[];
  loftPanels: {
    col: number;
    widthMm: number;
    heightMm: number;
    label: string;
    id: string;
  }[];
  loftHeightMm: number;
};

function buildCadGroups(items: ProductionPanelItem[]): CadGroup[] {
  const groups = new Map<string, CadGroup>();

  // Track unit numbers per room for labeling (e.g., B1, B2 for multiple wardrobes in bedroom)
  const unitCountPerRoom = new Map<string, number>();

  items.forEach((item) => {
    const key = `${item.roomIndex}:${item.unitId}`;
    const existing = groups.get(key);
    const shutters = existing?.shutters ?? [];
    const loftPanels = existing?.loftPanels ?? [];

    // Get room and unit codes
    const roomCode = getRoomCode(item.roomName);
    const unitCode = getUnitCode(item.unitType);

    // Calculate unit number for this room (if not already set)
    let unitNumber = existing?.unitNumber ?? 0;
    if (!existing) {
      const roomKey = `${item.roomIndex}:${roomCode}`;
      const currentCount = unitCountPerRoom.get(roomKey) ?? 0;
      unitNumber = currentCount + 1;
      unitCountPerRoom.set(roomKey, unitNumber);
    }

    // Generate meaningful label: e.g., "MB1-S1" for Master Bedroom unit 1, Shutter 1
    const prefix = `${roomCode}${unitNumber}`;

    if (item.panelType === "SHUTTER") {
      // Sequential shutter number based on position
      const shutterNum = shutters.length + 1;
      shutters.push({
        row: item.row,
        col: item.col,
        widthMm: item.widthMm,
        heightMm: item.heightMm,
        label: `${prefix}-S${shutterNum}`,
        id: `${item.row}-${item.col}`,
      });
    } else if (item.panelType === "LOFT") {
      const loftNum = loftPanels.length + 1;
      loftPanels.push({
        col: item.col,
        widthMm: item.widthMm,
        heightMm: item.heightMm,
        label: `${prefix}-L${loftNum}`,
        id: `loft-${item.col}`,
      });
    }

    groups.set(key, {
      key,
      roomIndex: item.roomIndex,
      roomName: item.roomName,
      roomCode,
      unitLabel: item.unitLabel,
      unitCode,
      unitNumber,
      unitId: item.unitId,
      unitIndex: item.unitIndex,
      colWidthsMm: existing?.colWidthsMm ?? [],
      rowHeightsMm: existing?.rowHeightsMm ?? [],
      totalWidthMm: 0,
      totalHeightMm: 0,
      shutters,
      loftPanels,
      loftHeightMm: item.panelType === "LOFT" ? item.heightMm : (existing?.loftHeightMm ?? 0),
    });
  });

  return Array.from(groups.values()).map((group) => {
    const maxCol = Math.max(1, ...group.shutters.map((s) => s.col));
    const maxRow = Math.max(1, ...group.shutters.map((s) => s.row));
    const colWidths = Array.from({ length: maxCol }, (_, idx) => {
      const col = idx + 1;
      const widths = group.shutters.filter((s) => s.col === col).map((s) => s.widthMm);
      return widths.length > 0 ? Math.max(...widths) : 0;
    });
    const rowHeights = Array.from({ length: maxRow }, (_, idx) => {
      const row = idx + 1;
      const heights = group.shutters.filter((s) => s.row === row).map((s) => s.heightMm);
      return heights.length > 0 ? Math.max(...heights) : 0;
    });

    return {
      ...group,
      colWidthsMm: colWidths,
      rowHeightsMm: rowHeights,
      totalWidthMm: colWidths.reduce((sum, w) => sum + w, 0),
      totalHeightMm: rowHeights.reduce((sum, h) => sum + h, 0),
    };
  });
}

// Recalculate column widths and row heights from shutters
function recalculateGridDimensions(group: CadGroup): CadGroup {
  const maxCol = Math.max(1, ...group.shutters.map((s) => s.col));
  const maxRow = Math.max(1, ...group.shutters.map((s) => s.row));

  const colWidthsMm = Array.from({ length: maxCol }, (_, idx) => {
    const col = idx + 1;
    const widths = group.shutters.filter((s) => s.col === col).map((s) => s.widthMm);
    return widths.length > 0 ? Math.max(...widths) : 0;
  });

  const rowHeightsMm = Array.from({ length: maxRow }, (_, idx) => {
    const row = idx + 1;
    const heights = group.shutters.filter((s) => s.row === row).map((s) => s.heightMm);
    return heights.length > 0 ? Math.max(...heights) : 0;
  });

  return {
    ...group,
    colWidthsMm,
    rowHeightsMm,
    totalWidthMm: colWidthsMm.reduce((sum, w) => sum + w, 0),
    totalHeightMm: rowHeightsMm.reduce((sum, h) => sum + h, 0),
  };
}

// Apply overrides to group
function applyOverrides(group: CadGroup, overrides?: UnitOverrides): CadGroup {
  if (!overrides) return group;

  // Deep clone to avoid mutations
  let result: CadGroup = {
    ...group,
    colWidthsMm: [...group.colWidthsMm],
    rowHeightsMm: [...group.rowHeightsMm],
    shutters: group.shutters.map(s => ({ ...s })),
    loftPanels: group.loftPanels.map(p => ({ ...p })),
  };

  // Scale shutters if overall dimensions changed
  if (overrides.overallWidthMm && overrides.overallWidthMm !== group.totalWidthMm) {
    const scale = overrides.overallWidthMm / group.totalWidthMm;
    result.colWidthsMm = result.colWidthsMm.map(w => Math.round(w * scale));
    result.shutters = result.shutters.map(s => ({ ...s, widthMm: Math.round(s.widthMm * scale) }));
    result.loftPanels = result.loftPanels.map(p => ({ ...p, widthMm: Math.round(p.widthMm * scale) }));
    result.totalWidthMm = overrides.overallWidthMm;
  }

  if (overrides.overallHeightMm) {
    const targetHeight = overrides.overallHeightMm - result.loftHeightMm;
    if (targetHeight > 0 && result.totalHeightMm > 0) {
      const scale = targetHeight / result.totalHeightMm;
      result.rowHeightsMm = result.rowHeightsMm.map(h => Math.round(h * scale));
      result.shutters = result.shutters.map(s => ({ ...s, heightMm: Math.round(s.heightMm * scale) }));
      result.totalHeightMm = targetHeight;
    }
  }

  // Apply individual panel overrides - must apply even if no overall dimension changes
  if (overrides.panels && Object.keys(overrides.panels).length > 0) {
    result.shutters = result.shutters.map(s => {
      const po = overrides.panels?.[s.id];
      if (po) {
        return {
          ...s,
          widthMm: po.widthMm !== undefined ? po.widthMm : s.widthMm,
          heightMm: po.heightMm !== undefined ? po.heightMm : s.heightMm,
        };
      }
      return s;
    });
    result.loftPanels = result.loftPanels.map(p => {
      const po = overrides.panels?.[p.id];
      if (po) {
        return {
          ...p,
          widthMm: po.widthMm !== undefined ? po.widthMm : p.widthMm,
          heightMm: po.heightMm !== undefined ? po.heightMm : p.heightMm,
        };
      }
      return p;
    });

    // Recalculate grid dimensions from the modified shutters
    result = recalculateGridDimensions(result);
  }

  return result;
}

// Canvas Preview Component - displays the captured canvas snapshot (cropped to unit bounds)
const CanvasPreview: React.FC<{
  snapshotSrc?: string;
  maxWidth?: number;
  maxHeight?: number;
}> = ({ snapshotSrc, maxWidth = 500, maxHeight = 400 }) => {
  if (!snapshotSrc) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded border border-gray-200"
        style={{ width: 300, height: 200 }}
      >
        <div className="text-center text-gray-400">
          <ImageOff className="h-8 w-8 mx-auto mb-1" />
          <p className="text-xs">No Preview</p>
        </div>
      </div>
    );
  }

  // Image will auto-size based on natural dimensions, constrained by max values
  return (
    <img
      src={snapshotSrc}
      alt="Canvas preview"
      className="rounded border border-gray-200"
      style={{
        maxWidth: `${maxWidth}px`,
        maxHeight: `${maxHeight}px`,
        width: "auto",
        height: "auto",
      }}
    />
  );
};

const ProductionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Editing state - which panel is being edited
  const [editing, setEditing] = useState<{
    unitKey: string;
    panelId: string | null; // null = editing overall dimensions
    field: "width" | "height";
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Overrides per unit
  const [overrides, setOverrides] = useState<Record<string, UnitOverrides>>({});

  // Gap setting (simple single value)
  const [gapMm, setGapMm] = useState(3);

  const {
    client,
    meta,
    quotationRooms,
    drawnUnits,
    activeRoomIndex,
    productionSettings,
    productionCanvasSnapshots,
  } = useVisualQuotationStore();

  const shutterLaminateCode = useVisualQuotationStore(s => s.units[0]?.finish?.shutterLaminateCode);
  const loftLaminateCode = useVisualQuotationStore(s => s.units[0]?.finish?.loftLaminateCode);

  const items = useMemo(
    () => buildCutlistItems({
      quotationRooms,
      currentDrawnUnits: drawnUnits,
      activeRoomIndex,
      settings: productionSettings,
      shutterLaminateCode,
      loftLaminateCode,
    }),
    [quotationRooms, drawnUnits, activeRoomIndex, productionSettings, shutterLaminateCode, loftLaminateCode]
  );

  const rawGroups = useMemo(() => buildCadGroups(items), [items]);
  const cadGroups = useMemo(() => rawGroups.map(g => applyOverrides(g, overrides[g.key])), [rawGroups, overrides]);

  const hasData = items.length > 0;

  const handleBack = () => {
    const params = searchParams.toString();
    navigate(`/visual-quotation${params ? `?${params}` : ""}`);
  };

  const handleExportPdf = () => {
    if (!hasData) return alert("Add unit dimensions first.");
    exportProductionPDF({ client, meta, items, settings: productionSettings });
  };

  const handleExportExcel = () => {
    if (!hasData) return alert("Add unit dimensions first.");
    exportProductionExcel({ client, meta, items, settings: productionSettings });
  };

  // Start editing
  const startEdit = (unitKey: string, panelId: string | null, field: "width" | "height", currentValue: number) => {
    setEditing({ unitKey, panelId, field });
    setEditValue(String(currentValue));
  };

  // Save edit
  const saveEdit = useCallback(() => {
    if (!editing) return;
    const value = Math.max(1, Number(editValue) || 0);

    setOverrides(prev => {
      const unitOverrides = prev[editing.unitKey] || {};

      if (editing.panelId === null) {
        // Editing overall dimensions
        return {
          ...prev,
          [editing.unitKey]: {
            ...unitOverrides,
            [editing.field === "width" ? "overallWidthMm" : "overallHeightMm"]: value,
          },
        };
      } else {
        // Editing individual panel - for width edits, update ALL panels in that column
        // For height edits, update ALL panels in that row
        // This ensures the grid stays consistent
        const panelId = editing.panelId;
        const [rowStr, colStr] = panelId.split("-");
        const row = Number(rowStr);
        const col = Number(colStr);

        // Find the group to get all shutters in same column/row
        const group = rawGroups.find(g => g.key === editing.unitKey);
        if (!group) {
          return {
            ...prev,
            [editing.unitKey]: {
              ...unitOverrides,
              panels: {
                ...unitOverrides.panels,
                [panelId]: {
                  ...unitOverrides.panels?.[panelId],
                  [editing.field === "width" ? "widthMm" : "heightMm"]: value,
                },
              },
            },
          };
        }

        // Get all panels that need to be updated
        const panelsToUpdate: Record<string, PanelOverride> = { ...unitOverrides.panels };

        if (editing.field === "width") {
          // Update all panels in same column
          group.shutters.filter(s => s.col === col).forEach(s => {
            panelsToUpdate[s.id] = {
              ...panelsToUpdate[s.id],
              widthMm: value,
            };
          });
        } else {
          // Update all panels in same row
          group.shutters.filter(s => s.row === row).forEach(s => {
            panelsToUpdate[s.id] = {
              ...panelsToUpdate[s.id],
              heightMm: value,
            };
          });
        }

        return {
          ...prev,
          [editing.unitKey]: {
            ...unitOverrides,
            panels: panelsToUpdate,
          },
        };
      }
    });

    setEditing(null);
    setEditValue("");
  }, [editing, editValue, rawGroups]);

  // Cancel edit
  const cancelEdit = () => {
    setEditing(null);
    setEditValue("");
  };

  // Reset unit overrides
  const resetUnit = (unitKey: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[unitKey];
      return next;
    });
  };

  // Stats
  const totalPanels = items.length;
  const shutterCount = items.filter(i => i.panelType === "SHUTTER").length;
  const loftCount = items.filter(i => i.panelType === "LOFT").length;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="flex-shrink-0 h-14 bg-white border-b border-gray-300">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 text-black">
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

          {/* Simple gap control */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <span>Gap:</span>
              <Input
                type="number"
                min={0}
                max={10}
                value={gapMm}
                onChange={e => setGapMm(Math.max(0, Number(e.target.value) || 0))}
                className="h-8 w-16 text-center border-gray-300"
              />
              <span className="text-xs text-gray-500">mm</span>
            </label>
          </div>

          {/* Export */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!hasData} className="gap-2 border-gray-400">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!hasData} className="gap-2 border-gray-400">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            Add unit dimensions in quotation to see production view.
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <div className="bg-white rounded-lg px-4 py-2 border border-gray-300">
                <span className="text-gray-600">Total:</span>{" "}
                <span className="font-bold text-black">{totalPanels}</span> panels
              </div>
              <div className="bg-white rounded-lg px-4 py-2 border border-gray-300">
                <span className="text-gray-600">Shutters:</span>{" "}
                <span className="font-bold text-black">{shutterCount}</span>
              </div>
              {loftCount > 0 && (
                <div className="bg-white rounded-lg px-4 py-2 border border-gray-300">
                  <span className="text-gray-600">Loft:</span>{" "}
                  <span className="font-bold text-black">{loftCount}</span>
                </div>
              )}
            </div>

            {/* Unit Cards - Full Width with Canvas Preview on Left, Production View on Right */}
            <div className="space-y-4">
              {cadGroups.map((group) => {
                const hasOverride = !!overrides[group.key];
                const totalH = group.totalHeightMm + group.loftHeightMm;

                // Get canvas snapshot for this room
                const canvasSnapshot = productionCanvasSnapshots.get(group.roomIndex);

                // Larger production view - scale to fit 450px width max, maintain aspect ratio
                const prodMaxWidth = 450;
                const prodMaxHeight = 350;
                const totalHeightMm = group.totalHeightMm + group.loftHeightMm;
                const aspectRatio = group.totalWidthMm / (totalHeightMm || 1);

                // Calculate container size maintaining aspect ratio
                let prodContainerWidth = prodMaxWidth;
                let prodContainerHeight = prodContainerWidth / aspectRatio;
                if (prodContainerHeight > prodMaxHeight) {
                  prodContainerHeight = prodMaxHeight;
                  prodContainerWidth = prodContainerHeight * aspectRatio;
                }

                const gapPx = Math.max(3, gapMm * 1.5);

                // Calculate proportional widths for production grid
                const totalGapWidth = gapPx * (group.colWidthsMm.length - 1);
                const availableWidth = prodContainerWidth - totalGapWidth - gapPx * 2; // account for padding
                const totalMm = group.colWidthsMm.reduce((s, w) => s + w, 0) || 1;
                const colPxWidths = group.colWidthsMm.map(w =>
                  Math.round((w / totalMm) * availableWidth)
                );

                // Height calculation for production grid
                const rowGapHeight = gapPx * (group.rowHeightsMm.length - 1);
                const loftHeightRatio = group.loftHeightMm / (totalHeightMm || 1);
                const loftHeight = group.loftHeightMm > 0 ? Math.max(50, prodContainerHeight * loftHeightRatio) : 0;
                const availableHeight = prodContainerHeight - rowGapHeight - loftHeight - (group.loftHeightMm > 0 ? gapPx : 0) - gapPx * 2;
                const totalRowMm = group.rowHeightsMm.reduce((s, h) => s + h, 0) || 1;
                const rowPxHeights = group.rowHeightsMm.map(h =>
                  Math.round((h / totalRowMm) * availableHeight)
                );

                return (
                  <div
                    key={group.key}
                    className={`bg-white rounded-lg ${
                      hasOverride ? "border-2 border-gray-600" : "border border-gray-300"
                    }`}
                  >
                    {/* Header Bar */}
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                          {group.roomCode}{group.unitNumber}
                        </div>
                        <div>
                          <h3 className="font-bold text-black text-sm">{group.roomName}</h3>
                          <p className="text-xs text-gray-500">{group.unitLabel}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Overall Dimensions Display */}
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded border border-gray-300">
                          <span className="text-xs font-bold text-gray-600">W</span>
                          {editing?.unitKey === group.key && editing.panelId === null && editing.field === "width" ? (
                            <Input
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") saveEdit();
                                if (e.key === "Escape") cancelEdit();
                              }}
                              autoFocus
                              className="h-6 w-16 text-xs font-mono border-gray-400"
                            />
                          ) : (
                            <button
                              onClick={() => startEdit(group.key, null, "width", group.totalWidthMm)}
                              className="text-sm font-bold text-black hover:bg-gray-100 px-1 rounded"
                            >
                              {formatMm(group.totalWidthMm, 1)}
                            </button>
                          )}
                          <span className="text-xs font-bold text-gray-600">H</span>
                          {editing?.unitKey === group.key && editing.panelId === null && editing.field === "height" ? (
                            <Input
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") saveEdit();
                                if (e.key === "Escape") cancelEdit();
                              }}
                              autoFocus
                              className="h-6 w-16 text-xs font-mono border-gray-400"
                            />
                          ) : (
                            <button
                              onClick={() => startEdit(group.key, null, "height", totalH)}
                              className="text-sm font-bold text-black hover:bg-gray-100 px-1 rounded"
                            >
                              {formatMm(totalH, 1)}
                            </button>
                          )}
                          <span className="text-xs text-gray-500">mm</span>
                        </div>
                        {hasOverride && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetUnit(group.key)}
                            className="h-7 gap-1 text-gray-600 hover:text-black hover:bg-gray-100"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Content: Canvas Preview (Left) + Production View (Right) */}
                    <div className="flex p-4 gap-4">
                      {/* Left: Canvas Preview - cropped to unit bounds */}
                      <div className="flex-shrink-0">
                        <p className="text-[10px] text-gray-500 mb-1 text-center">Canvas Preview</p>
                        <CanvasPreview
                          snapshotSrc={canvasSnapshot}
                          maxWidth={500}
                          maxHeight={400}
                        />
                      </div>

                      {/* Right: Production View */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-500 mb-1 text-center">Production View</p>
                        <div
                          className="relative mx-auto bg-gray-200"
                          style={{
                            width: `${prodContainerWidth}px`,
                            padding: `${gapPx}px`,
                          }}
                        >
                          {/* Loft Section */}
                          {group.loftPanels.length > 0 && (
                            <div
                              className="flex mb-1"
                              style={{ gap: `${gapPx}px`, marginBottom: `${gapPx}px` }}
                            >
                              {group.loftPanels.map((panel, idx) => (
                                <div
                                  key={panel.id}
                                  className="bg-white border-2 border-gray-800 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
                                  style={{
                                    width: `${colPxWidths[idx] || colPxWidths[0]}px`,
                                    height: `${loftHeight}px`,
                                  }}
                                  onClick={() => startEdit(group.key, panel.id, "width", panel.widthMm)}
                                >
                                  <div className="text-sm font-bold text-black">W{formatMm(panel.widthMm, 1)}</div>
                                  <div className="text-sm font-bold text-black">H{formatMm(panel.heightMm, 1)}</div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Main Shutters Grid */}
                          <div
                            className="grid"
                            style={{
                              gridTemplateColumns: colPxWidths.map(w => `${w}px`).join(" "),
                              gridTemplateRows: rowPxHeights.map(h => `${h}px`).join(" "),
                              gap: `${gapPx}px`,
                            }}
                          >
                            {group.shutters.map((panel) => {
                              const isEditing = editing?.unitKey === group.key && editing?.panelId === panel.id;
                              const isEditingWidth = isEditing && editing?.field === "width";
                              const isEditingHeight = isEditing && editing?.field === "height";

                              return (
                                <div
                                  key={panel.id}
                                  className="bg-white border-2 border-gray-800 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
                                  style={{
                                    gridColumn: panel.col,
                                    gridRow: panel.row,
                                  }}
                                >
                                  {isEditingWidth ? (
                                    <input
                                      type="number"
                                      value={editValue}
                                      onChange={e => setEditValue(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === "Enter") saveEdit();
                                        if (e.key === "Escape") cancelEdit();
                                      }}
                                      onBlur={saveEdit}
                                      autoFocus
                                      className="w-16 h-6 text-sm text-center font-mono border border-gray-400 rounded bg-white"
                                    />
                                  ) : (
                                    <button
                                      onClick={() => startEdit(group.key, panel.id, "width", panel.widthMm)}
                                      className="text-sm font-bold text-black hover:bg-gray-200 px-1 rounded"
                                    >
                                      W{formatMm(panel.widthMm, 1)}
                                    </button>
                                  )}
                                  {isEditingHeight ? (
                                    <input
                                      type="number"
                                      value={editValue}
                                      onChange={e => setEditValue(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === "Enter") saveEdit();
                                        if (e.key === "Escape") cancelEdit();
                                      }}
                                      onBlur={saveEdit}
                                      autoFocus
                                      className="w-16 h-6 text-sm text-center font-mono border border-gray-400 rounded bg-white"
                                    />
                                  ) : (
                                    <button
                                      onClick={() => startEdit(group.key, panel.id, "height", panel.heightMm)}
                                      className="text-sm font-bold text-black hover:bg-gray-200 px-1 rounded"
                                    >
                                      H{formatMm(panel.heightMm, 1)}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Column Width Labels */}
                        <div
                          className="flex justify-center mt-2"
                          style={{ gap: `${gapPx}px`, width: `${prodContainerWidth}px`, margin: "8px auto 0" }}
                        >
                          {group.colWidthsMm.map((w, i) => (
                            <div
                              key={i}
                              className="text-center text-xs text-gray-600 border-t border-gray-400 pt-1"
                              style={{ width: `${colPxWidths[i]}px` }}
                            >
                              {formatMm(w, 1)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Simple Cut List Table */}
            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <h3 className="font-bold text-black mb-3">Cut List</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 text-gray-600">
                      <th className="text-left py-2 px-2">#</th>
                      <th className="text-left py-2 px-2">Unit</th>
                      <th className="text-left py-2 px-2">Panel</th>
                      <th className="text-right py-2 px-2">Width</th>
                      <th className="text-right py-2 px-2">Height</th>
                      <th className="text-center py-2 px-2">Grain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-2 px-2 text-gray-500">{idx + 1}</td>
                        <td className="py-2 px-2 text-black">{item.unitLabel}</td>
                        <td className="py-2 px-2">
                          <span className="inline-flex px-2 py-0.5 rounded text-xs border border-solid border-gray-400 text-black">
                            {item.panelLabel}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-black">{formatMm(item.widthMm, 1)}</td>
                        <td className="py-2 px-2 text-right font-mono text-black">{formatMm(item.heightMm, 1)}</td>
                        <td className="py-2 px-2 text-center">
                          {item.grainDirection ? (
                            <ArrowDown className="h-4 w-4 inline text-gray-500" />
                          ) : (
                            <ArrowRight className="h-4 w-4 inline text-gray-500" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProductionPage;
