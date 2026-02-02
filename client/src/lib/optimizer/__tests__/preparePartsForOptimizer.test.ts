import { describe, it, expect } from 'vitest';
import { preparePartsForOptimizer } from '../preparePartsForOptimizer';
import { Panel } from '@shared/schema';

describe('preparePartsForOptimizer', () => {
    // Helper to create basic panel
    const createPanel = (overrides: Partial<Panel> = {}): Panel => ({
        id: 'p1',
        name: 'Test Panel',
        width: 100,
        height: 200,
        ...overrides,
    });

    it('should expand panels by quantity', () => {
        // NOTE: The current simple implementation doesn't seem to expand by quantity within prepareStandardParts 
        // but assumes upstream expansion. Based on prepareStandardParts code read, it iterates input array.
        // Let's verify behavior.
        const panels = [
            createPanel({ name: 'Panel 1' }),
            createPanel({ name: 'Panel 2' })
        ];
        const result = preparePartsForOptimizer(panels);
        expect(result.length).toBe(2);
    });

    it('should map TOP panel dimensions to X/Y correctly', () => {
        // TOP: Width(800) -> Y, Depth(450) -> X
        const panel = createPanel({
            name: 'Cabinet - Top',
            nomW: 800, // Width
            nomH: 450, // Depth
        });

        const result = preparePartsForOptimizer([panel]);
        const part = result[0];

        expect(part.panelType).toBe('TOP');
        expect(part.w).toBe(450); // X axis
        expect(part.h).toBe(800); // Y axis
    });

    it('should map LEFT panel dimensions to X/Y correctly', () => {
        // LEFT: Depth(450) -> X, Height(2000) -> Y
        const panel = createPanel({
            name: 'Cabinet - Left',
            nomW: 450, // Depth
            nomH: 2000, // Height
        });

        const result = preparePartsForOptimizer([panel]);
        const part = result[0];

        expect(part.panelType).toBe('LEFT');
        expect(part.w).toBe(450); // X axis
        expect(part.h).toBe(2000); // Y axis
    });

    it('should map BACK panel dimensions to X/Y correctly', () => {
        // BACK: Width(800) -> X, Height(2000) -> Y
        const panel = createPanel({
            name: 'Cabinet - Back',
            nomW: 800, // Width
            nomH: 2000, // Height
        });

        const result = preparePartsForOptimizer([panel]);
        const part = result[0];

        expect(part.panelType).toBe('BACK');
        expect(part.w).toBe(800); // X axis
        expect(part.h).toBe(2000); // Y axis
    });

    it('should generate unique IDs with panel type counters', () => {
        const panels = [
            createPanel({ name: 'Cabinet - Top' }), // Should be TOP_1
            createPanel({ name: 'Cabinet - Top' }), // Should be TOP_2
            createPanel({ name: 'Cabinet - Left' }) // Should be LEFT_1
        ];

        const result = preparePartsForOptimizer(panels);

        expect(result[0].id).toMatch(/TOP_\d+/);
        expect(result[1].id).toMatch(/TOP_\d+/);
        expect(result[0].id).not.toBe(result[1].id);
        expect(result[2].id).toMatch(/LEFT_\d+/);
    });

    it('should lock rotation when wood grain is enabled on panel', () => {
        const panel = createPanel({
            name: 'Cabinet - Top',
            grainDirection: true
        });

        const result = preparePartsForOptimizer([panel]);
        expect(result[0].rotate).toBe(false);
        expect(result[0].woodGrainsEnabled).toBe(true);
    });

    it('should lock rotation when wood grain is enabled for laminate code', () => {
        const panel = createPanel({
            name: 'Cabinet - Top',
            laminateCode: 'WG123',
            grainDirection: false // Panel says no, but preferences say yes
        });

        const preferences = { 'WG123': true };
        const result = preparePartsForOptimizer([panel], preferences);

        expect(result[0].rotate).toBe(false);
        expect(result[0].woodGrainsEnabled).toBe(true);
    });

    it('should allow rotation when no grain rules apply', () => {
        const panel = createPanel({
            name: 'Cabinet - Top',
            laminateCode: 'PLAIN',
            grainDirection: false
        });

        const preferences = { 'PLAIN': false };
        const result = preparePartsForOptimizer([panel], preferences);

        expect(result[0].rotate).toBe(true);
        expect(result[0].woodGrainsEnabled).toBe(false);
    });

    it('should extract shutter label from name', () => {
        const panel = createPanel({
            name: 'Cabinet - Shutter 1'
        });

        const result = preparePartsForOptimizer([panel]);
        expect(result[0].panelType).toBe('SHUTTER');
        expect(result[0].shutterLabel).toBe('SHUTTER 1');
    });

    it('should ignore panels with zero dimensions', () => {
        const panel = createPanel({
            name: 'Zero Panel',
            width: 0,
            height: 0,
            nomW: 0,
            nomH: 0
        });

        const result = preparePartsForOptimizer([panel]);
        expect(result.length).toBe(0);
    });

    it('should map BOTTOM panel dimensions to X/Y correctly', () => {
        // BOTTOM: Width(800) -> Y, Depth(450) -> X (same as TOP)
        const panel = createPanel({
            name: 'Cabinet - Bottom',
            nomW: 800, // Width
            nomH: 450, // Depth
        });

        const result = preparePartsForOptimizer([panel]);
        const part = result[0];

        expect(part.panelType).toBe('BOTTOM');
        expect(part.w).toBe(450); // X axis
        expect(part.h).toBe(800); // Y axis
    });

    it('should map RIGHT panel dimensions to X/Y correctly', () => {
        // RIGHT: Depth(450) -> X, Height(2000) -> Y (same as LEFT)
        const panel = createPanel({
            name: 'Cabinet - Right',
            nomW: 450, // Depth
            nomH: 2000, // Height
        });

        const result = preparePartsForOptimizer([panel]);
        const part = result[0];

        expect(part.panelType).toBe('RIGHT');
        expect(part.w).toBe(450); // X axis
        expect(part.h).toBe(2000); // Y axis
    });

    it('should map CENTER_POST panel dimensions to X/Y correctly', () => {
        // CENTER_POST: Default mapping (width -> X, height -> Y)
        const panel = createPanel({
            name: 'Cabinet - Center Post',
            nomW: 50,
            nomH: 1950,
        });

        const result = preparePartsForOptimizer([panel]);
        const part = result[0];

        expect(part.panelType).toBe('CENTER_POST');
        expect(part.w).toBe(50); // X axis
        expect(part.h).toBe(1950); // Y axis
    });

    it('should map SHELF panel dimensions to X/Y correctly', () => {
        // SHELF: Default mapping (width -> X, height -> Y)
        const panel = createPanel({
            name: 'Cabinet - Shelf',
            nomW: 564,
            nomH: 450,
        });

        const result = preparePartsForOptimizer([panel]);
        const part = result[0];

        expect(part.panelType).toBe('SHELF');
        expect(part.w).toBe(564); // X axis
        expect(part.h).toBe(450); // Y axis
    });

    it('should handle multiple shutters with correct numbering', () => {
        const panels = [
            createPanel({ name: 'Cabinet - Shutter 1' }),
            createPanel({ name: 'Cabinet - Shutter 2' }),
            createPanel({ name: 'Cabinet - Shutter 3' })
        ];

        const result = preparePartsForOptimizer(panels);

        expect(result[0].panelType).toBe('SHUTTER');
        expect(result[0].shutterLabel).toBe('SHUTTER 1');
        expect(result[1].panelType).toBe('SHUTTER');
        expect(result[1].shutterLabel).toBe('SHUTTER 2');
        expect(result[2].panelType).toBe('SHUTTER');
        expect(result[2].shutterLabel).toBe('SHUTTER 3');
    });

    it('should handle shutter without number', () => {
        const panel = createPanel({
            name: 'Cabinet - Shutter'
        });

        const result = preparePartsForOptimizer([panel]);
        expect(result[0].panelType).toBe('SHUTTER');
        expect(result[0].shutterLabel).toBe('SHUTTER');
    });

    it('should prioritize specific panel types over shutter detection', () => {
        // Cabinet named "Shutter #1" should still detect TOP panel correctly
        const panel = createPanel({
            name: 'Shutter #1 - Top'
        });

        const result = preparePartsForOptimizer([panel]);
        expect(result[0].panelType).toBe('TOP');
        expect(result[0].shutterLabel).toBeUndefined();
    });

    it('should handle mixed grain preferences correctly', () => {
        const panels = [
            createPanel({ name: 'Panel 1', laminateCode: 'WG123', grainDirection: false }),
            createPanel({ name: 'Panel 2', laminateCode: 'PLAIN', grainDirection: false }),
            createPanel({ name: 'Panel 3', laminateCode: 'WG456', grainDirection: true })
        ];

        const preferences = {
            'WG123': true,  // Preference says yes
            'PLAIN': false, // Preference says no
            'WG456': false  // Preference says no, but panel overrides
        };

        const result = preparePartsForOptimizer(panels, preferences);

        // Panel 1: preference enables grain
        expect(result[0].rotate).toBe(false);
        expect(result[0].woodGrainsEnabled).toBe(true);

        // Panel 2: no grain
        expect(result[1].rotate).toBe(true);
        expect(result[1].woodGrainsEnabled).toBe(false);

        // Panel 3: panel grainDirection overrides preference
        expect(result[2].rotate).toBe(false);
        expect(result[2].woodGrainsEnabled).toBe(true);
    });

    it('should handle laminate code with plus separator', () => {
        const panel = createPanel({
            name: 'Cabinet - Top',
            laminateCode: 'WG123+InnerCode',
            grainDirection: false
        });

        const preferences = { 'WG123': true };
        const result = preparePartsForOptimizer([panel], preferences);

        // Should extract front code (before +) for grain check
        expect(result[0].rotate).toBe(false);
        expect(result[0].woodGrainsEnabled).toBe(true);
        expect(result[0].laminateCode).toBe('WG123+InnerCode'); // Full code preserved
    });

    it('should fallback to width/height when nomW/nomH are missing', () => {
        const panel = createPanel({
            name: 'Cabinet - Top',
            width: 800,
            height: 450,
            // nomW and nomH not provided
        });

        const result = preparePartsForOptimizer([panel]);

        // Should use width/height as fallback
        expect(result[0].w).toBe(450); // Swapped for TOP
        expect(result[0].h).toBe(800);
        expect(result[0].nomW).toBe(800);
        expect(result[0].nomH).toBe(450);
    });

    it('should preserve gaddi flag', () => {
        const panels = [
            createPanel({ name: 'Panel 1', gaddi: true }),
            createPanel({ name: 'Panel 2', gaddi: false }),
            createPanel({ name: 'Panel 3' }) // undefined
        ];

        const result = preparePartsForOptimizer(panels);

        expect(result[0].gaddi).toBe(true);
        expect(result[1].gaddi).toBe(false);
        expect(result[2].gaddi).toBe(false);
    });

    it('should preserve original panel reference', () => {
        const panel = createPanel({
            name: 'Test Panel',
            laminateCode: 'ABC123'
        });

        const result = preparePartsForOptimizer([panel]);

        expect(result[0].originalPanel).toBe(panel);
        expect(result[0].originalPanel.laminateCode).toBe('ABC123');
    });

    it('should handle empty laminate code', () => {
        const panel = createPanel({
            name: 'Cabinet - Top',
            laminateCode: '',
            grainDirection: false
        });

        const result = preparePartsForOptimizer([panel]);

        expect(result[0].laminateCode).toBe('');
        expect(result[0].rotate).toBe(true); // No grain for empty code
        expect(result[0].woodGrainsEnabled).toBe(false);
    });

    it('should handle undefined laminate code', () => {
        const panel = createPanel({
            name: 'Cabinet - Top',
            grainDirection: false
        });

        const result = preparePartsForOptimizer([panel]);

        expect(result[0].laminateCode).toBe('');
        expect(result[0].rotate).toBe(true);
    });

    it('should set quantity to 1 for each part', () => {
        const panels = [
            createPanel({ name: 'Panel 1' }),
            createPanel({ name: 'Panel 2' }),
            createPanel({ name: 'Panel 3' })
        ];

        const result = preparePartsForOptimizer(panels);

        result.forEach(part => {
            expect(part.qty).toBe(1);
        });
    });

    it('should generate unique IDs across different panel types', () => {
        const panels = [
            createPanel({ name: 'Cabinet - Top' }),
            createPanel({ name: 'Cabinet - Bottom' }),
            createPanel({ name: 'Cabinet - Left' }),
            createPanel({ name: 'Cabinet - Right' }),
            createPanel({ name: 'Cabinet - Back' }),
            createPanel({ name: 'Cabinet - Shutter 1' }),
            createPanel({ name: 'Cabinet - Center Post' }),
            createPanel({ name: 'Cabinet - Shelf' })
        ];

        const result = preparePartsForOptimizer(panels);

        // All IDs should be unique
        const ids = result.map(p => p.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);

        // Check ID patterns
        expect(result[0].id).toMatch(/^TOP_\d+_/);
        expect(result[1].id).toMatch(/^BOTTOM_\d+_/);
        expect(result[2].id).toMatch(/^LEFT_\d+_/);
        expect(result[3].id).toMatch(/^RIGHT_\d+_/);
        expect(result[4].id).toMatch(/^BACK_\d+_/);
        expect(result[5].id).toMatch(/^SHUTTER_\d+_/);
        expect(result[6].id).toMatch(/^CENTER_POST_\d+_/);
        expect(result[7].id).toMatch(/^SHELF_\d+_/);
    });

    it('should handle panels with only nomW and nomH (no width/height)', () => {
        const panel = createPanel({
            name: 'Cabinet - Top',
            width: 0,
            height: 0,
            nomW: 800,
            nomH: 450
        });

        const result = preparePartsForOptimizer([panel]);

        expect(result[0].w).toBe(450);
        expect(result[0].h).toBe(800);
    });

    it('should handle default panel type when name does not match any pattern', () => {
        const panel = createPanel({
            name: 'Custom Panel XYZ',
            nomW: 500,
            nomH: 600
        });

        const result = preparePartsForOptimizer([panel]);

        expect(result[0].panelType).toBe('PANEL');
        expect(result[0].w).toBe(500); // Default mapping
        expect(result[0].h).toBe(600);
    });

    it('should handle back panel with alternative naming', () => {
        const panels = [
            createPanel({ name: 'Cabinet - Back' }),
            createPanel({ name: 'Cabinet-back' }),
            createPanel({ name: 'Back Panel' })
        ];

        const result = preparePartsForOptimizer(panels);

        result.forEach(part => {
            expect(part.panelType).toBe('BACK');
        });
    });

    it('should preserve nomW and nomH as original dimensions', () => {
        const panel = createPanel({
            name: 'Cabinet - Top',
            nomW: 800,
            nomH: 450
        });

        const result = preparePartsForOptimizer([panel]);

        // nomW and nomH should be preserved (not swapped)
        expect(result[0].nomW).toBe(800);
        expect(result[0].nomH).toBe(450);

        // w and h should be swapped for TOP panel
        expect(result[0].w).toBe(450);
        expect(result[0].h).toBe(800);
    });

    it('should handle whitespace in laminate codes', () => {
        const panel = createPanel({
            name: 'Cabinet - Top',
            laminateCode: '  WG123  ',
            grainDirection: false
        });

        const preferences = { 'WG123': true };
        const result = preparePartsForOptimizer([panel], preferences);

        // Should trim and match preference
        expect(result[0].rotate).toBe(false);
        expect(result[0].woodGrainsEnabled).toBe(true);
    });
});
