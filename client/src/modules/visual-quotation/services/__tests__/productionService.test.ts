
import { describe, it, expect } from 'vitest';
import {
    buildCadGroups,
    getRoomCode,
    getUnitCode,
    calculateProductionStats,
    getOverriddenDimensions,
    calculateGroupLayout,
    calculateGapAdjustedDimensions,
    calculateOverallDimensionChange,
    getFilteredProductionItems,
    DEFAULT_GAP_MM,
    GAP_OPTIONS,
    type CadGroup
} from '../productionService';
import type { ProductionPanelItem } from '../../engine/productionEngine';
import type { PanelOverrides } from '../storageService';

// Helper for type safety
const mkItem = (overrides: Partial<ProductionPanelItem> = {}): ProductionPanelItem => ({
    id: `p-${Math.random()}`,
    roomIndex: 0,
    roomName: 'Master Bedroom',
    unitId: 'u1',
    unitType: 'wardrobe',
    unitLabel: 'Wardrobe 1',
    unitIndex: 0,
    panelType: 'SHUTTER',
    panelLabel: 'R1C1',
    widthMm: 500,
    heightMm: 2000,
    row: 1,
    col: 1,
    grainDirection: true,
    ...overrides
});

describe('ProductionService', () => {

    // =========================================================================
    // Room & Unit Code Tests
    // =========================================================================

    describe('getRoomCode', () => {
        it('should return mapped code for known rooms', () => {
            expect(getRoomCode('Master Bedroom')).toBe('MB');
            expect(getRoomCode('Kitchen')).toBe('K');
            expect(getRoomCode('Living Room')).toBe('LR');
        });

        it('should handle case insensitive matching', () => {
            expect(getRoomCode('MASTER BEDROOM')).toBe('MB');
            expect(getRoomCode('kitchen')).toBe('K');
        });

        it('should match partial room names', () => {
            expect(getRoomCode('Master Bedroom 1')).toBe('MB');
            expect(getRoomCode('Kids Bedroom')).toBe('KB');
        });

        it('should generate code for unknown rooms', () => {
            expect(getRoomCode('Gym')).toBe('GY');
            expect(getRoomCode('Terrace')).toBe('TE');
        });

        it('should handle single character room names', () => {
            expect(getRoomCode('A')).toBe('A');
        });
    });

    describe('getUnitCode', () => {
        it('should return mapped code for known units', () => {
            expect(getUnitCode('wardrobe')).toBe('W');
            expect(getUnitCode('kitchen')).toBe('K');
            expect(getUnitCode('tv_unit')).toBe('TV');
            expect(getUnitCode('dresser')).toBe('D');
        });

        it('should return default code for unknown units', () => {
            expect(getUnitCode('unknown_type')).toBe('U');
            expect(getUnitCode('custom')).toBe('U');
        });
    });

    // =========================================================================
    // Production Stats Tests
    // =========================================================================

    describe('calculateProductionStats', () => {
        it('should count panels correctly', () => {
            const items = [
                mkItem({ panelType: 'SHUTTER' }),
                mkItem({ panelType: 'SHUTTER' }),
                mkItem({ panelType: 'LOFT' }),
            ];

            const stats = calculateProductionStats(items);
            expect(stats.totalPanels).toBe(3);
            expect(stats.shutterCount).toBe(2);
            expect(stats.loftCount).toBe(1);
        });

        it('should handle empty items', () => {
            const stats = calculateProductionStats([]);
            expect(stats.totalPanels).toBe(0);
            expect(stats.shutterCount).toBe(0);
            expect(stats.loftCount).toBe(0);
        });

        it('should handle shutter-only units', () => {
            const items = [
                mkItem({ panelType: 'SHUTTER' }),
                mkItem({ panelType: 'SHUTTER' }),
                mkItem({ panelType: 'SHUTTER' }),
            ];

            const stats = calculateProductionStats(items);
            expect(stats.shutterCount).toBe(3);
            expect(stats.loftCount).toBe(0);
        });

        it('should handle loft-only units', () => {
            const items = [
                mkItem({ panelType: 'LOFT' }),
                mkItem({ panelType: 'LOFT' }),
            ];

            const stats = calculateProductionStats(items);
            expect(stats.shutterCount).toBe(0);
            expect(stats.loftCount).toBe(2);
        });
    });

    // =========================================================================
    // CAD Group Building Tests
    // =========================================================================

    describe('buildCadGroups', () => {
        it('should group items by unit', () => {
            const items = [
                mkItem({ unitId: 'u1', col: 1 }),
                mkItem({ unitId: 'u1', col: 2 }),
                mkItem({ unitId: 'u2', unitLabel: 'Unit 2' }),
            ];

            const groups = buildCadGroups(items);
            expect(groups).toHaveLength(2);

            const g1 = groups.find(g => g.unitId === 'u1');
            expect(g1?.shutters).toHaveLength(2);
            expect(g1?.totalWidthMm).toBeGreaterThan(0);
        });

        it('should separate shutters and loft panels', () => {
            const items = [
                mkItem({ unitId: 'u1', panelType: 'SHUTTER' }),
                mkItem({ unitId: 'u1', panelType: 'LOFT' }),
            ];

            const groups = buildCadGroups(items);
            expect(groups[0].shutters).toHaveLength(1);
            expect(groups[0].loftPanels).toHaveLength(1);
        });

        it('should auto-number units correctly', () => {
            const items = [
                mkItem({ unitId: 'u1', roomIndex: 0 }),
                mkItem({ unitId: 'u2', roomIndex: 0 }),
                mkItem({ unitId: 'u3', roomIndex: 1, roomName: 'Kids' }),
            ];

            const groups = buildCadGroups(items);

            // Room 0 units
            const r0u1 = groups.find(g => g.unitId === 'u1');
            const r0u2 = groups.find(g => g.unitId === 'u2');
            expect(r0u1?.unitNumber).toBe(1);
            expect(r0u2?.unitNumber).toBe(2);

            // Room 1 units
            const r1u3 = groups.find(g => g.unitId === 'u3');
            expect(r1u3?.unitNumber).toBe(1); // Reset for new room
        });

        it('should handle multi-room scenarios', () => {
            const items = [
                mkItem({ unitId: 'u1', roomIndex: 0, roomName: 'Master' }),
                mkItem({ unitId: 'u2', roomIndex: 1, roomName: 'Kids' }),
                mkItem({ unitId: 'u3', roomIndex: 2, roomName: 'Guest' }),
            ];

            const groups = buildCadGroups(items);
            expect(groups).toHaveLength(3);
            expect(groups[0].roomCode).toBe('MB');
            expect(groups[1].roomCode).toBe('KB');
            expect(groups[2].roomCode).toBe('GB');
        });

        it('should calculate column widths correctly', () => {
            const items = [
                mkItem({ unitId: 'u1', col: 1, widthMm: 500 }),
                mkItem({ unitId: 'u1', col: 2, widthMm: 600 }),
                mkItem({ unitId: 'u1', col: 3, widthMm: 400 }),
            ];

            const groups = buildCadGroups(items);
            expect(groups[0].colWidthsMm).toEqual([500, 600, 400]);
            expect(groups[0].totalWidthMm).toBe(1500);
        });

        it('should calculate row heights correctly', () => {
            const items = [
                mkItem({ unitId: 'u1', row: 1, col: 1, heightMm: 2000 }),
                mkItem({ unitId: 'u1', row: 2, col: 1, heightMm: 500 }),
            ];

            const groups = buildCadGroups(items);
            expect(groups[0].rowHeightsMm).toEqual([2000, 500]);
            expect(groups[0].totalHeightMm).toBe(2500);
        });

        it('should handle loft-only units', () => {
            const items = [
                mkItem({ unitId: 'u1', panelType: 'LOFT', col: 1, widthMm: 1000, heightMm: 400 }),
                mkItem({ unitId: 'u1', panelType: 'LOFT', col: 2, widthMm: 1000, heightMm: 400 }),
            ];

            const groups = buildCadGroups(items);
            expect(groups[0].shutters).toHaveLength(0);
            expect(groups[0].loftPanels).toHaveLength(2);
            expect(groups[0].loftHeightMm).toBe(400);
            expect(groups[0].totalHeightMm).toBe(400);
        });

        it('should generate correct panel labels', () => {
            const items = [
                mkItem({ unitId: 'u1', roomIndex: 0, roomName: 'Master', panelType: 'SHUTTER' }),
                mkItem({ unitId: 'u1', roomIndex: 0, roomName: 'Master', panelType: 'SHUTTER' }),
                mkItem({ unitId: 'u1', roomIndex: 0, roomName: 'Master', panelType: 'LOFT' }),
            ];

            const groups = buildCadGroups(items);
            expect(groups[0].shutters[0].label).toBe('MB1-S1');
            expect(groups[0].shutters[1].label).toBe('MB1-S2');
            expect(groups[0].loftPanels[0].label).toBe('MB1-L1');
        });

        it('should handle complex grid layouts', () => {
            const items = [
                mkItem({ unitId: 'u1', row: 1, col: 1, widthMm: 500, heightMm: 1000 }),
                mkItem({ unitId: 'u1', row: 1, col: 2, widthMm: 600, heightMm: 1000 }),
                mkItem({ unitId: 'u1', row: 2, col: 1, widthMm: 500, heightMm: 1200 }),
                mkItem({ unitId: 'u1', row: 2, col: 2, widthMm: 600, heightMm: 1200 }),
            ];

            const groups = buildCadGroups(items);
            expect(groups[0].shutters).toHaveLength(4);
            expect(groups[0].colWidthsMm).toEqual([500, 600]);
            expect(groups[0].rowHeightsMm).toEqual([1000, 1200]);
            expect(groups[0].totalWidthMm).toBe(1100);
            expect(groups[0].totalHeightMm).toBe(2200);
        });
    });

    // =========================================================================
    // Override Dimensions Tests
    // =========================================================================

    describe('getOverriddenDimensions', () => {
        it('should return original dimensions when no override', () => {
            const result = getOverriddenDimensions('panel1', 500, 2000, {});
            expect(result).toEqual({ width: 500, height: 2000 });
        });

        it('should return overridden width', () => {
            const overrides: PanelOverrides = {
                'panel1': { width: 600 }
            };
            const result = getOverriddenDimensions('panel1', 500, 2000, overrides);
            expect(result).toEqual({ width: 600, height: 2000 });
        });

        it('should return overridden height', () => {
            const overrides: PanelOverrides = {
                'panel1': { height: 2100 }
            };
            const result = getOverriddenDimensions('panel1', 500, 2000, overrides);
            expect(result).toEqual({ width: 500, height: 2100 });
        });

        it('should return both overridden dimensions', () => {
            const overrides: PanelOverrides = {
                'panel1': { width: 600, height: 2100 }
            };
            const result = getOverriddenDimensions('panel1', 500, 2000, overrides);
            expect(result).toEqual({ width: 600, height: 2100 });
        });
    });

    // =========================================================================
    // Group Layout Calculation Tests
    // =========================================================================

    describe('calculateGroupLayout', () => {
        it('should calculate layout with no overrides', () => {
            const group: CadGroup = {
                key: 'test',
                roomIndex: 0,
                roomName: 'Master',
                roomCode: 'MB',
                unitLabel: 'W1',
                unitCode: 'W',
                unitNumber: 1,
                unitId: 'u1',
                unitIndex: 0,
                colWidthsMm: [500, 600],
                rowHeightsMm: [2000],
                totalWidthMm: 1100,
                totalHeightMm: 2000,
                shutters: [
                    { row: 1, col: 1, widthMm: 500, heightMm: 2000, label: 'MB1-S1', id: 's1' },
                    { row: 1, col: 2, widthMm: 600, heightMm: 2000, label: 'MB1-S2', id: 's2' },
                ],
                loftPanels: [],
                loftHeightMm: 0,
            };

            const layout = calculateGroupLayout(group, 2, {});
            expect(layout.colWidthsMm).toEqual([500, 600]);
            expect(layout.rowHeightsMm).toEqual([2000]);
            expect(layout.totalWidthMm).toBe(1100);
            expect(layout.totalHeightMm).toBe(2000);
            expect(layout.isLoftOnly).toBe(false);
        });

        it('should calculate layout with loft panels', () => {
            const group: CadGroup = {
                key: 'test',
                roomIndex: 0,
                roomName: 'Master',
                roomCode: 'MB',
                unitLabel: 'W1',
                unitCode: 'W',
                unitNumber: 1,
                unitId: 'u1',
                unitIndex: 0,
                colWidthsMm: [1000],
                rowHeightsMm: [2000],
                totalWidthMm: 1000,
                totalHeightMm: 2400,
                shutters: [
                    { row: 1, col: 1, widthMm: 1000, heightMm: 2000, label: 'MB1-S1', id: 's1' },
                ],
                loftPanels: [
                    { col: 1, widthMm: 1000, heightMm: 400, label: 'MB1-L1', id: 'l1' },
                ],
                loftHeightMm: 400,
            };

            const layout = calculateGroupLayout(group, 2, {});
            expect(layout.loftHeightMm).toBe(400);
            expect(layout.totalHeightMm).toBe(2400);
        });

        it('should handle loft-only units', () => {
            const group: CadGroup = {
                key: 'test',
                roomIndex: 0,
                roomName: 'Master',
                roomCode: 'MB',
                unitLabel: 'W1',
                unitCode: 'W',
                unitNumber: 1,
                unitId: 'u1',
                unitIndex: 0,
                colWidthsMm: [500, 500],
                rowHeightsMm: [],
                totalWidthMm: 1000,
                totalHeightMm: 400,
                shutters: [],
                loftPanels: [
                    { col: 1, widthMm: 500, heightMm: 400, label: 'MB1-L1', id: 'l1' },
                    { col: 2, widthMm: 500, heightMm: 400, label: 'MB1-L2', id: 'l2' },
                ],
                loftHeightMm: 400,
            };

            const layout = calculateGroupLayout(group, 2, {});
            expect(layout.isLoftOnly).toBe(true);
            expect(layout.rowHeightsMm).toEqual([]);
            expect(layout.totalHeightMm).toBe(400);
        });
    });

    // =========================================================================
    // Gap Adjustment Tests
    // =========================================================================

    describe('calculateGapAdjustedDimensions', () => {
        it('should adjust dimensions when gap increases', () => {
            const group: CadGroup = {
                key: 'test',
                roomIndex: 0,
                roomName: 'Master',
                roomCode: 'MB',
                unitLabel: 'W1',
                unitCode: 'W',
                unitNumber: 1,
                unitId: 'u1',
                unitIndex: 0,
                colWidthsMm: [500, 500],
                rowHeightsMm: [2000],
                totalWidthMm: 1000,
                totalHeightMm: 2000,
                shutters: [
                    { row: 1, col: 1, widthMm: 500, heightMm: 2000, label: 'MB1-S1', id: 's1' },
                    { row: 1, col: 2, widthMm: 500, heightMm: 2000, label: 'MB1-S2', id: 's2' },
                ],
                loftPanels: [],
                loftHeightMm: 0,
            };

            const newOverrides = calculateGapAdjustedDimensions(group, 2, 4, {});

            // With 2 columns, gap increase of 2mm means each shutter loses 1mm width
            expect(newOverrides['s1']).toBeDefined();
            expect(newOverrides['s2']).toBeDefined();
            expect(newOverrides['s1'].width).toBeLessThan(500);
        });

        it('should adjust dimensions when gap decreases', () => {
            const group: CadGroup = {
                key: 'test',
                roomIndex: 0,
                roomName: 'Master',
                roomCode: 'MB',
                unitLabel: 'W1',
                unitCode: 'W',
                unitNumber: 1,
                unitId: 'u1',
                unitIndex: 0,
                colWidthsMm: [500, 500],
                rowHeightsMm: [2000],
                totalWidthMm: 1000,
                totalHeightMm: 2000,
                shutters: [
                    { row: 1, col: 1, widthMm: 500, heightMm: 2000, label: 'MB1-S1', id: 's1' },
                    { row: 1, col: 2, widthMm: 500, heightMm: 2000, label: 'MB1-S2', id: 's2' },
                ],
                loftPanels: [],
                loftHeightMm: 0,
            };

            const newOverrides = calculateGapAdjustedDimensions(group, 4, 2, {});

            // Gap decrease means shutters gain width
            expect(newOverrides['s1'].width).toBeGreaterThan(500);
        });
    });

    // =========================================================================
    // Overall Dimension Change Tests
    // =========================================================================

    describe('calculateOverallDimensionChange', () => {
        it('should adjust width proportionally', () => {
            const group: CadGroup = {
                key: 'test',
                roomIndex: 0,
                roomName: 'Master',
                roomCode: 'MB',
                unitLabel: 'W1',
                unitCode: 'W',
                unitNumber: 1,
                unitId: 'u1',
                unitIndex: 0,
                colWidthsMm: [500, 500],
                rowHeightsMm: [2000],
                totalWidthMm: 1000,
                totalHeightMm: 2000,
                shutters: [
                    { row: 1, col: 1, widthMm: 500, heightMm: 2000, label: 'MB1-S1', id: 's1' },
                    { row: 1, col: 2, widthMm: 500, heightMm: 2000, label: 'MB1-S2', id: 's2' },
                ],
                loftPanels: [],
                loftHeightMm: 0,
            };

            const newOverrides = calculateOverallDimensionChange(group, 'width', 1200, 2, {});

            // New width 1200, gap 2, 2 columns: (1200 - 2) / 2 = 599mm per shutter
            expect(newOverrides['s1'].width).toBe(599);
            expect(newOverrides['s2'].width).toBe(599);
        });

        it('should adjust height proportionally', () => {
            const group: CadGroup = {
                key: 'test',
                roomIndex: 0,
                roomName: 'Master',
                roomCode: 'MB',
                unitLabel: 'W1',
                unitCode: 'W',
                unitNumber: 1,
                unitId: 'u1',
                unitIndex: 0,
                colWidthsMm: [1000],
                rowHeightsMm: [2000],
                totalWidthMm: 1000,
                totalHeightMm: 2000,
                shutters: [
                    { row: 1, col: 1, widthMm: 1000, heightMm: 2000, label: 'MB1-S1', id: 's1' },
                ],
                loftPanels: [],
                loftHeightMm: 0,
            };

            const newOverrides = calculateOverallDimensionChange(group, 'height', 2400, 2, {});

            expect(newOverrides['s1'].height).toBe(2400);
        });
    });

    // =========================================================================
    // Filtered Production Items Tests
    // =========================================================================

    describe('getFilteredProductionItems', () => {
        it('should filter out deleted panels', () => {
            const items = [
                mkItem({ id: 'p1' }),
                mkItem({ id: 'p2' }),
                mkItem({ id: 'p3' }),
            ];

            const deletedPanels = new Set(['p2']);
            const result = getFilteredProductionItems(items, deletedPanels, {});

            expect(result).toHaveLength(2);
            expect(result.find(i => i.id === 'p2')).toBeUndefined();
        });

        it('should apply dimension overrides', () => {
            const items = [
                mkItem({ id: 'p1', widthMm: 500, heightMm: 2000 }),
            ];

            const overrides: PanelOverrides = {
                'p1': { width: 600, height: 2100 }
            };

            const result = getFilteredProductionItems(items, new Set(), overrides);

            expect(result[0].widthMm).toBe(600);
            expect(result[0].heightMm).toBe(2100);
        });

        it('should handle partial overrides', () => {
            const items = [
                mkItem({ id: 'p1', widthMm: 500, heightMm: 2000 }),
            ];

            const overrides: PanelOverrides = {
                'p1': { width: 600 }
            };

            const result = getFilteredProductionItems(items, new Set(), overrides);

            expect(result[0].widthMm).toBe(600);
            expect(result[0].heightMm).toBe(2000); // Original height
        });

        it('should handle both filtering and overrides', () => {
            const items = [
                mkItem({ id: 'p1', widthMm: 500 }),
                mkItem({ id: 'p2', widthMm: 600 }),
                mkItem({ id: 'p3', widthMm: 700 }),
            ];

            const deletedPanels = new Set(['p2']);
            const overrides: PanelOverrides = {
                'p1': { width: 550 },
                'p3': { width: 750 }
            };

            const result = getFilteredProductionItems(items, deletedPanels, overrides);

            expect(result).toHaveLength(2);
            expect(result[0].widthMm).toBe(550);
            expect(result[1].widthMm).toBe(750);
        });
    });

    // =========================================================================
    // Constants Tests
    // =========================================================================

    describe('Constants', () => {
        it('should have correct default gap', () => {
            expect(DEFAULT_GAP_MM).toBe(2);
        });

        it('should have valid gap options', () => {
            expect(GAP_OPTIONS).toEqual([0, 1, 2, 3, 4, 5, 6, 8, 10]);
            expect(GAP_OPTIONS).toContain(DEFAULT_GAP_MM);
        });
    });
});
