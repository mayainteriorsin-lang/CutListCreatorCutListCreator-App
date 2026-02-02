import { describe, it, expect, vi } from 'vitest';
import { generatePanels } from '../generatePanels';

// Mock the util
vi.mock('@/lib/laminates/composeLaminateCode', () => ({
    composeLaminateCode: (front: any, inner: any) => {
        if (!front && !inner) return '';
        if (!inner) return String(front || '');
        if (!front) return String(inner || '');
        return `${front}+${inner}`;
    }
}));

describe('generatePanels', () => {
    // Helper to create basic cabinet
    const createCabinet = (overrides: any = {}) => ({
        id: 'cab1',
        name: 'Test Cabinet',
        width: 1000,
        height: 2000,
        depth: 600,
        configurationMode: 'advanced',
        plywoodType: 'BWP 19mm',
        ...overrides
    });

    describe('Basic Mode', () => {
        it('should generate quick shutters only', () => {
            const cabinet = createCabinet({
                configurationMode: 'basic',
                shutterCount: 2,
                shutterLaminateCode: 'L1',
                shutterInnerLaminateCode: 'L2',
                plywoodType: 'Ply1'
            });

            const panels = generatePanels(cabinet);

            expect(panels.length).toBe(2);
            expect(panels[0].name).toBe('Shutter');
            expect(panels[0].laminateCode).toBe('L1+L2');
            expect(panels[0].width).toBe(1000);
            expect(panels[0].height).toBe(2000);
        });

        it('should handle depth=0 as basic mode', () => {
            const cabinet = createCabinet({
                depth: 0,
                shutterCount: 1,
            });

            const panels = generatePanels(cabinet);
            expect(panels.length).toBe(1);
            expect(panels[0].name).toBe('Shutter');
        });
    });

    describe('Advanced Mode', () => {
        it('should generate main carcass panels (5 panels)', () => {
            const cabinet = createCabinet();
            const panels = generatePanels(cabinet);

            // Expect Top, Bottom, Left, Right, Back
            expect(panels.map(p => p.name)).toEqual(['Top', 'Bottom', 'Left', 'Right', 'Back']);
        });

        it('should calculate dimensions correctly', () => {
            /* Source Logic:
               top:    { w: width,         h: depth - 18 }
               bottom: { w: width,         h: depth - 18 }
               left:   { w: depth - 18,    h: height }
               right:  { w: depth - 18,    h: height }
               back:   { w: width,         h: height }
            */
            const cabinet = createCabinet({ width: 1000, height: 2000, depth: 600 });
            const panels = generatePanels(cabinet);

            const find = (name: string) => panels.find(p => p.name === name);

            expect(find('Top')).toMatchObject({ width: 1000, height: 600 - 18 });
            expect(find('Bottom')).toMatchObject({ width: 1000, height: 600 - 18 });
            expect(find('Left')).toMatchObject({ width: 600 - 18, height: 2000 });
            expect(find('Right')).toMatchObject({ width: 600 - 18, height: 2000 });
            expect(find('Back')).toMatchObject({ width: 1000, height: 2000 });
        });

        it('should fail over to "Apple Ply 16mm BWP" if no plywood set in basic', () => {
            const cabinet = createCabinet({ configurationMode: 'basic', shutterCount: 1, plywoodType: '' });
            const panels = generatePanels(cabinet);
            expect(panels[0].plywoodType).toBe('Apple Ply 16mm BWP');
        });

        it('should use specific back panel plywood brand if set', () => {
            const cabinet = createCabinet({
                backPanelPlywoodBrand: 'BackPly'
            });
            const panels = generatePanels(cabinet);
            const back = panels.find(p => p.name === 'Back');
            expect(back.plywoodType).toBe('BackPly');
        });
    });

    describe('Shelves', () => {
        it('should generate shelves when enabled', () => {
            const cabinet = createCabinet({
                shelvesEnabled: true,
                shelvesQuantity: 2,
                shelvesLaminateCode: 'S1'
            });
            const panels = generatePanels(cabinet);
            const shelves = panels.filter(p => p.name.startsWith('Shelf'));

            expect(shelves.length).toBe(2);
            expect(shelves[0].name).toBe('Shelf 1');
            expect(shelves[1].name).toBe('Shelf 2');
            expect(shelves[0].laminateCode).toBe('S1');

            // Check dims: W = width - 36, H = depth - 20
            expect(shelves[0].width).toBe(1000 - 36);
            expect(shelves[0].height).toBe(600 - 20);
        });

        it('should not generate shelves if qty 0', () => {
            const cabinet = createCabinet({
                shelvesEnabled: true,
                shelvesQuantity: 0
            });
            const panels = generatePanels(cabinet);
            const shelves = panels.filter(p => p.name.startsWith('Shelf'));
            expect(shelves.length).toBe(0);
        });
    });

    describe('Center Post', () => {
        it('should generate center posts when enabled', () => {
            const cabinet = createCabinet({
                centerPostEnabled: true,
                centerPostQuantity: 1,
                centerPostDepth: 50,
                centerPostHeight: 1800
            });
            const panels = generatePanels(cabinet);
            const posts = panels.filter(p => p.name.startsWith('Center Post'));

            expect(posts.length).toBe(1);
            expect(posts[0].width).toBe(50);
            expect(posts[0].height).toBe(1800);
        });
    });

    describe('Shutters (Advanced)', () => {
        it('should generate shutters from array', () => {
            const cabinet = createCabinet({
                shuttersEnabled: true,
                shutters: [
                    { width: 400, height: 1800, laminateCode: 'SL1' },
                    { width: 400, height: 1800 } // fallback to cabinet default
                ],
                shutterLaminateCode: 'DefaultL'
            });
            const panels = generatePanels(cabinet);
            const shutters = panels.filter(p => p.name.startsWith('Shutter'));

            expect(shutters.length).toBe(2);
            expect(shutters[0].name).toBe('Shutter 1');
            expect(shutters[0].laminateCode).toBe('SL1');

            expect(shutters[1].name).toBe('Shutter 2');
            expect(shutters[1].laminateCode).toBe('DefaultL');
        });
    });
});
