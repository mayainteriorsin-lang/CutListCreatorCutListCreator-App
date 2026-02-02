/**
 * RateLineService Tests
 *
 * Tests the rate line service layer which handles:
 * - Config to lines transformation
 * - Lines to config transformation
 * - Line updates and recalculations
 * - Totals calculation
 * - Validation
 *
 * CRITICAL: Tests the loft rate auto-calculation (shutter + carcass).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    configToLines,
    linesToConfig,
    updateLine,
    calculateLineTotals,
    validateLines,
    rateLineService,
} from '../rateLineService';
import type { WardrobeConfig } from '../../types/pricing';
import type { RateLine, RateLineType } from '../../types/rateLine';

// Helper to create mock WardrobeConfig
function createMockConfig(overrides: Partial<WardrobeConfig> = {}): WardrobeConfig {
    return {
        carcass: {
            material: 'plywood',
            thickness: '18mm',
            edgeBand: 'pvc_2mm',
            materialPrice: 100,
            thicknessPrice: 50,
            edgeBandPrice: 30,
        },
        shutter: {
            material: 'plywood',
            finish: 'laminate',
            handleType: 'profile',
            materialPrice: 200,
            finishPrice: 150,
            handlePrice: 50,
        },
        addOnPricing: [],
        ...overrides,
    } as WardrobeConfig;
}

describe('RateLineService', () => {
    // =========================================================================
    // configToLines Tests
    // =========================================================================

    describe('configToLines', () => {
        it('should convert config to rate lines', () => {
            const config = createMockConfig();

            const lines = configToLines(config);

            expect(lines).toHaveLength(4);
            expect(lines.map(l => l.type)).toEqual(['shutter', 'carcass', 'loft', 'inner_laminate']);
        });

        it('should calculate shutter rate correctly', () => {
            const config = createMockConfig({
                shutter: {
                    material: 'plywood',
                    finish: 'laminate',
                    handleType: 'profile',
                    materialPrice: 200,
                    finishPrice: 150,
                    handlePrice: 50,
                },
            });

            const lines = configToLines(config);
            const shutterLine = lines.find(l => l.type === 'shutter');

            expect(shutterLine?.rate).toBe(400); // 200 + 150 + 50
        });

        it('should calculate carcass rate correctly', () => {
            const config = createMockConfig({
                carcass: {
                    material: 'plywood',
                    thickness: '18mm',
                    edgeBand: 'pvc_2mm',
                    materialPrice: 100,
                    thicknessPrice: 50,
                    edgeBandPrice: 30,
                },
            });

            const lines = configToLines(config);
            const carcassLine = lines.find(l => l.type === 'carcass');

            expect(carcassLine?.rate).toBe(180); // 100 + 50 + 30
        });

        it('should calculate loft rate as shutter + carcass', () => {
            const config = createMockConfig({
                shutter: {
                    materialPrice: 200,
                    finishPrice: 150,
                    handlePrice: 50,
                },
                carcass: {
                    materialPrice: 100,
                    thicknessPrice: 50,
                    edgeBandPrice: 30,
                },
            });

            const lines = configToLines(config);
            const loftLine = lines.find(l => l.type === 'loft');

            expect(loftLine?.rate).toBe(580); // (200+150+50) + (100+50+30)
            expect(loftLine?.isCalculated).toBe(true);
        });

        it('should set correct material values', () => {
            const config = createMockConfig({
                shutter: {
                    material: 'hdhmr',
                    finish: 'veneer',
                    handleType: 'handle',
                },
                carcass: {
                    material: 'mdf',
                    thickness: '12mm',
                    edgeBand: 'pvc_1mm',
                },
            });

            const lines = configToLines(config);
            const shutterLine = lines.find(l => l.type === 'shutter');
            const carcassLine = lines.find(l => l.type === 'carcass');

            expect(shutterLine?.material).toBe('hdhmr');
            expect(shutterLine?.finish).toBe('veneer');
            expect(shutterLine?.edge).toBe('handle');
            expect(carcassLine?.material).toBe('mdf');
            expect(carcassLine?.thickness).toBe('12mm');
            expect(carcassLine?.edge).toBe('pvc_1mm');
        });

        it('should mark inner laminate as disabled by default', () => {
            const config = createMockConfig();

            const lines = configToLines(config);
            const innerLaminateLine = lines.find(l => l.type === 'inner_laminate');

            expect(innerLaminateLine?.isEnabled).toBe(false);
            expect(innerLaminateLine?.isCalculated).toBe(false);
        });
    });

    // =========================================================================
    // linesToConfig Tests
    // =========================================================================

    describe('linesToConfig', () => {
        it('should convert lines back to config', () => {
            const baseConfig = createMockConfig();
            const lines: RateLine[] = [
                {
                    type: 'shutter',
                    label: 'Shutter',
                    material: 'hdhmr',
                    thickness: '-',
                    finish: 'veneer',
                    edge: 'handle',
                    rate: 500,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'carcass',
                    label: 'Carcass',
                    material: 'mdf',
                    thickness: '12mm',
                    finish: '-',
                    edge: 'pvc_1mm',
                    rate: 200,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'loft',
                    label: 'Loft',
                    material: '(Combined)',
                    thickness: '-',
                    finish: '-',
                    edge: '-',
                    rate: 700,
                    isCalculated: true,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'inner_laminate',
                    label: 'Inner Laminate',
                    material: 'laminate',
                    thickness: '-',
                    finish: 'matte',
                    edge: '-',
                    rate: 150,
                    isCalculated: false,
                    isEnabled: false,
                    photoUrl: null,
                },
            ];

            const config = linesToConfig(lines, baseConfig);

            expect(config.shutter.material).toBe('hdhmr');
            expect(config.shutter.finish).toBe('veneer');
            expect(config.shutter.handleType).toBe('handle');
            expect(config.carcass.material).toBe('mdf');
            expect(config.carcass.thickness).toBe('12mm');
            expect(config.carcass.edgeBand).toBe('pvc_1mm');
        });

        it('should return base config when shutter line is missing', () => {
            const baseConfig = createMockConfig();
            const lines: RateLine[] = [
                {
                    type: 'carcass',
                    label: 'Carcass',
                    material: 'mdf',
                    thickness: '12mm',
                    finish: '-',
                    edge: 'pvc_1mm',
                    rate: 200,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
            ];

            const config = linesToConfig(lines, baseConfig);

            expect(config).toEqual(baseConfig);
        });

        it('should return base config when carcass line is missing', () => {
            const baseConfig = createMockConfig();
            const lines: RateLine[] = [
                {
                    type: 'shutter',
                    label: 'Shutter',
                    material: 'plywood',
                    thickness: '-',
                    finish: 'laminate',
                    edge: 'profile',
                    rate: 400,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
            ];

            const config = linesToConfig(lines, baseConfig);

            expect(config).toEqual(baseConfig);
        });

        it('should update material prices from constants', () => {
            const baseConfig = createMockConfig();
            const lines: RateLine[] = [
                {
                    type: 'shutter',
                    label: 'Shutter',
                    material: 'plywood',
                    thickness: '-',
                    finish: 'laminate',
                    edge: 'profile',
                    rate: 400,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'carcass',
                    label: 'Carcass',
                    material: 'plywood',
                    thickness: '18mm',
                    finish: '-',
                    edge: 'pvc_2mm',
                    rate: 180,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
            ];

            const config = linesToConfig(lines, baseConfig);

            // Should have updated prices from constants
            expect(config.shutter.materialPrice).toBeDefined();
            expect(config.carcass.materialPrice).toBeDefined();
        });
    });

    // =========================================================================
    // updateLine Tests
    // =========================================================================

    describe('updateLine', () => {
        let baseLines: RateLine[];

        beforeEach(() => {
            baseLines = [
                {
                    type: 'shutter',
                    label: 'Shutter',
                    material: 'plywood',
                    thickness: '-',
                    finish: 'laminate',
                    edge: 'profile',
                    rate: 400,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'carcass',
                    label: 'Carcass',
                    material: 'plywood',
                    thickness: '18mm',
                    finish: '-',
                    edge: 'pvc_2mm',
                    rate: 180,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'loft',
                    label: 'Loft',
                    material: '(Combined)',
                    thickness: '-',
                    finish: '-',
                    edge: '-',
                    rate: 580,
                    isCalculated: true,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'inner_laminate',
                    label: 'Inner Laminate',
                    material: 'laminate',
                    thickness: '-',
                    finish: 'matte',
                    edge: '-',
                    rate: 150,
                    isCalculated: false,
                    isEnabled: false,
                    photoUrl: null,
                },
            ];
        });

        it('should update material', () => {
            const updated = updateLine(baseLines, 'shutter', { material: 'hdhmr' });
            const shutterLine = updated.find(l => l.type === 'shutter');

            expect(shutterLine?.material).toBe('hdhmr');
        });

        it('should update thickness', () => {
            const updated = updateLine(baseLines, 'carcass', { thickness: '12mm' });
            const carcassLine = updated.find(l => l.type === 'carcass');

            expect(carcassLine?.thickness).toBe('12mm');
        });

        it('should update finish', () => {
            const updated = updateLine(baseLines, 'shutter', { finish: 'veneer' });
            const shutterLine = updated.find(l => l.type === 'shutter');

            expect(shutterLine?.finish).toBe('veneer');
        });

        it('should update edge', () => {
            const updated = updateLine(baseLines, 'carcass', { edge: 'pvc_1mm' });
            const carcassLine = updated.find(l => l.type === 'carcass');

            expect(carcassLine?.edge).toBe('pvc_1mm');
        });

        it('should update isEnabled', () => {
            const updated = updateLine(baseLines, 'inner_laminate', { isEnabled: true });
            const innerLine = updated.find(l => l.type === 'inner_laminate');

            expect(innerLine?.isEnabled).toBe(true);
        });

        it('should recalculate loft rate when shutter changes', () => {
            const updated = updateLine(baseLines, 'shutter', { material: 'hdhmr' });
            const loftLine = updated.find(l => l.type === 'loft');
            const shutterLine = updated.find(l => l.type === 'shutter');
            const carcassLine = updated.find(l => l.type === 'carcass');

            expect(loftLine?.rate).toBe(shutterLine!.rate + carcassLine!.rate);
        });

        it('should recalculate loft rate when carcass changes', () => {
            const updated = updateLine(baseLines, 'carcass', { thickness: '12mm' });
            const loftLine = updated.find(l => l.type === 'loft');
            const shutterLine = updated.find(l => l.type === 'shutter');
            const carcassLine = updated.find(l => l.type === 'carcass');

            expect(loftLine?.rate).toBe(shutterLine!.rate + carcassLine!.rate);
        });

        it('should not update rate for calculated lines', () => {
            const updated = updateLine(baseLines, 'loft', { rate: 999 });
            const loftLine = updated.find(l => l.type === 'loft');

            // Should remain calculated (shutter + carcass)
            expect(loftLine?.rate).toBe(580);
        });

        it('should return original lines for invalid line type', () => {
            const updated = updateLine(baseLines, 'invalid_type' as RateLineType, { material: 'test' });

            expect(updated).toEqual(baseLines);
        });

        it('should not mutate original lines', () => {
            const originalShutterMaterial = baseLines[0].material;

            updateLine(baseLines, 'shutter', { material: 'hdhmr' });

            expect(baseLines[0].material).toBe(originalShutterMaterial);
        });
    });

    // =========================================================================
    // calculateLineTotals Tests
    // =========================================================================

    describe('calculateLineTotals', () => {
        it('should calculate totals correctly', () => {
            const lines: RateLine[] = [
                {
                    type: 'shutter',
                    label: 'Shutter',
                    material: 'plywood',
                    thickness: '-',
                    finish: 'laminate',
                    edge: 'profile',
                    rate: 400,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'carcass',
                    label: 'Carcass',
                    material: 'plywood',
                    thickness: '18mm',
                    finish: '-',
                    edge: 'pvc_2mm',
                    rate: 180,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'loft',
                    label: 'Loft',
                    material: '(Combined)',
                    thickness: '-',
                    finish: '-',
                    edge: '-',
                    rate: 580,
                    isCalculated: true,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'inner_laminate',
                    label: 'Inner Laminate',
                    material: 'laminate',
                    thickness: '-',
                    finish: 'matte',
                    edge: '-',
                    rate: 150,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
            ];

            const totals = calculateLineTotals(lines);

            expect(totals.shutterRate).toBe(400);
            expect(totals.carcassRate).toBe(180);
            expect(totals.loftRate).toBe(580);
            expect(totals.innerLaminateRate).toBe(150);
            expect(totals.combinedRate).toBe(730); // 580 + 150
        });

        it('should exclude disabled inner laminate from totals', () => {
            const lines: RateLine[] = [
                {
                    type: 'shutter',
                    label: 'Shutter',
                    material: 'plywood',
                    thickness: '-',
                    finish: 'laminate',
                    edge: 'profile',
                    rate: 400,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'carcass',
                    label: 'Carcass',
                    material: 'plywood',
                    thickness: '18mm',
                    finish: '-',
                    edge: 'pvc_2mm',
                    rate: 180,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'loft',
                    label: 'Loft',
                    material: '(Combined)',
                    thickness: '-',
                    finish: '-',
                    edge: '-',
                    rate: 580,
                    isCalculated: true,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'inner_laminate',
                    label: 'Inner Laminate',
                    material: 'laminate',
                    thickness: '-',
                    finish: 'matte',
                    edge: '-',
                    rate: 150,
                    isCalculated: false,
                    isEnabled: false, // Disabled
                    photoUrl: null,
                },
            ];

            const totals = calculateLineTotals(lines);

            expect(totals.innerLaminateRate).toBe(0);
            expect(totals.combinedRate).toBe(580); // Only loft
        });

        it('should handle missing lines gracefully', () => {
            const lines: RateLine[] = [
                {
                    type: 'shutter',
                    label: 'Shutter',
                    material: 'plywood',
                    thickness: '-',
                    finish: 'laminate',
                    edge: 'profile',
                    rate: 400,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
            ];

            const totals = calculateLineTotals(lines);

            expect(totals.shutterRate).toBe(400);
            expect(totals.carcassRate).toBe(0);
            expect(totals.loftRate).toBe(400); // Fallback to shutter + carcass
        });

        it('should calculate loft rate from shutter + carcass if loft line missing', () => {
            const lines: RateLine[] = [
                {
                    type: 'shutter',
                    label: 'Shutter',
                    material: 'plywood',
                    thickness: '-',
                    finish: 'laminate',
                    edge: 'profile',
                    rate: 400,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'carcass',
                    label: 'Carcass',
                    material: 'plywood',
                    thickness: '18mm',
                    finish: '-',
                    edge: 'pvc_2mm',
                    rate: 180,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
            ];

            const totals = calculateLineTotals(lines);

            expect(totals.loftRate).toBe(580); // 400 + 180
        });
    });

    // =========================================================================
    // validateLines Tests
    // =========================================================================

    describe('validateLines', () => {
        it('should pass validation for complete lines', () => {
            const lines: RateLine[] = [
                {
                    type: 'shutter',
                    label: 'Shutter',
                    material: 'plywood',
                    thickness: '-',
                    finish: 'laminate',
                    edge: 'profile',
                    rate: 400,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'carcass',
                    label: 'Carcass',
                    material: 'plywood',
                    thickness: '18mm',
                    finish: '-',
                    edge: 'pvc_2mm',
                    rate: 180,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'loft',
                    label: 'Loft',
                    material: '(Combined)',
                    thickness: '-',
                    finish: '-',
                    edge: '-',
                    rate: 580,
                    isCalculated: true,
                    isEnabled: true,
                    photoUrl: null,
                },
            ];

            const result = validateLines(lines);

            expect(result.success).toBe(true);
        });

        it('should fail when shutter line is missing', () => {
            const lines: RateLine[] = [
                {
                    type: 'carcass',
                    label: 'Carcass',
                    material: 'plywood',
                    thickness: '18mm',
                    finish: '-',
                    edge: 'pvc_2mm',
                    rate: 180,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'loft',
                    label: 'Loft',
                    material: '(Combined)',
                    thickness: '-',
                    finish: '-',
                    edge: '-',
                    rate: 580,
                    isCalculated: true,
                    isEnabled: true,
                    photoUrl: null,
                },
            ];

            const result = validateLines(lines);

            expect(result.success).toBe(false);
            expect(result.error).toContain('shutter');
        });

        it('should fail when carcass line is missing', () => {
            const lines: RateLine[] = [
                {
                    type: 'shutter',
                    label: 'Shutter',
                    material: 'plywood',
                    thickness: '-',
                    finish: 'laminate',
                    edge: 'profile',
                    rate: 400,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'loft',
                    label: 'Loft',
                    material: '(Combined)',
                    thickness: '-',
                    finish: '-',
                    edge: '-',
                    rate: 580,
                    isCalculated: true,
                    isEnabled: true,
                    photoUrl: null,
                },
            ];

            const result = validateLines(lines);

            expect(result.success).toBe(false);
            expect(result.error).toContain('carcass');
        });

        it('should fail when loft line is missing', () => {
            const lines: RateLine[] = [
                {
                    type: 'shutter',
                    label: 'Shutter',
                    material: 'plywood',
                    thickness: '-',
                    finish: 'laminate',
                    edge: 'profile',
                    rate: 400,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'carcass',
                    label: 'Carcass',
                    material: 'plywood',
                    thickness: '18mm',
                    finish: '-',
                    edge: 'pvc_2mm',
                    rate: 180,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
            ];

            const result = validateLines(lines);

            expect(result.success).toBe(false);
            expect(result.error).toContain('loft');
        });

        it('should fail when rate is negative', () => {
            const lines: RateLine[] = [
                {
                    type: 'shutter',
                    label: 'Shutter',
                    material: 'plywood',
                    thickness: '-',
                    finish: 'laminate',
                    edge: 'profile',
                    rate: -100,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'carcass',
                    label: 'Carcass',
                    material: 'plywood',
                    thickness: '18mm',
                    finish: '-',
                    edge: 'pvc_2mm',
                    rate: 180,
                    isCalculated: false,
                    isEnabled: true,
                    photoUrl: null,
                },
                {
                    type: 'loft',
                    label: 'Loft',
                    material: '(Combined)',
                    thickness: '-',
                    finish: '-',
                    edge: '-',
                    rate: 80,
                    isCalculated: true,
                    isEnabled: true,
                    photoUrl: null,
                },
            ];

            const result = validateLines(lines);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Negative rate');
        });
    });

    // =========================================================================
    // Service Object Export Tests
    // =========================================================================

    describe('rateLineService export', () => {
        it('should export all service methods', () => {
            expect(typeof rateLineService.configToLines).toBe('function');
            expect(typeof rateLineService.linesToConfig).toBe('function');
            expect(typeof rateLineService.updateLine).toBe('function');
            expect(typeof rateLineService.calculateLineTotals).toBe('function');
            expect(typeof rateLineService.validateLines).toBe('function');
        });
    });
});
