/**
 * Design Module - Panel Generator Unit Tests
 *
 * Layer: UNIT (Domain)
 * Scope: Pure business logic - cutlist panel generation
 * Priority: CRITICAL - Core business calculations
 */

import { describe, it, expect } from 'vitest';
import { generateModuleCutlistPanels, type ModuleCutlistPanel } from '../engine/panelGenerator';
import type { ModuleConfig } from '../engine/shapeGenerator';

// =============================================================================
// TEST FIXTURES
// =============================================================================

const createBaseConfig = (overrides?: Partial<ModuleConfig>): ModuleConfig => ({
  unitType: 'wardrobe_carcass',
  name: 'Test Wardrobe',
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
  backPanelThicknessMm: 8,
  backPanelFit: 'cut',
  backPanelDeduction: 36,
  panelsEnabled: {
    top: true,
    bottom: true,
    left: true,
    right: true,
    back: true,
  },
  ...overrides,
});

// =============================================================================
// BASIC PANEL GENERATION
// =============================================================================

describe('generateModuleCutlistPanels - wardrobe_carcass', () => {
  describe('basic carcass panels', () => {
    it('generates all 5 carcass panels when all enabled', () => {
      const config = createBaseConfig({ centerPostCount: 0 });
      const panels = generateModuleCutlistPanels(config);

      // Should have: left, right, top, bottom, back panels
      const panelNames = panels.map(p => p.name);
      expect(panelNames).toContain('Left Side');
      expect(panelNames).toContain('Right Side');
      expect(panelNames).toContain('Top');
      expect(panelNames).toContain('Bottom');
      expect(panelNames).toContain('Back Panel');
    });

    it('generates correct side panel dimensions', () => {
      const config = createBaseConfig({
        widthMm: 2400,
        heightMm: 2100,
        depthMm: 560,
        centerPostCount: 0,
      });
      const panels = generateModuleCutlistPanels(config);

      // Side panels: Depth x Height
      const leftPanel = panels.find(p => p.name === 'Left Side');
      const rightPanel = panels.find(p => p.name === 'Right Side');

      expect(leftPanel).toBeDefined();
      expect(leftPanel!.widthMm).toBe(560); // Depth
      expect(leftPanel!.heightMm).toBe(2100); // Height

      expect(rightPanel).toBeDefined();
      expect(rightPanel!.widthMm).toBe(560);
      expect(rightPanel!.heightMm).toBe(2100);
    });

    it('generates correct top/bottom panel dimensions', () => {
      const config = createBaseConfig({
        widthMm: 2400,
        heightMm: 2100,
        depthMm: 560,
        carcassThicknessMm: 18,
        centerPostCount: 0,
      });
      const panels = generateModuleCutlistPanels(config);

      // Top/bottom panels: (Width - 2*Thickness) x Depth
      const topPanel = panels.find(p => p.name === 'Top');
      const bottomPanel = panels.find(p => p.name === 'Bottom');

      const expectedWidth = 2400 - 2 * 18; // 2364

      expect(topPanel).toBeDefined();
      expect(topPanel!.widthMm).toBe(expectedWidth);
      expect(topPanel!.heightMm).toBe(560);

      expect(bottomPanel).toBeDefined();
      expect(bottomPanel!.widthMm).toBe(expectedWidth);
      expect(bottomPanel!.heightMm).toBe(560);
    });
  });

  // ===========================================================================
  // CENTER POSTS
  // ===========================================================================

  describe('center posts', () => {
    it('generates no center posts when count is 0', () => {
      const config = createBaseConfig({ centerPostCount: 0 });
      const panels = generateModuleCutlistPanels(config);

      const posts = panels.filter(p => p.name.includes('Center Post'));
      expect(posts.length).toBe(0);
    });

    it('generates center post panel when count > 0', () => {
      const config = createBaseConfig({ centerPostCount: 2 });
      const panels = generateModuleCutlistPanels(config);

      const posts = panels.filter(p => p.name.includes('Center Post'));
      expect(posts.length).toBe(1); // Single panel entry with qty=2
      expect(posts[0].qty).toBe(2);
    });

    it('generates center posts with correct dimensions', () => {
      const config = createBaseConfig({
        widthMm: 2400,
        heightMm: 2100,
        depthMm: 560,
        carcassThicknessMm: 18,
        centerPostCount: 1,
      });
      const panels = generateModuleCutlistPanels(config);

      const post = panels.find(p => p.name.includes('Center Post'));
      expect(post).toBeDefined();

      // Center post: Depth x (Height - 2*Thickness)
      expect(post!.widthMm).toBe(560);
      expect(post!.heightMm).toBe(2100 - 2 * 18); // 2064
    });

    it('generates correct quantity for 3 posts', () => {
      const config = createBaseConfig({ centerPostCount: 3 });
      const panels = generateModuleCutlistPanels(config);

      const post = panels.find(p => p.name.includes('Center Post'));
      expect(post).toBeDefined();
      expect(post!.qty).toBe(3);
    });
  });

  // ===========================================================================
  // BACK PANELS
  // ===========================================================================

  describe('back panels', () => {
    it('generates single back panel when no center posts', () => {
      const config = createBaseConfig({
        centerPostCount: 0,
        panelsEnabled: {
          top: true,
          bottom: true,
          left: true,
          right: true,
          back: true,
        },
      });
      const panels = generateModuleCutlistPanels(config);

      const backPanels = panels.filter(p => p.name.includes('Back'));
      expect(backPanels.length).toBe(1);
    });

    it('divides back panel by center posts', () => {
      const config = createBaseConfig({
        centerPostCount: 2,
        panelsEnabled: {
          top: true,
          bottom: true,
          left: true,
          right: true,
          back: true,
        },
      });
      const panels = generateModuleCutlistPanels(config);

      // With 2 center posts, should have 3 back panels (grouped with qty)
      const backPanels = panels.filter(p => p.name.includes('Back'));
      expect(backPanels.length).toBe(1); // Single entry
      expect(backPanels[0]!.qty).toBe(3); // With qty of 3
    });

    it('applies deduction to back panel dimensions', () => {
      const config = createBaseConfig({
        widthMm: 2400,
        heightMm: 2100,
        centerPostCount: 0,
        backPanelDeduction: 36,
        panelsEnabled: {
          top: true,
          bottom: true,
          left: true,
          right: true,
          back: true,
        },
      });
      const panels = generateModuleCutlistPanels(config);

      const backPanel = panels.find(p => p.name.includes('Back'));
      expect(backPanel).toBeDefined();

      // Back panel width: W - leftDeduction - rightDeduction = 2400 - 36 - 36 = 2328
      expect(backPanel!.widthMm).toBe(2400 - 36 * 2);
    });

    it('skips back panels when back is disabled', () => {
      const config = createBaseConfig({
        centerPostCount: 2,
        panelsEnabled: {
          top: true,
          bottom: true,
          left: true,
          right: true,
          back: false, // Disabled
        },
      });
      const panels = generateModuleCutlistPanels(config);

      const backPanels = panels.filter(p => p.name.includes('Back'));
      expect(backPanels.length).toBe(0);
    });
  });

  // ===========================================================================
  // PANEL ENABLE/DISABLE
  // ===========================================================================

  describe('panel enable/disable', () => {
    it('skips left panel when disabled', () => {
      const config = createBaseConfig({
        centerPostCount: 0,
        panelsEnabled: {
          top: true,
          bottom: true,
          left: false,
          right: true,
          back: true,
        },
      });
      const panels = generateModuleCutlistPanels(config);

      const leftPanel = panels.find(p => p.name === 'Left Side');
      expect(leftPanel).toBeUndefined();
    });

    it('skips right panel when disabled', () => {
      const config = createBaseConfig({
        centerPostCount: 0,
        panelsEnabled: {
          top: true,
          bottom: true,
          left: true,
          right: false,
          back: true,
        },
      });
      const panels = generateModuleCutlistPanels(config);

      const rightPanel = panels.find(p => p.name === 'Right Side');
      expect(rightPanel).toBeUndefined();
    });

    it('skips top panel when disabled', () => {
      const config = createBaseConfig({
        centerPostCount: 0,
        panelsEnabled: {
          top: false,
          bottom: true,
          left: true,
          right: true,
          back: true,
        },
      });
      const panels = generateModuleCutlistPanels(config);

      const topPanel = panels.find(p => p.name === 'Top');
      expect(topPanel).toBeUndefined();
    });

    it('skips bottom panel when disabled', () => {
      const config = createBaseConfig({
        centerPostCount: 0,
        panelsEnabled: {
          top: true,
          bottom: false,
          left: true,
          right: true,
          back: true,
        },
      });
      const panels = generateModuleCutlistPanels(config);

      const bottomPanel = panels.find(p => p.name === 'Bottom');
      expect(bottomPanel).toBeUndefined();
    });

    it('adjusts back panel deduction when side panels disabled', () => {
      const config = createBaseConfig({
        widthMm: 2400,
        heightMm: 2100,
        centerPostCount: 0,
        backPanelDeduction: 36,
        panelsEnabled: {
          top: true,
          bottom: true,
          left: false, // No left panel
          right: true,
          back: true,
        },
      });
      const panels = generateModuleCutlistPanels(config);

      const backPanel = panels.find(p => p.name.includes('Back'));
      expect(backPanel).toBeDefined();

      // With left disabled: no left deduction
      // Width = W - rightDeduction = 2400 - 36 = 2364
      expect(backPanel!.widthMm).toBe(2400 - 36);
    });
  });

  // ===========================================================================
  // PANEL PROPERTIES
  // ===========================================================================

  describe('panel properties', () => {
    it('sets correct material type', () => {
      const config = createBaseConfig({
        carcassMaterial: 'plywood',
        centerPostCount: 0,
      });
      const panels = generateModuleCutlistPanels(config);

      const leftPanel = panels.find(p => p.name === 'Left Side');
      expect(leftPanel!.material).toBe('plywood');
    });

    it('sets correct thickness for carcass panels', () => {
      const config = createBaseConfig({
        carcassThicknessMm: 18,
        centerPostCount: 0,
      });
      const panels = generateModuleCutlistPanels(config);

      const leftPanel = panels.find(p => p.name === 'Left Side');
      expect(leftPanel!.thicknessMm).toBe(18);
    });

    it('sets correct thickness for back panels', () => {
      const config = createBaseConfig({
        backPanelThicknessMm: 8,
        centerPostCount: 0,
      });
      const panels = generateModuleCutlistPanels(config);

      const backPanel = panels.find(p => p.name.includes('Back'));
      expect(backPanel!.thicknessMm).toBe(8);
    });

    it('sets quantity to 1 for each unique panel', () => {
      const config = createBaseConfig({ centerPostCount: 0 });
      const panels = generateModuleCutlistPanels(config);

      // Each unique panel should have qty=1 (center posts are aggregated)
      const carcassPanels = panels.filter(p => p.panelType === 'carcass');
      carcassPanels.forEach(panel => {
        expect(panel.qty).toBe(1);
      });
    });

    it('sets panel type correctly', () => {
      const config = createBaseConfig({ centerPostCount: 1 });
      const panels = generateModuleCutlistPanels(config);

      const leftPanel = panels.find(p => p.name === 'Left Side');
      const backPanel = panels.find(p => p.name.includes('Back'));
      const postPanel = panels.find(p => p.name.includes('Center Post'));

      expect(leftPanel!.panelType).toBe('carcass');
      expect(backPanel!.panelType).toBe('back');
      expect(postPanel!.panelType).toBe('partition');
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('edge cases', () => {
    it('handles minimum dimensions', () => {
      const config = createBaseConfig({
        widthMm: 300,
        heightMm: 500,
        depthMm: 200,
        centerPostCount: 0,
      });
      const panels = generateModuleCutlistPanels(config);

      expect(panels.length).toBeGreaterThan(0);
      // Verify no negative dimensions
      panels.forEach(panel => {
        expect(panel.widthMm).toBeGreaterThan(0);
        expect(panel.heightMm).toBeGreaterThan(0);
      });
    });

    it('handles all panels disabled gracefully', () => {
      const config = createBaseConfig({
        centerPostCount: 2,
        panelsEnabled: {
          top: false,
          bottom: false,
          left: false,
          right: false,
          back: false,
        },
      });
      const panels = generateModuleCutlistPanels(config);

      // Only center posts should remain
      expect(panels.every(p => p.name.includes('Center Post'))).toBe(true);
    });

    it('handles large center post count', () => {
      const config = createBaseConfig({
        widthMm: 4800,
        centerPostCount: 5,
      });
      const panels = generateModuleCutlistPanels(config);

      const posts = panels.find(p => p.name.includes('Center Post'));
      expect(posts).toBeDefined();
      expect(posts!.qty).toBe(5);

      // 5 posts = 6 sections (grouped with qty)
      const backPanels = panels.filter(p => p.name.includes('Back'));
      expect(backPanels.length).toBe(1); // Single entry
      expect(backPanels[0]!.qty).toBe(6); // With qty of 6
    });

    it('handles zero deduction', () => {
      const config = createBaseConfig({
        backPanelDeduction: 0,
        centerPostCount: 0,
      });
      const panels = generateModuleCutlistPanels(config);

      const backPanel = panels.find(p => p.name.includes('Back'));
      expect(backPanel!.widthMm).toBe(2400); // Full width
    });

    it('handles default panelsEnabled (undefined)', () => {
      const config: ModuleConfig = {
        ...createBaseConfig(),
        panelsEnabled: undefined,
      };
      const panels = generateModuleCutlistPanels(config);

      // Should default to all enabled
      const panelNames = panels.map(p => p.name);
      expect(panelNames).toContain('Left Side');
      expect(panelNames).toContain('Right Side');
      expect(panelNames).toContain('Top');
      expect(panelNames).toContain('Bottom');
    });
  });

  // ===========================================================================
  // CALCULATION ACCURACY
  // ===========================================================================

  describe('calculation accuracy', () => {
    it('ensures total material usage matches expected', () => {
      const config = createBaseConfig({
        widthMm: 2400,
        heightMm: 2100,
        depthMm: 560,
        carcassThicknessMm: 18,
        centerPostCount: 0,
        backPanelDeduction: 0,
      });
      const panels = generateModuleCutlistPanels(config);

      // Calculate expected areas
      const T = 18;
      const D = 560;
      const W = 2400;
      const H = 2100;

      // Verify side panels
      const leftPanel = panels.find(p => p.name === 'Left Side')!;
      const rightPanel = panels.find(p => p.name === 'Right Side')!;
      expect(leftPanel.widthMm * leftPanel.heightMm).toBe(D * H);
      expect(rightPanel.widthMm * rightPanel.heightMm).toBe(D * H);

      // Verify top/bottom
      const topPanel = panels.find(p => p.name === 'Top')!;
      const bottomPanel = panels.find(p => p.name === 'Bottom')!;
      expect(topPanel.widthMm * topPanel.heightMm).toBe((W - 2 * T) * D);
      expect(bottomPanel.widthMm * bottomPanel.heightMm).toBe((W - 2 * T) * D);
    });

    it('calculates section widths correctly for center posts', () => {
      const config = createBaseConfig({
        widthMm: 2400,
        carcassThicknessMm: 18,
        centerPostCount: 2,
        backPanelDeduction: 36,
      });
      const panels = generateModuleCutlistPanels(config);

      const backPanels = panels.filter(p => p.name.includes('Back'));

      // With 2 posts, 3 sections (grouped with qty)
      // Total back width = W - 2*deduction = 2400 - 72 = 2328
      // Each section = 2328 / 3 = 776mm
      expect(backPanels.length).toBe(1);
      expect(backPanels[0]!.qty).toBe(3);
      const totalBackWidth = backPanels.reduce((sum, p) => sum + p.widthMm * p.qty, 0);
      expect(totalBackWidth).toBeCloseTo(2328, 0);
    });
  });
});
