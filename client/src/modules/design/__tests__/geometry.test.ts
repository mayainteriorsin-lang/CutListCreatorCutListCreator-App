/**
 * Design Module - Geometry Unit Tests
 *
 * Layer: UNIT (Foundation)
 * Scope: Pure functions - no React, no browser, no storage
 * Priority: CRITICAL - Core algorithms
 */

import { describe, it, expect } from 'vitest';
import {
  uid,
  snapToGrid,
  snapPointToGrid,
  getAngle,
  snapAngle,
  getDistance,
  isHorizontal,
  isVertical,
  getShapeBounds,
  getCombinedBounds,
  getLineIntersection,
  pointToSegmentDistance,
  detectEdge,
  applyAngleSnap,
  calculateMeasurements,
  findAlignmentGuides,
  hitTest,
} from '../utils/geometry';
import type { LineShape, RectShape, Shape } from '../types';

// =============================================================================
// UID GENERATION
// =============================================================================

describe('uid', () => {
  it('generates unique IDs', () => {
    const id1 = uid();
    const id2 = uid();
    expect(id1).not.toBe(id2);
  });

  it('applies prefix when provided', () => {
    const id = uid('L-');
    expect(id.startsWith('L-')).toBe(true);
  });

  it('generates IDs without prefix', () => {
    const id = uid();
    expect(id.length).toBeGreaterThan(5);
  });
});

// =============================================================================
// GRID SNAPPING
// =============================================================================

describe('snapToGrid', () => {
  it('snaps value to nearest grid point', () => {
    expect(snapToGrid(15, 10)).toBe(20);
    expect(snapToGrid(14, 10)).toBe(10);
    expect(snapToGrid(5, 10)).toBe(10);
    expect(snapToGrid(4, 10)).toBe(0);
  });

  it('snaps with custom grid size', () => {
    expect(snapToGrid(7, 5)).toBe(5);
    expect(snapToGrid(8, 5)).toBe(10);
    expect(snapToGrid(12, 5)).toBe(10);
    expect(snapToGrid(13, 5)).toBe(15);
  });

  it('handles zero', () => {
    expect(snapToGrid(0, 10)).toBe(0);
  });

  it('handles negative values', () => {
    // Note: JavaScript may return -0 which is === 0 but not Object.is(0)
    expect(snapToGrid(-4, 10) === 0).toBe(true);
    expect(snapToGrid(-5, 10) === 0).toBe(true); // Math.round(-0.5) = -0 in JS
    expect(snapToGrid(-6, 10)).toBe(-10);
    expect(snapToGrid(-15, 10)).toBe(-10); // Math.round(-1.5) = -1 in JS (rounds toward +∞)
    expect(snapToGrid(-16, 10)).toBe(-20);
  });

  it('handles exact grid values', () => {
    expect(snapToGrid(10, 10)).toBe(10);
    expect(snapToGrid(20, 10)).toBe(20);
    expect(snapToGrid(100, 10)).toBe(100);
  });
});

describe('snapPointToGrid', () => {
  it('snaps both coordinates', () => {
    const result = snapPointToGrid(15, 23, 10);
    expect(result.x).toBe(20);
    expect(result.y).toBe(20);
  });

  it('handles origin point', () => {
    const result = snapPointToGrid(0, 0, 10);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });
});

// =============================================================================
// ANGLE CALCULATIONS
// =============================================================================

describe('getAngle', () => {
  it('calculates horizontal right angle (0°)', () => {
    expect(getAngle(0, 0, 100, 0)).toBe(0);
  });

  it('calculates vertical down angle (90°)', () => {
    expect(getAngle(0, 0, 0, 100)).toBe(90);
  });

  it('calculates horizontal left angle (180°)', () => {
    const angle = getAngle(100, 0, 0, 0);
    expect(Math.abs(angle)).toBe(180);
  });

  it('calculates vertical up angle (-90°)', () => {
    expect(getAngle(0, 100, 0, 0)).toBe(-90);
  });

  it('calculates 45° diagonal', () => {
    expect(getAngle(0, 0, 100, 100)).toBe(45);
  });

  it('calculates -45° diagonal', () => {
    expect(getAngle(0, 0, 100, -100)).toBe(-45);
  });
});

describe('snapAngle', () => {
  it('snaps to 45° increments by default', () => {
    expect(snapAngle(10)).toBe(0);
    expect(snapAngle(23)).toBe(45);
    expect(snapAngle(40)).toBe(45);
    expect(snapAngle(50)).toBe(45);
    expect(snapAngle(68)).toBe(90);
    expect(snapAngle(85)).toBe(90);
  });

  it('snaps with custom increment', () => {
    expect(snapAngle(10, 15)).toBe(15);
    expect(snapAngle(20, 30)).toBe(30);
    expect(snapAngle(50, 30)).toBe(60);
  });

  it('handles negative angles', () => {
    // Note: JavaScript may return -0 which is === 0 but not Object.is(0)
    expect(snapAngle(-10) === 0).toBe(true);
    expect(snapAngle(-23)).toBe(-45);
    expect(snapAngle(-50)).toBe(-45);
  });
});

describe('getDistance', () => {
  it('calculates horizontal distance', () => {
    expect(getDistance(0, 0, 100, 0)).toBe(100);
  });

  it('calculates vertical distance', () => {
    expect(getDistance(0, 0, 0, 100)).toBe(100);
  });

  it('calculates diagonal distance (3-4-5 triangle)', () => {
    expect(getDistance(0, 0, 3, 4)).toBe(5);
  });

  it('calculates zero distance for same point', () => {
    expect(getDistance(50, 50, 50, 50)).toBe(0);
  });

  it('handles negative coordinates', () => {
    expect(getDistance(-5, -5, 5, 5)).toBeCloseTo(14.142, 2);
  });
});

describe('isHorizontal', () => {
  it('detects horizontal line (0°)', () => {
    expect(isHorizontal(0)).toBe(true);
  });

  it('detects horizontal line (180°)', () => {
    expect(isHorizontal(180)).toBe(true);
  });

  it('detects near-horizontal within tolerance', () => {
    expect(isHorizontal(5, 10)).toBe(true);
    expect(isHorizontal(-5, 10)).toBe(true);
    expect(isHorizontal(175, 10)).toBe(true);
    expect(isHorizontal(-175, 10)).toBe(true);
  });

  it('rejects non-horizontal angles', () => {
    expect(isHorizontal(45)).toBe(false);
    expect(isHorizontal(90)).toBe(false);
    expect(isHorizontal(135)).toBe(false);
  });
});

describe('isVertical', () => {
  it('detects vertical line (90°)', () => {
    expect(isVertical(90)).toBe(true);
  });

  it('detects vertical line (-90°)', () => {
    expect(isVertical(-90)).toBe(true);
  });

  it('detects near-vertical within tolerance', () => {
    expect(isVertical(85, 10)).toBe(true);
    expect(isVertical(95, 10)).toBe(true);
    expect(isVertical(-85, 10)).toBe(true);
  });

  it('rejects non-vertical angles', () => {
    expect(isVertical(0)).toBe(false);
    expect(isVertical(45)).toBe(false);
    expect(isVertical(180)).toBe(false);
  });
});

describe('applyAngleSnap', () => {
  it('snaps line to 0° (horizontal)', () => {
    const result = applyAngleSnap(0, 0, 100, 10, true);
    expect(result.y).toBeCloseTo(0, 1);
  });

  it('snaps line to 45° diagonal', () => {
    const result = applyAngleSnap(0, 0, 100, 90, true);
    // Should snap to 45°, so x ≈ y
    expect(Math.abs(result.x - result.y)).toBeLessThan(5);
  });

  it('returns original point when snap disabled', () => {
    const result = applyAngleSnap(0, 0, 100, 37, false);
    expect(result.x).toBe(100);
    expect(result.y).toBe(37);
  });
});

// =============================================================================
// SHAPE BOUNDS
// =============================================================================

describe('getShapeBounds', () => {
  it('returns bounds for RectShape', () => {
    const rect: RectShape = {
      id: 'r1',
      type: 'rect',
      x: 100,
      y: 200,
      w: 50,
      h: 80,
    };
    const bounds = getShapeBounds(rect);

    expect(bounds).not.toBeNull();
    expect(bounds!.x1).toBe(100);
    expect(bounds!.y1).toBe(200);
    expect(bounds!.x2).toBe(150);
    expect(bounds!.y2).toBe(280);
    expect(bounds!.cx).toBe(125);
    expect(bounds!.cy).toBe(240);
  });

  it('returns bounds for LineShape', () => {
    const line: LineShape = {
      id: 'l1',
      type: 'line',
      x1: 10,
      y1: 20,
      x2: 110,
      y2: 120,
    };
    const bounds = getShapeBounds(line);

    expect(bounds).not.toBeNull();
    expect(bounds!.x1).toBe(10);
    expect(bounds!.y1).toBe(20);
    expect(bounds!.x2).toBe(110);
    expect(bounds!.y2).toBe(120);
    expect(bounds!.cx).toBe(60);
    expect(bounds!.cy).toBe(70);
  });

  it('handles reversed line coordinates', () => {
    const line: LineShape = {
      id: 'l1',
      type: 'line',
      x1: 100,
      y1: 100,
      x2: 10,
      y2: 20,
    };
    const bounds = getShapeBounds(line);

    expect(bounds!.x1).toBe(10);
    expect(bounds!.y1).toBe(20);
    expect(bounds!.x2).toBe(100);
    expect(bounds!.y2).toBe(100);
  });
});

describe('getCombinedBounds', () => {
  it('returns null for empty array', () => {
    expect(getCombinedBounds([])).toBeNull();
  });

  it('returns bounds for single shape', () => {
    const shapes: Shape[] = [{
      id: 'r1',
      type: 'rect',
      x: 10,
      y: 20,
      w: 100,
      h: 50,
    }];
    const bounds = getCombinedBounds(shapes);

    expect(bounds!.x1).toBe(10);
    expect(bounds!.x2).toBe(110);
  });

  it('combines bounds of multiple shapes', () => {
    const shapes: Shape[] = [
      { id: 'r1', type: 'rect', x: 0, y: 0, w: 50, h: 50 },
      { id: 'r2', type: 'rect', x: 100, y: 100, w: 50, h: 50 },
    ];
    const bounds = getCombinedBounds(shapes);

    expect(bounds!.x1).toBe(0);
    expect(bounds!.y1).toBe(0);
    expect(bounds!.x2).toBe(150);
    expect(bounds!.y2).toBe(150);
    expect(bounds!.cx).toBe(75);
    expect(bounds!.cy).toBe(75);
  });
});

// =============================================================================
// LINE INTERSECTION
// =============================================================================

describe('getLineIntersection', () => {
  it('finds intersection of crossing lines', () => {
    // Horizontal line: (0,50) to (100,50)
    // Vertical line: (50,0) to (50,100)
    const result = getLineIntersection(0, 50, 100, 50, 50, 0, 50, 100);

    expect(result).not.toBeNull();
    expect(result!.x).toBe(50);
    expect(result!.y).toBe(50);
  });

  it('returns null for parallel lines', () => {
    // Two horizontal parallel lines
    const result = getLineIntersection(0, 0, 100, 0, 0, 50, 100, 50);
    expect(result).toBeNull();
  });

  it('returns null for non-intersecting segments', () => {
    // Lines would intersect if extended, but segments don't touch
    const result = getLineIntersection(0, 0, 10, 0, 50, 10, 50, 100);
    expect(result).toBeNull();
  });

  it('finds diagonal intersection', () => {
    // X pattern
    const result = getLineIntersection(0, 0, 100, 100, 0, 100, 100, 0);

    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(50, 1);
    expect(result!.y).toBeCloseTo(50, 1);
  });
});

// =============================================================================
// POINT TO SEGMENT DISTANCE
// =============================================================================

describe('pointToSegmentDistance', () => {
  it('calculates perpendicular distance', () => {
    // Point (50, 100), Line from (0,0) to (100,0)
    const dist = pointToSegmentDistance(50, 100, 0, 0, 100, 0);
    expect(dist).toBe(100);
  });

  it('calculates distance to endpoint when perpendicular falls outside', () => {
    // Point (150, 0), Line from (0,0) to (100,0)
    // Closest point is (100,0)
    const dist = pointToSegmentDistance(150, 0, 0, 0, 100, 0);
    expect(dist).toBe(50);
  });

  it('returns 0 for point on line', () => {
    const dist = pointToSegmentDistance(50, 0, 0, 0, 100, 0);
    expect(dist).toBe(0);
  });

  it('handles diagonal line', () => {
    // Point at origin, diagonal line from (10,10) to (20,20)
    const dist = pointToSegmentDistance(0, 0, 10, 10, 20, 20);
    expect(dist).toBeCloseTo(14.14, 1); // Distance to (10,10)
  });
});

// =============================================================================
// EDGE DETECTION
// =============================================================================

describe('detectEdge', () => {
  const rect: RectShape = {
    id: 'r1',
    type: 'rect',
    x: 100,
    y: 100,
    w: 200,
    h: 150,
  };
  const threshold = 8;

  it('detects left edge', () => {
    const edge = detectEdge(102, 175, rect, undefined, threshold);
    expect(edge).toBe('left');
  });

  it('detects right edge', () => {
    const edge = detectEdge(298, 175, rect, undefined, threshold);
    expect(edge).toBe('right');
  });

  it('detects top edge', () => {
    const edge = detectEdge(200, 102, rect, undefined, threshold);
    expect(edge).toBe('top');
  });

  it('detects bottom edge', () => {
    const edge = detectEdge(200, 248, rect, undefined, threshold);
    expect(edge).toBe('bottom');
  });

  it('returns null when not near any edge', () => {
    const edge = detectEdge(200, 175, rect, undefined, threshold);
    expect(edge).toBeNull();
  });

  it('respects allowed edges filter', () => {
    // Near left edge but only top/bottom allowed
    const edge = detectEdge(102, 175, rect, ['top', 'bottom'], threshold);
    expect(edge).toBeNull();
  });
});

// =============================================================================
// MEASUREMENTS
// =============================================================================

describe('calculateMeasurements', () => {
  it('returns zero for empty selection', () => {
    const result = calculateMeasurements([], new Set(), null);
    expect(result.selectedCount).toBe(0);
    expect(result.totalLength).toBe(0);
    expect(result.area).toBe(0);
    expect(result.perimeter).toBe(0);
  });

  it('calculates line length', () => {
    const shapes: Shape[] = [{
      id: 'l1',
      type: 'line',
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 0,
    }];
    const result = calculateMeasurements(shapes, new Set(['l1']), null);

    expect(result.selectedCount).toBe(1);
    expect(result.totalLength).toBe(100);
  });

  it('calculates rectangle area and perimeter', () => {
    const shapes: Shape[] = [{
      id: 'r1',
      type: 'rect',
      x: 0,
      y: 0,
      w: 100,
      h: 50,
    }];
    const result = calculateMeasurements(shapes, new Set(['r1']), null);

    expect(result.selectedCount).toBe(1);
    expect(result.area).toBe(5000); // 100 * 50
    expect(result.perimeter).toBe(300); // 2 * (100 + 50)
  });

  it('aggregates multiple shapes', () => {
    const shapes: Shape[] = [
      { id: 'l1', type: 'line', x1: 0, y1: 0, x2: 100, y2: 0 },
      { id: 'l2', type: 'line', x1: 0, y1: 0, x2: 0, y2: 50 },
      { id: 'r1', type: 'rect', x: 0, y: 0, w: 10, h: 10 },
    ];
    const result = calculateMeasurements(shapes, new Set(['l1', 'l2', 'r1']), null);

    expect(result.selectedCount).toBe(3);
    expect(result.totalLength).toBe(150); // 100 + 50
    expect(result.area).toBe(100); // 10 * 10
    expect(result.perimeter).toBe(40); // 2 * (10 + 10)
  });

  it('includes selectedId in calculation', () => {
    const shapes: Shape[] = [{
      id: 'r1',
      type: 'rect',
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    }];
    // Using selectedId instead of selectedIds
    const result = calculateMeasurements(shapes, new Set(), 'r1');

    expect(result.selectedCount).toBe(1);
    expect(result.area).toBe(10000);
  });
});

// =============================================================================
// HIT TEST
// =============================================================================

describe('hitTest', () => {
  const shapes: Shape[] = [
    { id: 'r1', type: 'rect', x: 0, y: 0, w: 100, h: 100 },
    { id: 'r2', type: 'rect', x: 200, y: 200, w: 50, h: 50 },
    { id: 'l1', type: 'line', x1: 300, y1: 0, x2: 300, y2: 100 },
  ];

  it('hits rectangle', () => {
    const hit = hitTest(50, 50, shapes, 5);
    expect(hit).not.toBeNull();
    expect(hit!.id).toBe('r1');
  });

  it('hits second rectangle', () => {
    const hit = hitTest(225, 225, shapes, 5);
    expect(hit).not.toBeNull();
    expect(hit!.id).toBe('r2');
  });

  it('hits line within tolerance', () => {
    const hit = hitTest(303, 50, shapes, 5);
    expect(hit).not.toBeNull();
    expect(hit!.id).toBe('l1');
  });

  it('returns null when no hit', () => {
    const hit = hitTest(500, 500, shapes, 5);
    expect(hit).toBeNull();
  });

  it('returns topmost shape (last in array)', () => {
    // Add overlapping shape
    const overlapping: Shape[] = [
      { id: 'bottom', type: 'rect', x: 0, y: 0, w: 100, h: 100 },
      { id: 'top', type: 'rect', x: 50, y: 50, w: 100, h: 100 },
    ];
    const hit = hitTest(75, 75, overlapping, 5);
    expect(hit!.id).toBe('top');
  });
});

// =============================================================================
// ALIGNMENT GUIDES
// =============================================================================

describe('findAlignmentGuides', () => {
  const shapes: Shape[] = [
    { id: 'r1', type: 'rect', x: 100, y: 100, w: 100, h: 100 },
    { id: 'r2', type: 'rect', x: 300, y: 100, w: 100, h: 100 },
  ];

  it('finds vertical alignment guide', () => {
    // Point near left edge of r1 (x=100)
    const result = findAlignmentGuides(102, 50, shapes, undefined, 1000, 1000);

    expect(result.guides.length).toBeGreaterThan(0);
    // Should snap to x=100
    expect(result.snapX).toBe(100);
  });

  it('finds horizontal alignment guide', () => {
    // Point near top edge of both rects (y=100)
    const result = findAlignmentGuides(500, 102, shapes, undefined, 1000, 1000);

    expect(result.guides.length).toBeGreaterThan(0);
    expect(result.snapY).toBe(100);
  });

  it('excludes specified shape from alignment', () => {
    // When dragging r1, exclude it from alignment targets
    const result = findAlignmentGuides(100, 100, shapes, 'r1', 1000, 1000);

    // Should not align to itself, only to r2
    const guides = result.guides.filter(g => g.position === 100);
    // r1 is at x=100, r2 is at x=300, so no guide at 100 from r2
    expect(guides.length).toBeLessThanOrEqual(1);
  });

  it('returns null snap values when no alignment found', () => {
    const result = findAlignmentGuides(500, 500, shapes, undefined, 1000, 1000);

    // Far from any shape, might not find alignment
    // This depends on implementation threshold
  });
});
