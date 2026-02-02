/**
 * Production Service
 * ------------------
 * Business logic for Production page.
 * Handles CAD group building, dimension calculations, and data transformations.
 *
 * This service is READ-ONLY with respect to quotation data.
 * It only transforms data for production display.
 */

import type { ProductionPanelItem } from "../engine/productionEngine";
import type { PanelOverrides, UnitGapSettings } from "./storageService";

// Default gap for new units (mm)
export const DEFAULT_GAP_MM = 2;

// Gap options for dropdown
export const GAP_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 8, 10];

// ============================================================================
// Room & Unit Code Mappings
// ============================================================================

const ROOM_CODE_MAP: Record<string, string> = {
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

const UNIT_CODE_MAP: Record<string, string> = {
  wardrobe: "W",
  kitchen: "K",
  tv_unit: "TV",
  dresser: "D",
  other: "U",
};

/**
 * Get room code from room name
 */
export function getRoomCode(roomName: string): string {
  const lower = roomName.toLowerCase().trim();
  if (ROOM_CODE_MAP[lower]) return ROOM_CODE_MAP[lower];
  for (const [key, code] of Object.entries(ROOM_CODE_MAP)) {
    if (lower.includes(key)) return code;
  }
  return roomName.slice(0, 2).toUpperCase();
}

/**
 * Get unit code from unit type
 */
export function getUnitCode(unitType: string): string {
  return UNIT_CODE_MAP[unitType] || "U";
}

// ============================================================================
// CAD Group Types
// ============================================================================

export interface CadGroupShutter {
  row: number;
  col: number;
  widthMm: number;
  heightMm: number;
  label: string;
  id: string;
}

export interface CadGroupLoftPanel {
  col: number;
  widthMm: number;
  heightMm: number;
  label: string;
  id: string;
}

export interface CadGroup {
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
  shutters: CadGroupShutter[];
  loftPanels: CadGroupLoftPanel[];
  loftHeightMm: number;
}

// ============================================================================
// CAD Group Builder
// ============================================================================

/**
 * Build CAD groups from production panel items
 * Groups panels by unit for visual display
 */
export function buildCadGroups(items: ProductionPanelItem[]): CadGroup[] {
  const groups = new Map<string, CadGroup>();
  const unitCountPerRoom = new Map<string, number>();

  items.forEach((item) => {
    const key = `${item.roomIndex}:${item.unitId}`;
    const existing = groups.get(key);
    const shutters = existing?.shutters ?? [];
    const loftPanels = existing?.loftPanels ?? [];

    const roomCode = getRoomCode(item.roomName);
    const unitCode = getUnitCode(item.unitType);

    let unitNumber = existing?.unitNumber ?? 0;
    if (!existing) {
      const roomKey = `${item.roomIndex}:${roomCode}`;
      const currentCount = unitCountPerRoom.get(roomKey) ?? 0;
      unitNumber = currentCount + 1;
      unitCountPerRoom.set(roomKey, unitNumber);
    }

    const prefix = `${roomCode}${unitNumber}`;

    if (item.panelType === "SHUTTER") {
      const shutterNum = shutters.length + 1;
      shutters.push({
        row: item.row,
        col: item.col,
        widthMm: item.widthMm,
        heightMm: item.heightMm,
        label: `${prefix}-S${shutterNum}`,
        id: item.id,
      });
    } else if (item.panelType === "LOFT") {
      const loftNum = loftPanels.length + 1;
      loftPanels.push({
        col: item.col,
        widthMm: item.widthMm,
        heightMm: item.heightMm,
        label: `${prefix}-L${loftNum}`,
        id: item.id,
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
    const isLoftOnly = group.shutters.length === 0 && group.loftPanels.length > 0;

    let colWidths: number[];
    let rowHeights: number[];

    if (isLoftOnly) {
      const maxCol = Math.max(1, ...group.loftPanels.map((p) => p.col));
      colWidths = Array.from({ length: maxCol }, (_, idx) => {
        const col = idx + 1;
        const widths = group.loftPanels.filter((p) => p.col === col).map((p) => p.widthMm);
        return widths.length > 0 ? Math.max(...widths) : 0;
      });
      rowHeights = [];
    } else {
      const maxCol = Math.max(1, ...group.shutters.map((s) => s.col));
      const maxRow = Math.max(1, ...group.shutters.map((s) => s.row));
      colWidths = Array.from({ length: maxCol }, (_, idx) => {
        const col = idx + 1;
        const widths = group.shutters.filter((s) => s.col === col).map((s) => s.widthMm);
        return widths.length > 0 ? Math.max(...widths) : 0;
      });
      rowHeights = Array.from({ length: maxRow }, (_, idx) => {
        const row = idx + 1;
        const heights = group.shutters.filter((s) => s.row === row).map((s) => s.heightMm);
        return heights.length > 0 ? Math.max(...heights) : 0;
      });
    }

    const shutterHeight = rowHeights.reduce((sum, h) => sum + h, 0);
    const totalHeightMm = shutterHeight + (group.loftHeightMm || 0);

    return {
      ...group,
      colWidthsMm: colWidths,
      rowHeightsMm: rowHeights,
      totalWidthMm: colWidths.reduce((sum, w) => sum + w, 0),
      totalHeightMm,
    };
  });
}

// ============================================================================
// Dimension Calculation Helpers
// ============================================================================

/**
 * Get overridden dimensions for a panel
 */
export function getOverriddenDimensions(
  panelId: string,
  originalW: number,
  originalH: number,
  panelOverrides: PanelOverrides
): { width: number; height: number } {
  const override = panelOverrides[panelId];
  return {
    width: override?.width ?? originalW,
    height: override?.height ?? originalH,
  };
}

/**
 * Calculate layout dimensions for a CAD group with overrides applied
 */
export function calculateGroupLayout(
  group: CadGroup,
  gapMm: number,
  panelOverrides: PanelOverrides
): {
  colWidthsMm: number[];
  rowHeightsMm: number[];
  loftHeightMm: number;
  totalWidthMm: number;
  totalHeightMm: number;
  isLoftOnly: boolean;
} {
  const isLoftOnly = group.shutters.length === 0 && group.loftPanels.length > 0;

  let colWidthsMm: number[];
  let rowHeightsMm: number[];

  if (isLoftOnly) {
    const maxCol = Math.max(1, ...group.loftPanels.map(p => p.col));
    colWidthsMm = Array.from({ length: maxCol }, (_, idx) => {
      const col = idx + 1;
      const widths = group.loftPanels
        .filter(p => p.col === col)
        .map(p => getOverriddenDimensions(p.id, p.widthMm, p.heightMm, panelOverrides).width);
      return widths.length > 0 ? Math.max(...widths) : 0;
    });
    rowHeightsMm = [];
  } else {
    const maxCol = Math.max(1, ...group.shutters.map(s => s.col));
    colWidthsMm = Array.from({ length: maxCol }, (_, idx) => {
      const col = idx + 1;
      const widths = group.shutters
        .filter(s => s.col === col)
        .map(s => getOverriddenDimensions(s.id, s.widthMm, s.heightMm, panelOverrides).width);
      return widths.length > 0 ? Math.max(...widths) : 0;
    });

    const maxRow = Math.max(1, ...group.shutters.map(s => s.row));
    rowHeightsMm = Array.from({ length: maxRow }, (_, idx) => {
      const row = idx + 1;
      const heights = group.shutters
        .filter(s => s.row === row)
        .map(s => getOverriddenDimensions(s.id, s.widthMm, s.heightMm, panelOverrides).height);
      return heights.length > 0 ? Math.max(...heights) : 0;
    });
  }

  const loftHeightMm = group.loftPanels.length > 0
    ? Math.max(...group.loftPanels.map(p => getOverriddenDimensions(p.id, p.widthMm, p.heightMm, panelOverrides).height))
    : 0;

  const totalWidthMm = colWidthsMm.reduce((sum, w) => sum + w, 0);
  const totalHeightMm = rowHeightsMm.reduce((sum, h) => sum + h, 0) + loftHeightMm;

  return { colWidthsMm, rowHeightsMm, loftHeightMm, totalWidthMm, totalHeightMm, isLoftOnly };
}

/**
 * Calculate new shutter dimensions when gap changes
 */
export function calculateGapAdjustedDimensions(
  group: CadGroup,
  oldGap: number,
  newGap: number,
  panelOverrides: PanelOverrides
): PanelOverrides {
  const newOverrides: PanelOverrides = {};

  // Get current dimensions with overrides
  const maxCol = Math.max(1, ...group.shutters.map(s => s.col));
  const currentColWidths = Array.from({ length: maxCol }, (_, idx) => {
    const col = idx + 1;
    const widths = group.shutters
      .filter(s => s.col === col)
      .map(s => getOverriddenDimensions(s.id, s.widthMm, s.heightMm, panelOverrides).width);
    return widths.length > 0 ? Math.max(...widths) : 0;
  });

  const maxRow = Math.max(1, ...group.shutters.map(s => s.row));
  const currentRowHeights = Array.from({ length: maxRow }, (_, idx) => {
    const row = idx + 1;
    const heights = group.shutters
      .filter(s => s.row === row)
      .map(s => getOverriddenDimensions(s.id, s.widthMm, s.heightMm, panelOverrides).height);
    return heights.length > 0 ? Math.max(...heights) : 0;
  });

  const numCols = currentColWidths.length;
  const numRows = currentRowHeights.length;

  // Width calculation
  const currentTotalShutterWidth = currentColWidths.reduce((sum, w) => sum + w, 0);
  const oldTotalGapWidth = (numCols - 1) * oldGap;
  const currentTotalWidth = currentTotalShutterWidth + oldTotalGapWidth;
  const newTotalGapWidth = (numCols - 1) * newGap;
  const availableForShutters = currentTotalWidth - newTotalGapWidth;
  const newColWidth = Math.round(availableForShutters / numCols);

  // Height calculation
  const currentTotalShutterHeight = currentRowHeights.reduce((sum, h) => sum + h, 0);
  const oldTotalGapHeight = (numRows - 1) * oldGap;
  const currentTotalHeight = currentTotalShutterHeight + oldTotalGapHeight;
  const newTotalGapHeight = (numRows - 1) * newGap;
  const availableForShuttersH = currentTotalHeight - newTotalGapHeight;
  const newRowHeight = Math.round(availableForShuttersH / numRows);

  // Apply to all shutters
  group.shutters.forEach(shutter => {
    newOverrides[shutter.id] = {
      width: newColWidth,
      height: newRowHeight,
    };
  });

  return newOverrides;
}

/**
 * Calculate new panel dimensions when overall width/height changes
 */
export function calculateOverallDimensionChange(
  group: CadGroup,
  field: "width" | "height",
  newValue: number,
  gapMm: number,
  panelOverrides: PanelOverrides
): PanelOverrides {
  const newOverrides: PanelOverrides = {};

  const maxCol = Math.max(1, ...group.shutters.map(s => s.col));
  const maxRow = Math.max(1, ...group.shutters.map(s => s.row));
  const numCols = maxCol;
  const numRows = maxRow;

  if (field === "width") {
    const totalGapWidth = (numCols - 1) * gapMm;
    const availableForShutters = newValue - totalGapWidth;
    const newColWidth = Math.round(availableForShutters / numCols);

    group.shutters.forEach(shutter => {
      const currentHeight = getOverriddenDimensions(shutter.id, shutter.widthMm, shutter.heightMm, panelOverrides).height;
      newOverrides[shutter.id] = {
        width: newColWidth,
        height: currentHeight,
      };
    });

    group.loftPanels.forEach(panel => {
      const currentHeight = getOverriddenDimensions(panel.id, panel.widthMm, panel.heightMm, panelOverrides).height;
      newOverrides[panel.id] = {
        width: newColWidth,
        height: currentHeight,
      };
    });
  } else {
    const loftHeightMm = group.loftPanels.length > 0
      ? Math.max(...group.loftPanels.map(p => getOverriddenDimensions(p.id, p.widthMm, p.heightMm, panelOverrides).height))
      : 0;

    const totalGapHeight = (numRows - 1) * gapMm;
    const loftGap = loftHeightMm > 0 ? gapMm : 0;
    const availableForShutters = newValue - totalGapHeight - loftHeightMm - loftGap;
    const newRowHeight = Math.round(availableForShutters / numRows);

    group.shutters.forEach(shutter => {
      const currentWidth = getOverriddenDimensions(shutter.id, shutter.widthMm, shutter.heightMm, panelOverrides).width;
      newOverrides[shutter.id] = {
        width: currentWidth,
        height: newRowHeight,
      };
    });

    group.loftPanels.forEach(panel => {
      const dims = getOverriddenDimensions(panel.id, panel.widthMm, panel.heightMm, panelOverrides);
      newOverrides[panel.id] = {
        width: dims.width,
        height: dims.height,
      };
    });
  }

  return newOverrides;
}

// ============================================================================
// Production Stats
// ============================================================================

export interface ProductionStats {
  totalPanels: number;
  shutterCount: number;
  loftCount: number;
}

/**
 * Calculate production statistics from items
 */
export function calculateProductionStats(items: ProductionPanelItem[]): ProductionStats {
  return {
    totalPanels: items.length,
    shutterCount: items.filter(i => i.panelType === "SHUTTER").length,
    loftCount: items.filter(i => i.panelType === "LOFT").length,
  };
}

/**
 * Filter and transform production items with overrides
 */
export function getFilteredProductionItems(
  allItems: ProductionPanelItem[],
  deletedPanels: Set<string>,
  panelOverrides: PanelOverrides
): ProductionPanelItem[] {
  return allItems
    .filter(item => !deletedPanels.has(item.id))
    .map(item => {
      const override = panelOverrides[item.id];
      if (!override) return item;
      return {
        ...item,
        widthMm: override.width ?? item.widthMm,
        heightMm: override.height ?? item.heightMm,
      };
    });
}
