import { describe, it, expect, vi, beforeEach } from 'vitest';
import { optimizeStandardCutlist } from '@/features/standard/optimizer';
import * as optimizerBridge from '@/features/cutlist/core/optimizer-bridge';

// Mock the bridge which normally spins up a worker
vi.mock('@/features/cutlist/core/optimizer-bridge', () => ({
    runOptimizer: vi.fn(),
}));

describe('optimizeStandardCutlist', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should run multiple strategies and pick the most efficient one', async () => {
        // Mock 3 results: 
        // 1. Inefficient (low efficiency, many sheets)
        // 2. Efficient (high efficiency, few sheets) - WINNER
        // 3. Middle
        const mockParts = [{ id: 'p1', w: 100, h: 200, qty: 1, rotate: true }];

        // Detailed mock implementation to return different results depending on args
        const runOptimizerSpy = vi.spyOn(optimizerBridge, 'runOptimizer');

        // We can't easily distinguish calls by arguments in mockResolvedValue logic inside spy,
        // so we'll mock the implementation to return data based on time/strategy inputs.
        runOptimizerSpy.mockImplementation(async (parts, w, h, time, strategy, algo) => {
            if (algo === 'maxrects') {
                // Strategy 3: MaxRects (Low efficiency)
                return { panels: Array(3).fill({ placed: [] }) }; // 3 sheets
            }
            if (time === 3000) {
                // Strategy 1: Genetic Short (Medium)
                return { panels: Array(2).fill({ placed: mockParts }) }; // 2 sheets
            }
            if (time === 4000) {
                // Strategy 2: Genetic Long (High efficiency)
                // Returning 1 sheet with good placement
                return { panels: Array(1).fill({ placed: mockParts }) }; // 1 sheet - WINNER
            }
            return { panels: [] };
        });

        const result = await optimizeStandardCutlist(mockParts);

        // Should pick the one with 1 sheet
        expect(result.length).toBe(1);
        expect(runOptimizerSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle all strategies failing gracefully', async () => {
        const mockParts = [{ id: 'p1', w: 100, h: 200, qty: 1 }];

        // All fail
        vi.spyOn(optimizerBridge, 'runOptimizer').mockRejectedValue(new Error('Worker crashed'));

        const result = await optimizeStandardCutlist(mockParts);

        // Should return empty array, not crash
        expect(result).toEqual([]);
    });

    it('should respect rotation lock flag passed to strategies', async () => {
        const mockParts = [
            { id: 'p1', w: 100, h: 200, qty: 1, rotate: false } // Locked
        ];

        const runOptimizerSpy = vi.spyOn(optimizerBridge, 'runOptimizer');
        runOptimizerSpy.mockResolvedValue({ panels: [] });

        await optimizeStandardCutlist(mockParts);

        // Verify the first call passed parts with correct rotation settings
        const calledParts = runOptimizerSpy.mock.calls[0][0];
        // rotate: false means "locked", ensure logic preserves it
        // The code does: const taskParts = parts.map(p => ({ ...p, rotate: p.rotate !== false }));
        // p.rotate is false -> p.rotate !== false is FALSE.
        expect(calledParts[0].rotate).toBe(false);
    });

    it('should allow rotation when not locked', async () => {
        const mockParts = [
            { id: 'p1', w: 100, h: 200, qty: 1, rotate: true } // Allowed
        ];

        const runOptimizerSpy = vi.spyOn(optimizerBridge, 'runOptimizer');
        runOptimizerSpy.mockResolvedValue({ panels: [] });

        await optimizeStandardCutlist(mockParts);

        const calledParts = runOptimizerSpy.mock.calls[0][0];
        // p.rotate is true -> p.rotate !== false is TRUE.
        expect(calledParts[0].rotate).toBe(true);
    });
});
