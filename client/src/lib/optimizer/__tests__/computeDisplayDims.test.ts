import { describe, it, expect } from 'vitest';
import { computeDisplayDims, getDisplayDims } from '../computeDisplayDims';

describe('computeDisplayDims', () => {
    /*
     * Logic verified from source:
     * TOP/BOTTOM: displayWidth = height/nomH, displayHeight = width/nomW
     * LEFT/RIGHT: displayWidth = height/nomH, displayHeight = width/nomW
     * OTHERS:     displayWidth = width/nomW,  displayHeight = height/nomH
     */

    it('should calculate dimensions for TOP panel (swaps width/height for display logic)', () => {
        const panel = {
            type: 'TOP',
            width: 1000, // nomW
            height: 500, // nomH
        };

        computeDisplayDims(panel);

        // Source says: displayWidth = height, displayHeight = width
        expect(panel.displayWidth).toBe(500);
        expect(panel.displayHeight).toBe(1000);
        expect(panel.displayLabel).toBe('500×1000');
    });

    it('should calculate dimensions for LEFT panel', () => {
        const panel = {
            type: 'LEFT',
            width: 500,  // nomW
            height: 2000 // nomH
        };

        computeDisplayDims(panel);

        // Source says: displayWidth = height, displayHeight = width
        expect(panel.displayWidth).toBe(2000);
        expect(panel.displayHeight).toBe(500);
    });

    it('should calculate dimensions for generic panel (standard)', () => {
        const panel = {
            type: 'SHELF',
            width: 800,
            height: 400
        };

        computeDisplayDims(panel);

        // Source says: fallback is W->X, H->Y
        expect(panel.displayWidth).toBe(800);
        expect(panel.displayHeight).toBe(400);
    });

    it('should use nomW/nomH if width/height missing', () => {
        const panel = {
            type: 'SHELF',
            nomW: 800,
            nomH: 400
        };

        computeDisplayDims(panel);

        expect(panel.displayWidth).toBe(800);
        expect(panel.displayHeight).toBe(400);
    });

    it('should use w/h (optimizer props) if others missing', () => {
        const panel = {
            type: 'SHELF',
            w: 800,
            h: 400
        };

        computeDisplayDims(panel);

        expect(panel.displayWidth).toBe(800);
        expect(panel.displayHeight).toBe(400);
    });
});

describe('getDisplayDims', () => {
    it('should return 0,0 for invalid input', () => {
        expect(getDisplayDims(null)).toEqual({ displayW: 0, displayH: 0 });
    });

    it('should prioritize w/h over nomW/nomH', () => {
        const panel = {
            w: 100, h: 200,
            nomW: 50, nomH: 60
        };
        const result = getDisplayDims(panel);
        expect(result.displayW).toBe(100);
        expect(result.displayH).toBe(200);
    });

    it('should swap dimensions if _swapped flag is true', () => {
        const panel = {
            w: 100, h: 200,
            _swapped: true
        };
        const result = getDisplayDims(panel);
        expect(result.displayW).toBe(200);
        expect(result.displayH).toBe(100);
    });
});
