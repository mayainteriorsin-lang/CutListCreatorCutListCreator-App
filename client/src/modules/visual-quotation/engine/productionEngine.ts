import type { DrawnUnit, ProductionSettings, QuotationRoom } from "../types";
import { UNIT_TYPE_LABELS } from "../constants";
import { generateModuleCutlistPanels, type ModuleCutlistPanel } from "@/modules/design/engine/panelGenerator";
import type { ModuleConfig } from "@/modules/design/engine/shapeGenerator";

export type ProductionPanelType = "SHUTTER" | "LOFT" | "KITCHEN_BASE" | "KITCHEN_WALL";

export interface ProductionPanelItem {
  id: string;
  roomIndex: number;
  roomName: string;
  unitIndex: number;
  unitId: string;
  unitType: string;
  unitLabel: string;
  panelType: ProductionPanelType;
  panelLabel: string;
  row: number;
  col: number;
  widthMm: number;
  heightMm: number;
  laminateCode?: string;
  grainDirection: boolean;
}

function roundToStep(valueMm: number, stepMm: number): number {
  if (!Number.isFinite(valueMm)) return 0;
  if (!stepMm || stepMm <= 0) return Math.round(valueMm);
  return Math.round(valueMm / stepMm) * stepMm;
}

export function applyProductionSizing(
  valueMm: number,
  reductionMm: number,
  roundingMm: number
): number {
  const reduced = Math.max(1, valueMm - Math.max(0, reductionMm || 0));
  return roundToStep(reduced, roundingMm);
}

export function formatMm(valueMm: number, roundingMm: number): string {
  const stepMm = Math.max(0, roundingMm || 0);
  const decimals = stepMm > 0 && stepMm < 1
    ? Math.min(3, String(stepMm).split(".")[1]?.length ?? 1)
    : 0;
  const fixed = decimals > 0 ? valueMm.toFixed(decimals) : String(Math.round(valueMm));
  return fixed.replace(/\.0+$/, "");
}

// Unified edge builder - same logic for all panel types
function buildEdges(
  start: number,
  size: number,
  dividers: number[] | undefined,
  count: number
): number[] {
  const edges: number[] = [start];
  const safeCount = Math.max(1, count || 1);
  const end = start + size;

  // Minimum panel width in pixels (to avoid tiny panels)
  const minPanelWidth = Math.max(10, size * 0.02);

  // Filter dividers within valid range
  const sortedDividers = (dividers || [])
    .filter(d => d > start + minPanelWidth && d < end - minPanelWidth)
    .sort((a, b) => a - b);

  // Validate dividers count matches expected
  const expectedDividers = safeCount - 1;
  const hasValidDividers = sortedDividers.length === expectedDividers && sortedDividers.length > 0;

  if (hasValidDividers) {
    // Verify all panels have reasonable width
    let valid = true;
    let prev = start;
    for (const d of sortedDividers) {
      if (d - prev < minPanelWidth) { valid = false; break; }
      prev = d;
    }
    if (end - prev < minPanelWidth) valid = false;

    if (valid) {
      edges.push(...sortedDividers);
    } else {
      // Fall back to even distribution
      for (let i = 1; i < safeCount; i++) edges.push(start + (size / safeCount) * i);
    }
  } else if (safeCount > 1) {
    // Even distribution
    for (let i = 1; i < safeCount; i++) edges.push(start + (size / safeCount) * i);
  }

  edges.push(end);
  return edges;
}

// Unified panel generation - same function for SHUTTER, LOFT, KITCHEN_BASE, KITCHEN_WALL
interface PanelGridConfig {
  box: { x: number; y: number; width: number; height: number };
  totalWidthMm: number;
  totalHeightMm: number;
  colCount: number;
  rowCount: number;
  colDividers?: number[];
  rowDividers?: number[];
  panelType: ProductionPanelType;
  labelPrefix: string;
  laminateCode?: string;
  settings: ProductionSettings;
  // Context for item creation
  roomIndex: number;
  roomName: string;
  unitIndex: number;
  unitId: string;
  unitType: string;
  unitLabel: string;
}

function generatePanelGrid(config: PanelGridConfig): ProductionPanelItem[] {
  const {
    box, totalWidthMm, totalHeightMm,
    colCount, rowCount,
    colDividers, rowDividers,
    panelType, labelPrefix, laminateCode,
    settings,
    roomIndex, roomName, unitIndex, unitId, unitType, unitLabel,
  } = config;

  const items: ProductionPanelItem[] = [];

  // Calculate pixel-to-mm ratio
  const mmPerPxX = totalWidthMm / box.width;
  const mmPerPxY = totalHeightMm / box.height;

  if (!Number.isFinite(mmPerPxX) || !Number.isFinite(mmPerPxY)) return items;

  // Build column edges (X axis)
  const colEdges = buildEdges(box.x, box.width, colDividers, colCount);

  // Build row edges (Y axis)
  const rowEdges = buildEdges(box.y, box.height, rowDividers, rowCount);

  // Generate panels for each cell in the grid
  rowEdges.slice(0, -1).forEach((topEdge, rowIdx) => {
    const bottomEdge = rowEdges[rowIdx + 1]!;
    colEdges.slice(0, -1).forEach((leftEdge, colIdx) => {
      const rightEdge = colEdges[colIdx + 1]!;

      // Calculate dimensions in mm
      const rawWidthMm = (rightEdge - leftEdge) * mmPerPxX;
      const rawHeightMm = (bottomEdge - topEdge) * mmPerPxY;
      const widthMm = applyProductionSizing(rawWidthMm, settings.widthReductionMm, settings.roundingMm);
      const heightMm = applyProductionSizing(rawHeightMm, settings.heightReductionMm, settings.roundingMm);

      const row = rowIdx + 1;
      const col = colIdx + 1;

      // Generate label based on panel type
      let panelLabel: string;
      if (panelType === "LOFT") {
        panelLabel = `${labelPrefix}${col}`;
      } else if (panelType === "KITCHEN_BASE" || panelType === "KITCHEN_WALL") {
        panelLabel = `${labelPrefix} ${col}`;
      } else {
        // SHUTTER - R{row}C{col} format
        panelLabel = rowCount > 1 ? `R${row}C${col}` : `C${col}`;
      }

      items.push({
        id: `${roomIndex}-${unitId}-${panelType.charAt(0)}-${row}-${col}`,
        roomIndex,
        roomName,
        unitIndex,
        unitId,
        unitType,
        unitLabel,
        panelType,
        panelLabel,
        row,
        col,
        widthMm,
        heightMm,
        laminateCode,
        grainDirection: true,
      });
    });
  });

  return items;
}

/**
 * Convert Design page cutlist panels to production panel items.
 * Used for library-loaded wardrobe_carcass models.
 */
function convertLibraryPanelsToProductionItems(
  panels: ModuleCutlistPanel[],
  context: {
    roomIndex: number;
    roomName: string;
    unitIndex: number;
    unitId: string;
    unitType: string;
    unitLabel: string;
    settings: ProductionSettings;
    laminateCode?: string;
  }
): ProductionPanelItem[] {
  const items: ProductionPanelItem[] = [];

  panels.forEach((panel, idx) => {
    // Apply production sizing (reductions and rounding)
    const widthMm = applyProductionSizing(panel.widthMm, context.settings.widthReductionMm, context.settings.roundingMm);
    const heightMm = applyProductionSizing(panel.heightMm, context.settings.heightReductionMm, context.settings.roundingMm);

    // Create production items for each panel (qty times)
    for (let q = 0; q < panel.qty; q++) {
      // Determine panel type for production
      let panelType: ProductionPanelType = "SHUTTER";
      if (panel.panelType === "loft_shutter") {
        panelType = "LOFT";
      }

      // Generate label with quantity suffix if needed
      const panelLabel = panel.qty > 1 ? `${panel.name} ${q + 1}` : panel.name;

      items.push({
        id: `${context.roomIndex}-${context.unitId}-${panel.panelType}-${idx}-${q}`,
        roomIndex: context.roomIndex,
        roomName: context.roomName,
        unitIndex: context.unitIndex,
        unitId: context.unitId,
        unitType: context.unitType,
        unitLabel: context.unitLabel,
        panelType,
        panelLabel,
        row: 1,
        col: q + 1,
        widthMm,
        heightMm,
        laminateCode: context.laminateCode,
        grainDirection: panel.grainDirection,
      });
    }
  });

  return items;
}

function buildRoomUnits(
  quotationRooms: QuotationRoom[],
  currentDrawnUnits: DrawnUnit[],
  activeRoomIndex: number
): { roomIndex: number; roomName: string; units: DrawnUnit[] }[] {
  if (!quotationRooms || quotationRooms.length === 0) {
    return [
      {
        roomIndex: 0,
        roomName: "Quotation",
        units: currentDrawnUnits,
      },
    ];
  }

  return quotationRooms.map((room, index) => ({
    roomIndex: index,
    roomName: room.name,
    units: index === activeRoomIndex ? currentDrawnUnits : room.drawnUnits,
  }));
}

export function buildCutlistItems(params: {
  quotationRooms: QuotationRoom[];
  currentDrawnUnits: DrawnUnit[];
  activeRoomIndex: number;
  settings: ProductionSettings;
  shutterLaminateCode?: string;
  loftLaminateCode?: string;
}): ProductionPanelItem[] {
  const {
    quotationRooms,
    currentDrawnUnits,
    activeRoomIndex,
    settings,
    shutterLaminateCode,
    loftLaminateCode,
  } = params;

  const rooms = buildRoomUnits(quotationRooms, currentDrawnUnits, activeRoomIndex);
  const items: ProductionPanelItem[] = [];

  rooms.forEach((room) => {
    room.units.forEach((unit, unitIndex) => {
      if (!unit.box) return;

      const isLoftOnly = unit.loftOnly || false;
      const unitLabel = `${UNIT_TYPE_LABELS[unit.unitType] || unit.unitType} ${unitIndex + 1}`;

      // Common context for all panel types
      const context = {
        roomIndex: room.roomIndex,
        roomName: room.roomName,
        unitIndex,
        unitId: unit.id,
        unitType: unit.unitType,
        unitLabel,
        settings,
      };

      // Kitchen units - special handling for base + wall cabinets
      if (unit.unitType === "kitchen") {
        if (unit.widthMm <= 0 || unit.heightMm <= 0) return;

        const KITCHEN_BASE_HEIGHT = 850;
        const KITCHEN_WALL_HEIGHT = 720;

        // Base cabinets (single row)
        items.push(...generatePanelGrid({
          ...context,
          box: { ...unit.box, height: unit.box.height * 0.5 }, // Use half height for base
          totalWidthMm: unit.widthMm,
          totalHeightMm: KITCHEN_BASE_HEIGHT,
          colCount: unit.shutterCount,
          rowCount: 1,
          colDividers: unit.shutterDividerXs,
          panelType: "KITCHEN_BASE",
          labelPrefix: "Base",
          laminateCode: shutterLaminateCode,
        }));

        // Wall cabinets (single row)
        items.push(...generatePanelGrid({
          ...context,
          box: { ...unit.box, height: unit.box.height * 0.5 },
          totalWidthMm: unit.widthMm,
          totalHeightMm: KITCHEN_WALL_HEIGHT,
          colCount: unit.shutterCount,
          rowCount: 1,
          colDividers: unit.shutterDividerXs,
          panelType: "KITCHEN_WALL",
          labelPrefix: "Wall",
          laminateCode: shutterLaminateCode,
        }));

        return;
      }

      // LIBRARY-LOADED WARDROBE_CARCASS - use Design page panel generation
      // This ensures library models render with their exact saved configuration
      if (unit.libraryConfig && unit.unitType === "wardrobe_carcass") {
        const libraryConfig = unit.libraryConfig as unknown as ModuleConfig;

        // Ensure dimensions are set (use unit dimensions if not in libraryConfig)
        const configWithDims: ModuleConfig = {
          ...libraryConfig,
          widthMm: libraryConfig.widthMm || unit.widthMm,
          heightMm: libraryConfig.heightMm || unit.heightMm,
          depthMm: libraryConfig.depthMm || unit.depthMm,
        };

        // Generate panels using Design page logic
        const libraryPanels = generateModuleCutlistPanels(configWithDims);

        // Convert to production items
        const libraryItems = convertLibraryPanelsToProductionItems(libraryPanels, {
          ...context,
          laminateCode: shutterLaminateCode,
        });

        items.push(...libraryItems);
        return;
      }

      // LOFT ONLY - treat main box as loft panels
      if (isLoftOnly) {
        if (unit.loftWidthMm <= 0 || unit.loftHeightMm <= 0) return;

        // For loft-only, main box IS the loft - use shutterDividerXs or loftDividerXs
        const dividers = unit.shutterDividerXs?.length > 0
          ? unit.shutterDividerXs
          : unit.loftDividerXs;

        items.push(...generatePanelGrid({
          ...context,
          box: unit.box,
          totalWidthMm: unit.loftWidthMm,
          totalHeightMm: unit.loftHeightMm,
          colCount: unit.loftShutterCount,
          rowCount: 1, // Loft is always 1 row
          colDividers: dividers,
          panelType: "LOFT",
          labelPrefix: "L",
          laminateCode: loftLaminateCode,
        }));

        return;
      }

      // SHUTTER (regular units) - grid of cols × rows
      if (unit.widthMm > 0 && unit.heightMm > 0) {
        items.push(...generatePanelGrid({
          ...context,
          box: unit.box,
          totalWidthMm: unit.widthMm,
          totalHeightMm: unit.heightMm,
          colCount: unit.shutterCount,
          rowCount: unit.sectionCount,
          colDividers: unit.shutterDividerXs,
          rowDividers: unit.horizontalDividerYs,
          panelType: "SHUTTER",
          labelPrefix: "", // Not used for SHUTTER
          laminateCode: shutterLaminateCode,
        }));
      }

      // LOFT (for regular units with loft enabled)
      if (settings.includeLoft && unit.loftEnabled && unit.loftBox) {
        const loftWidthMm = unit.loftWidthMm > 0 ? unit.loftWidthMm : unit.widthMm;
        const loftHeightMm = unit.loftHeightMm > 0
          ? unit.loftHeightMm
          : (unit.heightMm * (unit.loftBox.height / unit.box.height));

        if (loftWidthMm > 0 && loftHeightMm > 0) {
          items.push(...generatePanelGrid({
            ...context,
            box: unit.loftBox,
            totalWidthMm: loftWidthMm,
            totalHeightMm: loftHeightMm,
            colCount: unit.loftShutterCount,
            rowCount: 1, // Loft is always 1 row
            colDividers: unit.loftDividerXs,
            panelType: "LOFT",
            labelPrefix: "L",
            laminateCode: loftLaminateCode,
          }));
        }
      }
    });
  });

  return items;
}
