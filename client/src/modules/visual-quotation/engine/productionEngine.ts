import type { DrawnUnit, ProductionSettings, QuotationRoom } from "../store/visualQuotationStore";

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

const UNIT_TYPE_LABELS: Record<string, string> = {
  wardrobe: "Wardrobe",
  kitchen: "Kitchen",
  tv_unit: "TV Unit",
  dresser: "Dresser",
  study_table: "Study Table",
  shoe_rack: "Shoe Rack",
  book_shelf: "Book Shelf",
  crockery_unit: "Crockery Unit",
  pooja_unit: "Pooja Unit",
  vanity: "Vanity",
  bar_unit: "Bar Unit",
  display_unit: "Display Unit",
  other: "Other",
};

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

function buildEdges(
  start: number,
  size: number,
  dividers: number[] | undefined,
  count: number
): number[] {
  const edges: number[] = [start];
  const safeCount = Math.max(1, count || 1);
  const sortedDividers = (dividers || []).slice().sort((a, b) => a - b);
  if (sortedDividers.length > 0) {
    edges.push(...sortedDividers);
  } else if (safeCount > 1) {
    for (let i = 1; i < safeCount; i += 1) {
      edges.push(start + (size / safeCount) * i);
    }
  }
  edges.push(start + size);
  return edges;
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
      if (!unit.box || unit.widthMm <= 0 || unit.heightMm <= 0) {
        return;
      }

      const mmPerPxX = unit.widthMm / unit.box.width;
      const mmPerPxY = unit.heightMm / unit.box.height;

      if (!Number.isFinite(mmPerPxX) || !Number.isFinite(mmPerPxY)) {
        return;
      }

      const unitLabel = `${UNIT_TYPE_LABELS[unit.unitType] || unit.unitType} ${unitIndex + 1}`;

      // Handle kitchen units differently - generate base and wall cabinet panels
      if (unit.unitType === "kitchen") {
        // Kitchen standard dimensions
        const KITCHEN_BASE_HEIGHT = 850; // mm
        const KITCHEN_WALL_HEIGHT = 720; // mm
        const KITCHEN_DEPTH = 600; // mm
        const WALL_DEPTH = 350; // mm

        // Calculate cabinet widths from dividers
        const columnEdges = buildEdges(
          unit.box.x,
          unit.box.width,
          unit.shutterDividerXs,
          unit.shutterCount
        );

        // Generate base cabinet shutters
        columnEdges.slice(0, -1).forEach((leftEdge, colIdx) => {
          const rightEdge = columnEdges[colIdx + 1]!;
          const rawWidthMm = (rightEdge - leftEdge) * mmPerPxX;
          const widthMm = applyProductionSizing(rawWidthMm, settings.widthReductionMm, settings.roundingMm);
          const heightMm = applyProductionSizing(KITCHEN_BASE_HEIGHT, settings.heightReductionMm, settings.roundingMm);

          items.push({
            id: `${room.roomIndex}-${unit.id}-KB-${colIdx + 1}`,
            roomIndex: room.roomIndex,
            roomName: room.roomName,
            unitIndex,
            unitId: unit.id,
            unitType: unit.unitType,
            unitLabel,
            panelType: "KITCHEN_BASE",
            panelLabel: `Base ${colIdx + 1}`,
            row: 1,
            col: colIdx + 1,
            widthMm,
            heightMm,
            laminateCode: shutterLaminateCode,
            grainDirection: true,
          });
        });

        // Generate wall cabinet shutters
        columnEdges.slice(0, -1).forEach((leftEdge, colIdx) => {
          const rightEdge = columnEdges[colIdx + 1]!;
          const rawWidthMm = (rightEdge - leftEdge) * mmPerPxX;
          const widthMm = applyProductionSizing(rawWidthMm, settings.widthReductionMm, settings.roundingMm);
          const heightMm = applyProductionSizing(KITCHEN_WALL_HEIGHT, settings.heightReductionMm, settings.roundingMm);

          items.push({
            id: `${room.roomIndex}-${unit.id}-KW-${colIdx + 1}`,
            roomIndex: room.roomIndex,
            roomName: room.roomName,
            unitIndex,
            unitId: unit.id,
            unitType: unit.unitType,
            unitLabel,
            panelType: "KITCHEN_WALL",
            panelLabel: `Wall ${colIdx + 1}`,
            row: 1,
            col: colIdx + 1,
            widthMm,
            heightMm,
            laminateCode: shutterLaminateCode,
            grainDirection: true,
          });
        });

        return; // Skip the regular shutter processing for kitchen units
      }

      // Regular wardrobe/other unit processing
      const columnEdges = buildEdges(
        unit.box.x,
        unit.box.width,
        unit.shutterDividerXs,
        unit.shutterCount
      );
      const rowEdges = buildEdges(
        unit.box.y,
        unit.box.height,
        unit.horizontalDividerYs,
        unit.sectionCount
      );

      rowEdges.slice(0, -1).forEach((topEdge, rowIdx) => {
        const bottomEdge = rowEdges[rowIdx + 1]!;
        columnEdges.slice(0, -1).forEach((leftEdge, colIdx) => {
          const rightEdge = columnEdges[colIdx + 1]!;
          const rawWidthMm = (rightEdge - leftEdge) * mmPerPxX;
          const rawHeightMm = (bottomEdge - topEdge) * mmPerPxY;
          const widthMm = applyProductionSizing(rawWidthMm, settings.widthReductionMm, settings.roundingMm);
          const heightMm = applyProductionSizing(rawHeightMm, settings.heightReductionMm, settings.roundingMm);

          items.push({
            id: `${room.roomIndex}-${unit.id}-S-${rowIdx + 1}-${colIdx + 1}`,
            roomIndex: room.roomIndex,
            roomName: room.roomName,
            unitIndex,
            unitId: unit.id,
            unitType: unit.unitType,
            unitLabel,
            panelType: "SHUTTER",
            panelLabel: `R${rowIdx + 1}C${colIdx + 1}`,
            row: rowIdx + 1,
            col: colIdx + 1,
            widthMm,
            heightMm,
            laminateCode: shutterLaminateCode,
            grainDirection: true,
          });
        });
      });

      if (settings.includeLoft && unit.loftEnabled && unit.loftBox) {
        const loftWidthMm = unit.loftWidthMm > 0 ? unit.loftWidthMm : unit.widthMm;
        const loftHeightMm = unit.loftHeightMm > 0
          ? unit.loftHeightMm
          : unit.loftBox.height * mmPerPxY;

        if (loftWidthMm > 0 && loftHeightMm > 0) {
          const loftEdges = buildEdges(
            unit.loftBox.x,
            unit.loftBox.width,
            unit.loftDividerXs,
            unit.loftShutterCount
          );
          const loftMmPerPxX = loftWidthMm / unit.loftBox.width;
          loftEdges.slice(0, -1).forEach((leftEdge, colIdx) => {
            const rightEdge = loftEdges[colIdx + 1]!;
            const rawWidthMm = (rightEdge - leftEdge) * loftMmPerPxX;
            const widthMm = applyProductionSizing(rawWidthMm, settings.widthReductionMm, settings.roundingMm);
            const heightMm = applyProductionSizing(loftHeightMm, settings.heightReductionMm, settings.roundingMm);

            items.push({
              id: `${room.roomIndex}-${unit.id}-L-${colIdx + 1}`,
              roomIndex: room.roomIndex,
              roomName: room.roomName,
              unitIndex,
              unitId: unit.id,
              unitType: unit.unitType,
              unitLabel,
              panelType: "LOFT",
              panelLabel: `L${colIdx + 1}`,
              row: 1,
              col: colIdx + 1,
              widthMm,
              heightMm,
              laminateCode: loftLaminateCode,
              grainDirection: true,
            });
          });
        }
      }
    });
  });

  return items;
}
