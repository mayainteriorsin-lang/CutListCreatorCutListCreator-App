import { describe, it, expect, beforeEach } from 'vitest';
import { prepareStandardParts } from '../dimensional-mapping';
import type { Panel } from '../../cutlist/core/types';

// ============================================================
// UNIT TESTS: Dimensional Mapping & Wood Grain Rules
// CRITICAL: These tests enforce wood grain rotation constraints
// and panel axis mapping for the optimizer.
// ============================================================

describe('prepareStandardParts', () => {
  describe('panel type detection', () => {
    it('detects TOP panel', () => {
      const panels: Panel[] = [{ id: '1', name: 'Cabinet - Top', nomW: 564, nomH: 450 }];
      const parts = prepareStandardParts(panels);
      expect(parts[0].panelType).toBe('TOP');
    });

    it('detects BOTTOM panel', () => {
      const panels: Panel[] = [{ id: '1', name: 'Cabinet - Bottom', nomW: 564, nomH: 450 }];
      const parts = prepareStandardParts(panels);
      expect(parts[0].panelType).toBe('BOTTOM');
    });

    it('detects LEFT panel', () => {
      const panels: Panel[] = [{ id: '1', name: 'Cabinet - Left', nomW: 450, nomH: 800 }];
      const parts = prepareStandardParts(panels);
      expect(parts[0].panelType).toBe('LEFT');
    });

    it('detects RIGHT panel', () => {
      const panels: Panel[] = [{ id: '1', name: 'Cabinet - Right', nomW: 450, nomH: 800 }];
      const parts = prepareStandardParts(panels);
      expect(parts[0].panelType).toBe('RIGHT');
    });

    it('detects BACK panel', () => {
      const panels: Panel[] = [{ id: '1', name: 'Cabinet - Back', nomW: 564, nomH: 800 }];
      const parts = prepareStandardParts(panels);
      expect(parts[0].panelType).toBe('BACK');
    });

    it('detects SHUTTER panel with number', () => {
      const panels: Panel[] = [{ id: '1', name: 'Cabinet - Shutter 1', nomW: 282, nomH: 800 }];
      const parts = prepareStandardParts(panels);
      expect(parts[0].panelType).toBe('SHUTTER');
      expect(parts[0].shutterLabel).toBe('SHUTTER 1');
    });

    it('detects CENTER_POST panel', () => {
      const panels: Panel[] = [{ id: '1', name: 'Cabinet - Center Post', nomW: 50, nomH: 800 }];
      const parts = prepareStandardParts(panels);
      expect(parts[0].panelType).toBe('CENTER_POST');
    });

    it('detects SHELF panel', () => {
      const panels: Panel[] = [{ id: '1', name: 'Cabinet - Shelf', nomW: 564, nomH: 450 }];
      const parts = prepareStandardParts(panels);
      expect(parts[0].panelType).toBe('SHELF');
    });

    it('defaults to PANEL for unknown types', () => {
      const panels: Panel[] = [{ id: '1', name: 'Custom Part', nomW: 100, nomH: 200 }];
      const parts = prepareStandardParts(panels);
      expect(parts[0].panelType).toBe('PANEL');
    });

    it('prioritizes specific types over shutter (Shutter #1 - Top → TOP)', () => {
      const panels: Panel[] = [{ id: '1', name: 'Shutter #1 - Top', nomW: 564, nomH: 450 }];
      const parts = prepareStandardParts(panels);
      expect(parts[0].panelType).toBe('TOP');
    });
  });

  describe('axis mapping', () => {
    it('TOP/BOTTOM: nomW→Y, nomH→X (width to vertical, depth to horizontal)', () => {
      const panels: Panel[] = [{ id: '1', name: 'Cabinet - Top', nomW: 564, nomH: 450 }];
      const parts = prepareStandardParts(panels);
      // TOP: x = nomH (depth), y = nomW (width)
      expect(parts[0].w).toBe(450);   // depth → X
      expect(parts[0].h).toBe(564);   // width → Y
    });

    it('LEFT/RIGHT: nomW→X, nomH→Y (depth to horizontal, height to vertical)', () => {
      const panels: Panel[] = [{ id: '1', name: 'Cabinet - Left', nomW: 450, nomH: 800 }];
      const parts = prepareStandardParts(panels);
      expect(parts[0].w).toBe(450);   // depth → X
      expect(parts[0].h).toBe(800);   // height → Y
    });

    it('BACK: nomW→X, nomH→Y (width to horizontal, height to vertical)', () => {
      const panels: Panel[] = [{ id: '1', name: 'Cabinet - Back', nomW: 564, nomH: 800 }];
      const parts = prepareStandardParts(panels);
      expect(parts[0].w).toBe(564);   // width → X
      expect(parts[0].h).toBe(800);   // height → Y
    });

    it('preserves original nomW/nomH for display', () => {
      const panels: Panel[] = [{ id: '1', name: 'Cabinet - Top', nomW: 564, nomH: 450 }];
      const parts = prepareStandardParts(panels);
      expect(parts[0].nomW).toBe(564);
      expect(parts[0].nomH).toBe(450);
    });
  });

  describe('wood grain rotation rules', () => {
    it('locks rotation when wood grain preference exists for laminate', () => {
      const panels: Panel[] = [
        { id: '1', name: 'Cabinet - Top', nomW: 564, nomH: 450, laminateCode: 'WG100' }
      ];
      const woodGrains = { 'WG100': true };
      const parts = prepareStandardParts(panels, woodGrains);
      expect(parts[0].rotate).toBe(false);  // LOCKED — no rotation
      expect(parts[0].woodGrainsEnabled).toBe(true);
    });

    it('allows rotation when no wood grain preference', () => {
      const panels: Panel[] = [
        { id: '1', name: 'Cabinet - Top', nomW: 564, nomH: 450, laminateCode: 'PLAIN' }
      ];
      const parts = prepareStandardParts(panels, {});
      expect(parts[0].rotate).toBe(true);  // UNLOCKED — rotation allowed
      expect(parts[0].woodGrainsEnabled).toBe(false);
    });

    it('locks rotation when panel has grainDirection=true', () => {
      const panels: Panel[] = [
        { id: '1', name: 'Cabinet - Left', nomW: 450, nomH: 800, laminateCode: 'L1', grainDirection: true } as any
      ];
      const parts = prepareStandardParts(panels, {});
      expect(parts[0].rotate).toBe(false);
    });

    it('uses front code (before +) for wood grain lookup', () => {
      const panels: Panel[] = [
        { id: '1', name: 'Cabinet - Top', nomW: 564, nomH: 450, laminateCode: 'WG100 + Backer' }
      ];
      const woodGrains = { 'WG100': true };
      const parts = prepareStandardParts(panels, woodGrains);
      expect(parts[0].rotate).toBe(false);
    });
  });

  describe('gaddi flag', () => {
    it('preserves gaddi=true', () => {
      const panels: Panel[] = [
        { id: '1', name: 'Cabinet - Top', nomW: 564, nomH: 450, gaddi: true }
      ];
      const parts = prepareStandardParts(panels);
      expect(parts[0].gaddi).toBe(true);
    });

    it('defaults gaddi to false', () => {
      const panels: Panel[] = [
        { id: '1', name: 'Cabinet - Top', nomW: 564, nomH: 450 }
      ];
      const parts = prepareStandardParts(panels);
      expect(parts[0].gaddi).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('skips panels with 0x0 dimensions', () => {
      const panels: Panel[] = [
        { id: '1', name: 'Empty', nomW: 0, nomH: 0 }
      ];
      const parts = prepareStandardParts(panels);
      expect(parts).toHaveLength(0);
    });

    it('handles missing name gracefully', () => {
      const panels: Panel[] = [
        { id: '1', nomW: 100, nomH: 200 } as any
      ];
      const parts = prepareStandardParts(panels);
      expect(parts).toHaveLength(1);
    });

    it('generates unique IDs per panel', () => {
      const panels: Panel[] = [
        { id: 'a', name: 'Cabinet - Top', nomW: 564, nomH: 450 },
        { id: 'b', name: 'Cabinet - Top', nomW: 564, nomH: 450 }
      ];
      const parts = prepareStandardParts(panels);
      expect(parts[0].id).not.toBe(parts[1].id);
    });

    it('preserves laminate code', () => {
      const panels: Panel[] = [
        { id: '1', name: 'Cabinet - Top', nomW: 564, nomH: 450, laminateCode: 'SF 123 + Backer' }
      ];
      const parts = prepareStandardParts(panels);
      expect(parts[0].laminateCode).toBe('SF 123 + Backer');
    });

    it('handles multiple panels of different types', () => {
      const panels: Panel[] = [
        { id: '1', name: 'Cabinet - Top', nomW: 564, nomH: 450 },
        { id: '2', name: 'Cabinet - Bottom', nomW: 564, nomH: 450 },
        { id: '3', name: 'Cabinet - Left', nomW: 450, nomH: 800 },
        { id: '4', name: 'Cabinet - Right', nomW: 450, nomH: 800 },
        { id: '5', name: 'Cabinet - Back', nomW: 564, nomH: 800 },
        { id: '6', name: 'Cabinet - Shutter 1', nomW: 282, nomH: 800 },
      ];
      const parts = prepareStandardParts(panels);
      expect(parts).toHaveLength(6);
      expect(parts.map(p => p.panelType)).toEqual(['TOP', 'BOTTOM', 'LEFT', 'RIGHT', 'BACK', 'SHUTTER']);
    });
  });
});
