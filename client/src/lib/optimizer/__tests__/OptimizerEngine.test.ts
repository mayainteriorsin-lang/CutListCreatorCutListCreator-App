import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runOptimizerEngine, runOptimizerInternal } from '../OptimizerEngine';
import * as multiPass from '../multiPassOptimize';
import * as prepParts from '../preparePartsForOptimizer';

// Mock multiPassOptimize to avoid actual optimization
vi.mock('../multiPassOptimize', () => ({
    multiPassOptimize: vi.fn()
}));

// Mock preparePartsForOptimizer to pass through
vi.mock('../preparePartsForOptimizer', () => ({
    preparePartsForOptimizer: vi.fn((panels) => panels.map((p: any) => ({ ...p, id: p.id || 'part' })))
}));

describe('OptimizerEngine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockGeneratePanels = (cabinet: any) => [
        { id: `${cabinet.id}-top`, name: 'Top', width: 600, height: 450, plywoodType: cabinet.plywoodType, laminateCode: 'L1' },
        { id: `${cabinet.id}-bottom`, name: 'Bottom', width: 600, height: 450, plywoodType: cabinet.plywoodType, laminateCode: 'L1' },
    ];

    describe('runOptimizerInternal', () => {
        it('should return empty result for empty cabinets', async () => {
            const result = await runOptimizerInternal({
                cabinets: [],
                manualPanels: [],
                sheetWidth: 1210,
                sheetHeight: 2420,
                kerf: 5,
                woodGrainsPreferences: {},
                generatePanels: mockGeneratePanels
            });

            expect(result.brandResults).toEqual([]);
            expect(result.error).toBeNull();
        });

        it('should group panels by brand + laminate and run optimization', async () => {
            // Mock optimization result
            vi.mocked(multiPass.multiPassOptimize).mockResolvedValue([
                { placed: [{ id: 'cab1-top', w: 600, h: 450 }] }
            ]);

            const result = await runOptimizerInternal({
                cabinets: [{ id: 'cab1', width: 600, height: 2000, depth: 500, plywoodType: 'BWP 18mm' }],
                manualPanels: [],
                sheetWidth: 1210,
                sheetHeight: 2420,
                kerf: 5,
                woodGrainsPreferences: {},
                generatePanels: mockGeneratePanels
            });

            expect(result.brandResults.length).toBe(1);
            expect(result.brandResults[0].brand).toBe('BWP 18mm');
            expect(result.brandResults[0].laminateDisplay).toBe('L1');
        });

        it('should assign stable sheet IDs', async () => {
            vi.mocked(multiPass.multiPassOptimize).mockResolvedValue([
                { placed: [{ id: 'cab1-top' }] },
                { placed: [{ id: 'cab1-bottom' }] }
            ]);

            const result = await runOptimizerInternal({
                cabinets: [{ id: 'cab1', width: 600, height: 2000, depth: 500, plywoodType: 'PLY' }],
                manualPanels: [],
                sheetWidth: 1210,
                sheetHeight: 2420,
                kerf: 5,
                woodGrainsPreferences: {},
                generatePanels: mockGeneratePanels
            });

            const sheets = result.brandResults[0]?.result?.panels ?? [];
            expect(sheets[0]._sheetId).toMatch(/ply\|\|\|l1-0/i);
            expect(sheets[1]._sheetId).toMatch(/ply\|\|\|l1-1/i);
        });

        it('should handle multiple brand groups', async () => {
            // Two cabinets with different plywood types
            const customGenerate = (cabinet: any) => [
                { id: `${cabinet.id}-panel`, name: 'Panel', width: 100, height: 100, plywoodType: cabinet.plywoodType, laminateCode: cabinet.laminateCode }
            ];

            vi.mocked(multiPass.multiPassOptimize).mockResolvedValue([
                { placed: [{ id: 'test' }] }
            ]);

            const result = await runOptimizerInternal({
                cabinets: [
                    { id: 'cab1', plywoodType: 'Brand1', laminateCode: 'L1' },
                    { id: 'cab2', plywoodType: 'Brand2', laminateCode: 'L2' }
                ],
                manualPanels: [],
                sheetWidth: 1210,
                sheetHeight: 2420,
                kerf: 5,
                woodGrainsPreferences: {},
                generatePanels: customGenerate
            });

            // Should have 2 brand groups
            expect(result.brandResults.length).toBe(2);
            expect(result.brandResults.map(b => b.brand).sort()).toEqual(['Brand1', 'Brand2']);
        });
    });

    describe('runOptimizerEngine (with caching)', () => {
        it('should return cached result for identical inputs', async () => {
            vi.mocked(multiPass.multiPassOptimize).mockResolvedValue([
                { placed: [] }
            ]);

            const params = {
                cabinets: [{ id: 'cab1', width: 600, height: 2000, depth: 500, plywoodType: 'PLY' }],
                manualPanels: [],
                sheetWidth: 1210,
                sheetHeight: 2420,
                kerf: 5,
                woodGrainsPreferences: {},
                generatePanels: mockGeneratePanels
            };

            // First call
            await runOptimizerEngine(params);
            const callCount1 = vi.mocked(multiPass.multiPassOptimize).mock.calls.length;

            // Second call with same params (should use cache)
            await runOptimizerEngine(params);
            const callCount2 = vi.mocked(multiPass.multiPassOptimize).mock.calls.length;

            // multiPassOptimize should NOT have been called again
            expect(callCount2).toBe(callCount1);
        });

        it('should re-run optimization when inputs change', async () => {
            vi.mocked(multiPass.multiPassOptimize).mockResolvedValue([
                { placed: [] }
            ]);

            const params1 = {
                cabinets: [{ id: 'cab1', width: 600, height: 2000, depth: 500, plywoodType: 'PLY' }],
                manualPanels: [],
                sheetWidth: 1210,
                sheetHeight: 2420,
                kerf: 5,
                woodGrainsPreferences: {},
                generatePanels: mockGeneratePanels
            };

            const params2 = {
                ...params1,
                cabinets: [{ id: 'cab2', width: 800, height: 2000, depth: 500, plywoodType: 'PLY' }] // Different cabinet
            };

            await runOptimizerEngine(params1);
            const callCount1 = vi.mocked(multiPass.multiPassOptimize).mock.calls.length;

            await runOptimizerEngine(params2);
            const callCount2 = vi.mocked(multiPass.multiPassOptimize).mock.calls.length;

            // Should have been called again due to different input
            expect(callCount2).toBeGreaterThan(callCount1);
        });
    });
});
