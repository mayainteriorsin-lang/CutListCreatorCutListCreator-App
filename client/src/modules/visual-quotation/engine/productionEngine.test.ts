/**
 * Production Engine Unit Tests
 * Tests panel generation, dimension calculations, and edge building.
 */

import { describe, it, expect } from "vitest";
import {
  applyProductionSizing,
  formatMm,
  buildCutlistItems,
  type ProductionPanelItem,
} from "./productionEngine";
import type { DrawnUnit, ProductionSettings, QuotationRoom } from "../types";

const DEFAULT_SETTINGS: ProductionSettings = {
  widthReductionMm: 0,
  heightReductionMm: 0,
  roundingMm: 1,
  includeLoft: true,
};

function createMockUnit(overrides: Partial<DrawnUnit> = {}): DrawnUnit {
  return {
    id: "unit-1",
    unitType: "wardrobe",
    box: { x: 0, y: 0, width: 300, height: 400, rotation: 0 },
    shutterCount: 3,
    shutterDividerXs: [100, 200],
    loftEnabled: false,
    loftHeightRatio: 0.25,
    loftShutterCount: 3,
    loftDividerXs: [],
    widthMm: 1800,
    heightMm: 2400,
    depthMm: 600,
    loftWidthMm: 0,
    loftHeightMm: 0,
    sectionCount: 1,
    horizontalDividerYs: [],
    drawnAddOns: [],
    ...overrides,
  };
}

describe("productionEngine", () => {
  describe("applyProductionSizing", () => {
    it("should subtract reduction from value", () => {
      const result = applyProductionSizing(1000, 3, 1);
      expect(result).toBe(997);
    });

    it("should round to nearest step", () => {
      const result = applyProductionSizing(1005, 0, 10);
      expect(result).toBe(1010);
    });

    it("should apply both reduction and rounding", () => {
      const result = applyProductionSizing(1005, 3, 10);
      // 1005 - 3 = 1002, round to nearest 10 = 1000
      expect(result).toBe(1000);
    });

    it("should never return less than 1", () => {
      const result = applyProductionSizing(5, 10, 1);
      expect(result).toBeGreaterThanOrEqual(1);
    });

    it("should handle zero reduction", () => {
      const result = applyProductionSizing(500, 0, 1);
      expect(result).toBe(500);
    });

    it("should handle non-finite values gracefully", () => {
      const result = applyProductionSizing(NaN, 0, 1);
      expect(Number.isNaN(result) || result === 0).toBe(true);
    });
  });

  describe("formatMm", () => {
    it("should format whole numbers without decimals", () => {
      expect(formatMm(1000, 1)).toBe("1000");
    });

    it("should format with decimals when rounding step is fractional", () => {
      expect(formatMm(100.5, 0.5)).toBe("100.5");
    });

    it("should remove trailing zeros", () => {
      expect(formatMm(100.0, 1)).toBe("100");
    });

    it("should handle zero rounding step", () => {
      expect(formatMm(100, 0)).toBe("100");
    });
  });

  describe("buildCutlistItems", () => {
    it("should return empty array for empty units", () => {
      const result = buildCutlistItems({
        quotationRooms: [],
        currentDrawnUnits: [],
        activeRoomIndex: 0,
        settings: DEFAULT_SETTINGS,
      });

      expect(result).toEqual([]);
    });

    it("should generate correct number of panels for 3-door wardrobe", () => {
      const unit = createMockUnit({
        shutterCount: 3,
        sectionCount: 1,
        shutterDividerXs: [100, 200],
      });

      const result = buildCutlistItems({
        quotationRooms: [],
        currentDrawnUnits: [unit],
        activeRoomIndex: 0,
        settings: DEFAULT_SETTINGS,
      });

      // 3 columns x 1 row = 3 panels
      const shutterPanels = result.filter(p => p.panelType === "SHUTTER");
      expect(shutterPanels.length).toBe(3);
    });

    it("should generate grid panels for multi-section wardrobe", () => {
      const unit = createMockUnit({
        shutterCount: 2,
        sectionCount: 2,
        shutterDividerXs: [150],
        horizontalDividerYs: [200],
      });

      const result = buildCutlistItems({
        quotationRooms: [],
        currentDrawnUnits: [unit],
        activeRoomIndex: 0,
        settings: DEFAULT_SETTINGS,
      });

      // 2 columns x 2 rows = 4 panels
      const shutterPanels = result.filter(p => p.panelType === "SHUTTER");
      expect(shutterPanels.length).toBe(4);
    });

    it("should include loft panels when loftEnabled and includeLoft setting", () => {
      const unit = createMockUnit({
        loftEnabled: true,
        loftWidthMm: 1800,
        loftHeightMm: 450,
        loftShutterCount: 3,
        loftBox: { x: 0, y: -100, width: 300, height: 100, rotation: 0, dragEdge: null, isDragging: false, locked: false },
        loftDividerXs: [100, 200],
      });

      const result = buildCutlistItems({
        quotationRooms: [],
        currentDrawnUnits: [unit],
        activeRoomIndex: 0,
        settings: { ...DEFAULT_SETTINGS, includeLoft: true },
      });

      const loftPanels = result.filter(p => p.panelType === "LOFT");
      expect(loftPanels.length).toBe(3);
    });

    it("should exclude loft panels when includeLoft is false", () => {
      const unit = createMockUnit({
        loftEnabled: true,
        loftWidthMm: 1800,
        loftHeightMm: 450,
        loftShutterCount: 3,
        loftBox: { x: 0, y: -100, width: 300, height: 100, rotation: 0, dragEdge: null, isDragging: false, locked: false },
        loftDividerXs: [100, 200],
      });

      const result = buildCutlistItems({
        quotationRooms: [],
        currentDrawnUnits: [unit],
        activeRoomIndex: 0,
        settings: { ...DEFAULT_SETTINGS, includeLoft: false },
      });

      const loftPanels = result.filter(p => p.panelType === "LOFT");
      expect(loftPanels.length).toBe(0);
    });

    it("should handle loft-only units correctly", () => {
      const unit = createMockUnit({
        loftOnly: true,
        loftEnabled: true,
        loftWidthMm: 2000,
        loftHeightMm: 400,
        loftShutterCount: 4,
        shutterDividerXs: [75, 150, 225],
        widthMm: 0,
        heightMm: 0,
      });

      const result = buildCutlistItems({
        quotationRooms: [],
        currentDrawnUnits: [unit],
        activeRoomIndex: 0,
        settings: DEFAULT_SETTINGS,
      });

      // Loft-only should only produce LOFT panels
      const shutterPanels = result.filter(p => p.panelType === "SHUTTER");
      const loftPanels = result.filter(p => p.panelType === "LOFT");

      expect(shutterPanels.length).toBe(0);
      expect(loftPanels.length).toBe(4);
    });

    it("should generate kitchen base and wall panels", () => {
      const unit = createMockUnit({
        unitType: "kitchen",
        shutterCount: 3,
        shutterDividerXs: [100, 200],
      });

      const result = buildCutlistItems({
        quotationRooms: [],
        currentDrawnUnits: [unit],
        activeRoomIndex: 0,
        settings: DEFAULT_SETTINGS,
      });

      const basePanels = result.filter(p => p.panelType === "KITCHEN_BASE");
      const wallPanels = result.filter(p => p.panelType === "KITCHEN_WALL");

      expect(basePanels.length).toBe(3);
      expect(wallPanels.length).toBe(3);
    });

    it("should apply width/height reduction to panel dimensions", () => {
      const unit = createMockUnit({
        shutterCount: 1,
        sectionCount: 1,
        shutterDividerXs: [],
      });

      const result = buildCutlistItems({
        quotationRooms: [],
        currentDrawnUnits: [unit],
        activeRoomIndex: 0,
        settings: {
          widthReductionMm: 3,
          heightReductionMm: 3,
          roundingMm: 1,
          includeLoft: true,
        },
      });

      const panel = result[0]!;
      // Width: 1800 - 3 = 1797
      // Height: 2400 - 3 = 2397
      expect(panel.widthMm).toBe(1797);
      expect(panel.heightMm).toBe(2397);
    });

    it("should use current drawn units for active room", () => {
      const savedUnit = createMockUnit({ id: "saved-unit" });
      const currentUnit = createMockUnit({ id: "current-unit" });

      const room: QuotationRoom = {
        id: "room-1",
        name: "Master Bedroom",
        unitType: "wardrobe",
        drawnUnits: [savedUnit],
        activeUnitIndex: 0,
        shutterCount: 3,
        shutterDividerXs: [],
        loftEnabled: false,
        loftHeightRatio: 0.25,
        loftShutterCount: 3,
        loftDividerXs: [],
      };

      const result = buildCutlistItems({
        quotationRooms: [room],
        currentDrawnUnits: [currentUnit],
        activeRoomIndex: 0,
        settings: DEFAULT_SETTINGS,
      });

      // Should use currentDrawnUnits, not saved room units
      expect(result.every(p => p.unitId === "current-unit")).toBe(true);
    });

    it("should use saved units for non-active rooms", () => {
      const savedUnit = createMockUnit({ id: "saved-unit" });
      const currentUnit = createMockUnit({ id: "current-unit" });

      const rooms: QuotationRoom[] = [
        {
          id: "room-1",
          name: "Master Bedroom",
          unitType: "wardrobe",
          drawnUnits: [savedUnit],
          activeUnitIndex: 0,
          shutterCount: 3,
          shutterDividerXs: [],
          loftEnabled: false,
          loftHeightRatio: 0.25,
          loftShutterCount: 3,
          loftDividerXs: [],
        },
        {
          id: "room-2",
          name: "Kids Room",
          unitType: "wardrobe",
          drawnUnits: [],
          activeUnitIndex: -1,
          shutterCount: 3,
          shutterDividerXs: [],
          loftEnabled: false,
          loftHeightRatio: 0.25,
          loftShutterCount: 3,
          loftDividerXs: [],
        },
      ];

      const result = buildCutlistItems({
        quotationRooms: rooms,
        currentDrawnUnits: [currentUnit],
        activeRoomIndex: 1, // Active room is room 2
        settings: DEFAULT_SETTINGS,
      });

      // Room 1 should use saved-unit
      const room1Panels = result.filter(p => p.roomIndex === 0);
      expect(room1Panels.every(p => p.unitId === "saved-unit")).toBe(true);

      // Room 2 should use current-unit
      const room2Panels = result.filter(p => p.roomIndex === 1);
      expect(room2Panels.every(p => p.unitId === "current-unit")).toBe(true);
    });

    it("should set correct panel labels", () => {
      const unit = createMockUnit({
        shutterCount: 3,
        sectionCount: 2,
        shutterDividerXs: [100, 200],
        horizontalDividerYs: [200],
      });

      const result = buildCutlistItems({
        quotationRooms: [],
        currentDrawnUnits: [unit],
        activeRoomIndex: 0,
        settings: DEFAULT_SETTINGS,
      });

      const labels = result.map(p => p.panelLabel);
      // With 2 rows, should have R{row}C{col} format
      expect(labels).toContain("R1C1");
      expect(labels).toContain("R1C2");
      expect(labels).toContain("R1C3");
      expect(labels).toContain("R2C1");
      expect(labels).toContain("R2C2");
      expect(labels).toContain("R2C3");
    });

    it("should skip units with zero dimensions", () => {
      const unit = createMockUnit({
        widthMm: 0,
        heightMm: 0,
      });

      const result = buildCutlistItems({
        quotationRooms: [],
        currentDrawnUnits: [unit],
        activeRoomIndex: 0,
        settings: DEFAULT_SETTINGS,
      });

      expect(result.length).toBe(0);
    });

    it("should assign laminate codes to panels", () => {
      const unit = createMockUnit({
        loftEnabled: true,
        loftWidthMm: 1800,
        loftHeightMm: 450,
        loftShutterCount: 3,
        loftBox: { x: 0, y: -100, width: 300, height: 100, rotation: 0, dragEdge: null, isDragging: false, locked: false },
        loftDividerXs: [100, 200],
      });

      const result = buildCutlistItems({
        quotationRooms: [],
        currentDrawnUnits: [unit],
        activeRoomIndex: 0,
        settings: DEFAULT_SETTINGS,
        shutterLaminateCode: "SHUTTER-LAM",
        loftLaminateCode: "LOFT-LAM",
      });

      const shutterPanels = result.filter(p => p.panelType === "SHUTTER");
      const loftPanels = result.filter(p => p.panelType === "LOFT");

      expect(shutterPanels.every(p => p.laminateCode === "SHUTTER-LAM")).toBe(true);
      expect(loftPanels.every(p => p.laminateCode === "LOFT-LAM")).toBe(true);
    });
  });
});
