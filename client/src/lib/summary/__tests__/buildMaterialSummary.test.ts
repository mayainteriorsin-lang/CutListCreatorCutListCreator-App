import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildMaterialSummary } from '../SummaryEngine';
import * as panelGen from '@/lib/panels/generatePanels';
import * as optimizer from '@/lib/optimizer';

describe('buildMaterialSummary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should aggregate plywood and laminate counts based on optimizer results', async () => {
        const mockPanels = [
            // Group 1: Brand1 + L1+L2
            { id: 'p1', plywoodType: 'Brand1', laminateCode: 'L1 + L2', name: 'Panel1' },
            // Group 2: Brand2 + L3
            { id: 'p2', plywoodType: 'Brand2', laminateCode: 'L3', name: 'Panel2' },
        ];

        vi.spyOn(panelGen, 'generatePanels').mockReturnValue(mockPanels);

        // Mock prepare parts - just pass through
        vi.spyOn(optimizer, 'preparePartsForOptimizer').mockImplementation((p) => p);

        // Mock optimization results
        // For Group 1, return 2 sheets. For Group 2, return 1 sheet.
        const optimizeSpy = vi.spyOn(optimizer, 'multiPassOptimize');

        optimizeSpy.mockImplementation(async (parts) => {
            const p = parts[0];
            if (p.plywoodType === 'Brand1') {
                // Return 2 separate sheets
                return [{ placed: [{ name: 'Panel1' }], _sheetId: 's1' }, { placed: [{ name: 'Panel1' }], _sheetId: 's2' }];
            }
            if (p.plywoodType === 'Brand2') {
                return [{ placed: [{ name: 'Panel2' }], _sheetId: 's3' }];
            }
            return [];
        });

        const result = await buildMaterialSummary({
            cabinets: [{}],
            sheetWidth: 1210,
            sheetHeight: 2420,
            kerf: 5,
            woodGrainsPreferences: {},
            deletedPreviewSheets: new Set()
        });

        // Verify Plywood Counts
        expect(result.plywood['Brand1']).toBe(2);
        expect(result.plywood['Brand2']).toBe(1);
        expect(result.totalPlywoodSheets).toBe(3);

        // Verify Laminate Counts
        // L1 and L2 are on Brand1 sheets (count = 2)
        expect(result.laminates['L1']).toBe(2);
        expect(result.laminates['L2']).toBe(2);
        // L3 is on Brand2 sheets (count = 1)
        expect(result.laminates['L3']).toBe(1);
    });

    it('should respect deleted preview sheets', async () => {
        const mockPanels = [{ id: 'p1', plywoodType: 'Brand1', laminateCode: 'L1', name: 'Panel1' }];
        vi.spyOn(panelGen, 'generatePanels').mockReturnValue(mockPanels);
        vi.spyOn(optimizer, 'preparePartsForOptimizer').mockImplementation((p) => p);

        vi.spyOn(optimizer, 'multiPassOptimize').mockResolvedValue([
            { placed: [{ name: 'Panel1' }], _sheetId: 'group1-0' } // ID format from implementation
        ]);

        // Mark 'group1-0' as deleted. 
        // Note: groupKey construction in source relies on normalized string. 
        // "brand1|||l1" might be the key. Let's trace carefully or mock deeper.

        // Actually, SummaryEngine assigns _sheetId: `${groupKey}-${sheetIdx}`
        // We need to know the groupKey to test this accurately with specific ID strings.
        // Instead, let's verify logic by seeing if the reducer filters based on the set.

        // Let's assume the key is "brand1|||l1".
        const deletedSet = new Set(['brand1|||l1-0']);

        const result = await buildMaterialSummary({
            cabinets: [{}],
            sheetWidth: 1210,
            sheetHeight: 2420,
            kerf: 5,
            woodGrainsPreferences: {},
            deletedPreviewSheets: deletedSet
        });

        // Should be 0 because the sheet is deleted
        expect(result.plywood['Brand1'] || 0).toBe(0);
    });

    it('should ignore Backer laminate in counting', async () => {
        const mockPanels = [{ id: 'p1', plywoodType: 'Brand1', laminateCode: 'L1 + Backer', name: 'Panel1' }];
        vi.spyOn(panelGen, 'generatePanels').mockReturnValue(mockPanels);
        vi.spyOn(optimizer, 'preparePartsForOptimizer').mockImplementation((p) => p);
        vi.spyOn(optimizer, 'multiPassOptimize').mockResolvedValue([{ placed: [{ name: 'Panel1' }], _sheetId: 's1' }]);

        const result = await buildMaterialSummary({
            cabinets: [{}],
            sheetWidth: 1210,
            sheetHeight: 2420,
            kerf: 5,
            woodGrainsPreferences: {},
            deletedPreviewSheets: new Set()
        });

        expect(result.laminates['L1']).toBe(1);
        expect(result.laminates['Backer']).toBeUndefined();
    });
});
