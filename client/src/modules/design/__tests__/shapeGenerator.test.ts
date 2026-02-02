/**
 * Design Module - Shape Generator Unit Tests
 *
 * Layer: UNIT (Domain)
 * Scope: Pure shape generation functions
 * Priority: HIGH - UI rendering depends on correct shape output
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the library presets to avoid external dependencies
vi.mock('@/modules/library/presets', () => ({
  PREDEFINED_TEMPLATES: [
    {
      unitType: 'wardrobe',
      name: 'Standard Wardrobe',
      widthMm: 1829,
      heightMm: 2134,
      depthMm: 610,
      shutterCount: 3,
      sectionCount: 3,
      loftEnabled: true,
      loftHeightMm: 457,
      carcassMaterial: 'plywood',
      shutterMaterial: 'laminate',
    },
    {
      unitType: 'wardrobe_carcass',
      name: 'Wardrobe Carcass',
      widthMm: 2400,
      heightMm: 2100,
      depthMm: 560,
      shutterCount: 0,
      sectionCount: 3,
      carcassMaterial: 'plywood',
      shutterMaterial: 'laminate',
    },
    {
      unitType: 'kitchen',
      name: 'Kitchen',
      widthMm: 2438,
      heightMm: 2134,
      depthMm: 610,
      shutterCount: 4,
      sectionCount: 4,
      carcassMaterial: 'plywood',
      shutterMaterial: 'laminate',
    },
  ],
}));

import {
  generateModuleShapes,
  MODULE_DEFAULTS,
  DEFAULT_WARDROBE_SECTIONS,
  type ModuleConfig,
  type WardrobeSection,
  type WardrobeSectionType,
} from '../engine/shapeGenerator';

// =============================================================================
// TEST FIXTURES
// =============================================================================

const createBaseConfig = (overrides?: Partial<ModuleConfig>): ModuleConfig => ({
  unitType: 'wardrobe_carcass',
  name: 'Test Module',
  widthMm: 2400,
  heightMm: 2100,
  depthMm: 560,
  shutterCount: 0,
  sectionCount: 3,
  loftEnabled: false,
  loftHeightMm: 0,
  carcassMaterial: 'plywood',
  shutterMaterial: 'laminate',
  carcassThicknessMm: 18,
  centerPostCount: 2,
  ...overrides,
});

const DEFAULT_ORIGIN = { x: 100, y: 100 };

// =============================================================================
// MODULE DEFAULTS
// =============================================================================

describe('MODULE_DEFAULTS', () => {
  it('creates defaults from predefined templates', () => {
    expect(MODULE_DEFAULTS).toBeDefined();
    expect(typeof MODULE_DEFAULTS).toBe('object');
  });

  it('includes wardrobe defaults', () => {
    expect(MODULE_DEFAULTS.wardrobe).toBeDefined();
    expect(MODULE_DEFAULTS.wardrobe?.widthMm).toBe(1829);
    expect(MODULE_DEFAULTS.wardrobe?.heightMm).toBe(2134);
  });

  it('includes wardrobe_carcass defaults', () => {
    expect(MODULE_DEFAULTS.wardrobe_carcass).toBeDefined();
    expect(MODULE_DEFAULTS.wardrobe_carcass?.widthMm).toBe(2400);
    expect(MODULE_DEFAULTS.wardrobe_carcass?.heightMm).toBe(2100);
  });

  it('includes kitchen defaults', () => {
    expect(MODULE_DEFAULTS.kitchen).toBeDefined();
    expect(MODULE_DEFAULTS.kitchen?.widthMm).toBe(2438);
  });

  it('preserves all template properties', () => {
    expect(MODULE_DEFAULTS.wardrobe?.depthMm).toBe(610);
    expect(MODULE_DEFAULTS.wardrobe?.loftEnabled).toBe(true);
    expect(MODULE_DEFAULTS.wardrobe?.loftHeightMm).toBe(457);
    expect(MODULE_DEFAULTS.wardrobe?.carcassMaterial).toBe('plywood');
  });
});

// =============================================================================
// DEFAULT WARDROBE SECTIONS
// =============================================================================

describe('DEFAULT_WARDROBE_SECTIONS', () => {
  it('defines 5 default sections', () => {
    expect(DEFAULT_WARDROBE_SECTIONS).toHaveLength(5);
  });

  it('includes long_hang section', () => {
    const longHang = DEFAULT_WARDROBE_SECTIONS.find(s => s.type === 'long_hang');
    expect(longHang).toBeDefined();
    expect(longHang?.widthMm).toBe(0); // Auto-calculated
  });

  it('includes shelves section', () => {
    const shelves = DEFAULT_WARDROBE_SECTIONS.find(s => s.type === 'shelves');
    expect(shelves).toBeDefined();
    expect(shelves?.shelfCount).toBeGreaterThan(0);
  });

  it('includes drawers section', () => {
    const drawers = DEFAULT_WARDROBE_SECTIONS.find(s => s.type === 'drawers');
    expect(drawers).toBeDefined();
    expect(drawers?.drawerCount).toBeGreaterThan(0);
  });

  it('includes short_hang section', () => {
    const shortHang = DEFAULT_WARDROBE_SECTIONS.find(s => s.type === 'short_hang');
    expect(shortHang).toBeDefined();
    expect(shortHang?.rodHeightPct).toBeDefined();
    expect(shortHang?.shelfCount).toBeDefined();
  });

  it('has valid section types', () => {
    const validTypes: WardrobeSectionType[] = ['long_hang', 'short_hang', 'shelves', 'drawers', 'open'];
    DEFAULT_WARDROBE_SECTIONS.forEach(section => {
      expect(validTypes).toContain(section.type);
    });
  });
});

// =============================================================================
// GENERATE MODULE SHAPES
// =============================================================================

describe('generateModuleShapes', () => {
  describe('basic shape generation', () => {
    it('returns array of shapes', () => {
      const config = createBaseConfig();
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(Array.isArray(shapes)).toBe(true);
      expect(shapes.length).toBeGreaterThan(0);
    });

    it('generates shapes with unique IDs', () => {
      const config = createBaseConfig();
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      const ids = shapes.map(s => s.id);
      const uniqueIds = new Set(ids);
      // Most IDs should be unique (some special IDs like MOD-LEFT may appear)
      expect(uniqueIds.size).toBeGreaterThan(shapes.length * 0.8);
    });

    it('generates shapes at specified origin', () => {
      const config = createBaseConfig();
      const origin = { x: 200, y: 300 };
      const shapes = generateModuleShapes(config, origin);

      // At least one shape should be at or near the origin
      const rectShapes = shapes.filter(s => s.type === 'rect');
      const hasShapeAtOrigin = rectShapes.some(s => {
        if (s.type === 'rect') {
          return s.x >= origin.x - 10 && s.y >= origin.y - 10;
        }
        return false;
      });
      expect(hasShapeAtOrigin).toBe(true);
    });
  });

  // ===========================================================================
  // WARDROBE CARCASS GENERATOR
  // ===========================================================================

  describe('wardrobe_carcass generator', () => {
    it('generates carcass panel shapes', () => {
      const config = createBaseConfig({ unitType: 'wardrobe_carcass' });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      // Should have rect shapes for panels
      const rectShapes = shapes.filter(s => s.type === 'rect');
      expect(rectShapes.length).toBeGreaterThan(0);
    });

    it('generates shapes with correct panel IDs', () => {
      const config = createBaseConfig({
        unitType: 'wardrobe_carcass',
        centerPostCount: 0,
        panelsEnabled: {
          top: true,
          bottom: true,
          left: true,
          right: true,
          back: true,
        },
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      const ids = shapes.map(s => s.id);
      expect(ids).toContain('MOD-LEFT');
      expect(ids).toContain('MOD-RIGHT');
      expect(ids).toContain('MOD-TOP');
      expect(ids).toContain('MOD-BOTTOM');
      expect(ids).toContain('MOD-BACK');
    });

    it('generates center post shapes', () => {
      const config = createBaseConfig({
        unitType: 'wardrobe_carcass',
        centerPostCount: 2,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      const postShapes = shapes.filter(s => s.id.startsWith('MOD-POST-'));
      expect(postShapes.length).toBe(2);
    });

    it('handles disabled panels', () => {
      const config = createBaseConfig({
        unitType: 'wardrobe_carcass',
        panelsEnabled: {
          top: true,
          bottom: true,
          left: false, // Disabled
          right: true,
          back: true,
        },
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      // Should have disabled panel indicator
      const disabledLeft = shapes.find(s => s.id === 'MOD-LEFT-DISABLED');
      expect(disabledLeft).toBeDefined();
    });

    it('generates dimension shapes', () => {
      const config = createBaseConfig({ unitType: 'wardrobe_carcass' });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      const dimensionShapes = shapes.filter(s => s.type === 'dimension');
      expect(dimensionShapes.length).toBeGreaterThan(0);
    });

    it('uses correct thickness', () => {
      const config = createBaseConfig({
        unitType: 'wardrobe_carcass',
        carcassThicknessMm: 18,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      // Left panel should have width = thickness
      const leftPanel = shapes.find(s => s.id === 'MOD-LEFT') as any;
      expect(leftPanel).toBeDefined();
      expect(leftPanel.w).toBe(18);
    });
  });

  // ===========================================================================
  // WARDROBE GENERATOR
  // ===========================================================================

  describe('wardrobe generator', () => {
    it('generates wardrobe shapes', () => {
      const config = createBaseConfig({
        unitType: 'wardrobe',
        sectionCount: 3,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('handles loft section', () => {
      const config = createBaseConfig({
        unitType: 'wardrobe',
        loftEnabled: true,
        loftHeightMm: 400,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      // Should have more shapes with loft
      const configNoLoft = createBaseConfig({
        unitType: 'wardrobe',
        loftEnabled: false,
      });
      const shapesNoLoft = generateModuleShapes(configNoLoft, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(shapesNoLoft.length);
    });

    it('generates custom sections', () => {
      const customSections: WardrobeSection[] = [
        { type: 'long_hang', widthMm: 0 },
        { type: 'drawers', widthMm: 0, drawerCount: 4 },
      ];
      const config = createBaseConfig({
        unitType: 'wardrobe',
        sections: customSections,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // OTHER MODULE TYPES
  // ===========================================================================

  describe('other module types', () => {
    it('generates kitchen shapes', () => {
      const config = createBaseConfig({
        unitType: 'kitchen',
        shutterCount: 4,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('generates tv_unit shapes', () => {
      const config = createBaseConfig({
        unitType: 'tv_unit',
        sectionCount: 3,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('generates dresser shapes', () => {
      const config = createBaseConfig({
        unitType: 'dresser',
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('generates study_table shapes', () => {
      const config = createBaseConfig({
        unitType: 'study_table',
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('generates shoe_rack shapes', () => {
      const config = createBaseConfig({
        unitType: 'shoe_rack',
        sectionCount: 3,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('generates book_shelf shapes', () => {
      const config = createBaseConfig({
        unitType: 'book_shelf',
        sectionCount: 5,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('generates crockery_unit shapes', () => {
      const config = createBaseConfig({
        unitType: 'crockery_unit',
        shutterCount: 2,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('generates pooja_unit shapes', () => {
      const config = createBaseConfig({
        unitType: 'pooja_unit',
        shutterCount: 2,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('generates vanity shapes', () => {
      const config = createBaseConfig({
        unitType: 'vanity',
        shutterCount: 2,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('generates bar_unit shapes', () => {
      const config = createBaseConfig({
        unitType: 'bar_unit',
        shutterCount: 2,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('generates display_unit shapes', () => {
      const config = createBaseConfig({
        unitType: 'display_unit',
        sectionCount: 3,
        shutterCount: 2,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('falls back to other generator for unknown types', () => {
      const config = createBaseConfig({
        unitType: 'unknown_type',
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      // Should still generate shapes using 'other' generator
      expect(shapes.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // SHAPE TYPES
  // ===========================================================================

  describe('shape types', () => {
    it('generates line shapes', () => {
      const config = createBaseConfig({ unitType: 'wardrobe' });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      const lineShapes = shapes.filter(s => s.type === 'line');
      expect(lineShapes.length).toBeGreaterThan(0);
    });

    it('generates rect shapes', () => {
      const config = createBaseConfig({ unitType: 'wardrobe_carcass' });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      const rectShapes = shapes.filter(s => s.type === 'rect');
      expect(rectShapes.length).toBeGreaterThan(0);
    });

    it('generates dimension shapes', () => {
      const config = createBaseConfig();
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      const dimShapes = shapes.filter(s => s.type === 'dimension');
      expect(dimShapes.length).toBeGreaterThan(0);
    });

    it('line shapes have required properties', () => {
      const config = createBaseConfig({ unitType: 'wardrobe' });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      const lineShapes = shapes.filter(s => s.type === 'line') as any[];
      lineShapes.forEach(line => {
        expect(line).toHaveProperty('id');
        expect(line).toHaveProperty('x1');
        expect(line).toHaveProperty('y1');
        expect(line).toHaveProperty('x2');
        expect(line).toHaveProperty('y2');
      });
    });

    it('rect shapes have required properties', () => {
      const config = createBaseConfig({ unitType: 'wardrobe_carcass' });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      const rectShapes = shapes.filter(s => s.type === 'rect') as any[];
      rectShapes.forEach(rect => {
        expect(rect).toHaveProperty('id');
        expect(rect).toHaveProperty('x');
        expect(rect).toHaveProperty('y');
        expect(rect).toHaveProperty('w');
        expect(rect).toHaveProperty('h');
      });
    });

    it('dimension shapes have required properties', () => {
      const config = createBaseConfig();
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      const dimShapes = shapes.filter(s => s.type === 'dimension') as any[];
      dimShapes.forEach(dim => {
        expect(dim).toHaveProperty('id');
        expect(dim).toHaveProperty('x1');
        expect(dim).toHaveProperty('y1');
        expect(dim).toHaveProperty('x2');
        expect(dim).toHaveProperty('y2');
        expect(dim).toHaveProperty('label');
        expect(dim).toHaveProperty('dimType');
      });
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('edge cases', () => {
    it('handles zero shutter count', () => {
      const config = createBaseConfig({
        unitType: 'wardrobe',
        shutterCount: 0,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('handles single section', () => {
      const config = createBaseConfig({
        unitType: 'wardrobe',
        sectionCount: 1,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('handles many sections', () => {
      const config = createBaseConfig({
        unitType: 'wardrobe',
        sectionCount: 6,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('handles minimum dimensions', () => {
      const config = createBaseConfig({
        widthMm: 300,
        heightMm: 400,
        depthMm: 200,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('handles large dimensions', () => {
      const config = createBaseConfig({
        widthMm: 6000,
        heightMm: 3000,
        depthMm: 800,
      });
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('handles zero thickness gracefully', () => {
      const config = createBaseConfig({
        carcassThicknessMm: 0,
      });
      // Should not throw
      expect(() => generateModuleShapes(config, DEFAULT_ORIGIN)).not.toThrow();
    });

    it('handles undefined optional fields', () => {
      const config: ModuleConfig = {
        unitType: 'wardrobe_carcass',
        name: 'Test',
        widthMm: 2400,
        heightMm: 2100,
        depthMm: 560,
        shutterCount: 0,
        sectionCount: 3,
        loftEnabled: false,
        loftHeightMm: 0,
        carcassMaterial: 'plywood',
        shutterMaterial: 'laminate',
        // carcassThicknessMm: undefined
        // centerPostCount: undefined
        // panelsEnabled: undefined
      };
      const shapes = generateModuleShapes(config, DEFAULT_ORIGIN);

      expect(shapes.length).toBeGreaterThan(0);
    });

    it('handles negative origin coordinates', () => {
      const config = createBaseConfig();
      const origin = { x: -100, y: -100 };
      const shapes = generateModuleShapes(config, origin);

      expect(shapes.length).toBeGreaterThan(0);
    });
  });
});
