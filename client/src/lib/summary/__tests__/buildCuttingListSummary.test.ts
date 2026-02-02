import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCuttingListSummary } from '../SummaryEngine';
import * as panelGen from '@/lib/panels/generatePanels';

describe('buildCuttingListSummary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should group panels by laminate code and calculate total area', () => {
        // Mock generatePanels to return 3 panels
        const mockPanels = [
            { id: 'p1', laminateCode: 'L1', width: 1000, height: 1000 }, // 1m^2
            { id: 'p2', laminateCode: 'L1', width: 1000, height: 1000 }, // 1m^2
            { id: 'p3', laminateCode: 'L2', width: 1000, height: 2000 }, // 2m^2
        ];

        vi.spyOn(panelGen, 'generatePanels').mockReturnValue(mockPanels);

        const result = buildCuttingListSummary([{ id: 'c1' }]); // Input cabinet doesn't matter since mock returns panels

        expect(result.totalPanels).toBe(3);
        expect(result.totalArea).toBe(4); // 1+1+2 = 4m^2

        expect(result.panelGroups).toHaveLength(2);

        const g1 = result.panelGroups.find(g => g.laminateCode === 'L1');
        expect(g1).toBeDefined();
        expect(g1.panels).toHaveLength(2);
        expect(g1.totalArea).toBe(2);

        const g2 = result.panelGroups.find(g => g.laminateCode === 'L2');
        expect(g2).toBeDefined();
        expect(g2.panels).toHaveLength(1);
        expect(g2.totalArea).toBe(2);
    });

    it('should handle "None" laminate grouping', () => {
        const mockPanels = [
            { id: 'p1', laminateCode: '', width: 100, height: 100 },
            { id: 'p2', laminateCode: null, width: 100, height: 100 },
        ];
        vi.spyOn(panelGen, 'generatePanels').mockReturnValue(mockPanels);

        const result = buildCuttingListSummary([{}]);

        expect(result.panelGroups).toHaveLength(1);
        expect(result.panelGroups[0].laminateCode).toBe('None');
    });

    it('should handle zero area calculations safely', () => {
        const mockPanels = [
            { id: 'p1', laminateCode: 'L1', width: 0, height: 0 },
        ];
        vi.spyOn(panelGen, 'generatePanels').mockReturnValue(mockPanels);

        const result = buildCuttingListSummary([{}]);

        expect(result.totalArea).toBe(0);
        expect(result.panelGroups[0].totalArea).toBe(0);
    });
});
