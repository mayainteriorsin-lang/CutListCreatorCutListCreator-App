/**
 * Design Module - Store Integration Tests
 *
 * Layer: INTEGRATION (Service)
 * Scope: Zustand store actions and state management
 * Priority: HIGH - Central state management for design module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Mock external dependencies
vi.mock('../engine/shapeGenerator', () => ({
  generateModuleShapes: vi.fn((config, origin) => [
    { id: 'MOD-LEFT', type: 'rect', x: origin.x, y: origin.y, w: 18, h: config.heightMm },
    { id: 'MOD-RIGHT', type: 'rect', x: origin.x + config.widthMm - 18, y: origin.y, w: 18, h: config.heightMm },
    { id: 'MOD-TOP', type: 'rect', x: origin.x + 18, y: origin.y, w: config.widthMm - 36, h: 18 },
    { id: 'MOD-BOTTOM', type: 'rect', x: origin.x + 18, y: origin.y + config.heightMm - 18, w: config.widthMm - 36, h: 18 },
  ]),
  MODULE_DEFAULTS: {},
}));

vi.mock('@/modules/visual-quotation/constants', () => ({
  UNIT_TYPE_LABELS: {
    wardrobe_carcass: 'Wardrobe Carcass',
    wardrobe: 'Wardrobe',
    kitchen: 'Kitchen',
  },
}));

import { useDesignStore, type ModuleConfig } from '../store/designStore';

// =============================================================================
// TEST UTILITIES
// =============================================================================

const getStore = () => useDesignStore.getState();
const resetStore = () => useDesignStore.getState().resetStore();

// =============================================================================
// INITIAL STATE TESTS
// =============================================================================

describe('Design Store', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('initial state', () => {
    it('initializes canvas state correctly', () => {
      const state = getStore();
      expect(state.gridSize).toBe(10);
      expect(state.gridVisible).toBe(true);
      expect(state.zoom).toBe(1);
      expect(state.canvasSize).toEqual({ w: 100000, h: 100000 });
      expect(state.panPosition).toEqual({ x: 0, y: 0 });
    });

    it('initializes tools state correctly', () => {
      const state = getStore();
      expect(state.mode).toBe('select');
      expect(state.lineThickness).toBe(18);
      expect(state.lineColor).toBe('#000000');
      expect(state.angleSnap).toBe(true);
      expect(state.orthoMode).toBe(false);
      expect(state.smartSnapEnabled).toBe(true);
    });

    it('initializes shapes state correctly', () => {
      const state = getStore();
      expect(state.shapes).toEqual([]);
      expect(state.selectedId).toBeNull();
      expect(state.selectedIds.size).toBe(0);
      expect(state.temp).toBeNull();
      expect(state.isDragging).toBe(false);
    });

    it('initializes history state correctly', () => {
      const state = getStore();
      expect(state.history).toEqual([]);
      expect(state.historyIndex).toBe(-1);
      expect(state.clipboard).toBeNull();
    });

    it('initializes module state correctly', () => {
      const state = getStore();
      expect(state.moduleConfig).toBeNull();
      expect(state.showModulePanel).toBe(false);
      expect(state.moduleShapeIds.size).toBe(0);
    });

    it('initializes UI state correctly', () => {
      const state = getStore();
      expect(state.showComponentPanel).toBe(false);
      expect(state.show3DPreview).toBe(false);
      expect(state.showMeasurementPanel).toBe(false);
      expect(state.showAllDimensions).toBe(true);
    });
  });

  // ===========================================================================
  // CANVAS ACTIONS
  // ===========================================================================

  describe('canvas actions', () => {
    it('setGridSize updates grid size', () => {
      getStore().setGridSize(20);
      expect(getStore().gridSize).toBe(20);
    });

    it('setGridSize clamps to minimum of 1', () => {
      getStore().setGridSize(0);
      expect(getStore().gridSize).toBe(1);

      getStore().setGridSize(-5);
      expect(getStore().gridSize).toBe(1);
    });

    it('toggleGrid toggles grid visibility', () => {
      expect(getStore().gridVisible).toBe(true);
      getStore().toggleGrid();
      expect(getStore().gridVisible).toBe(false);
      getStore().toggleGrid();
      expect(getStore().gridVisible).toBe(true);
    });

    it('setZoom updates zoom level', () => {
      getStore().setZoom(2);
      expect(getStore().zoom).toBe(2);
    });

    it('setZoom clamps to valid range', () => {
      getStore().setZoom(0.01);
      expect(getStore().zoom).toBe(0.1);

      getStore().setZoom(20);
      expect(getStore().zoom).toBe(10);
    });

    it('zoomIn increases zoom', () => {
      getStore().setZoom(1);
      getStore().zoomIn();
      expect(getStore().zoom).toBeCloseTo(1.2, 1);
    });

    it('zoomOut decreases zoom', () => {
      getStore().setZoom(1);
      getStore().zoomOut();
      expect(getStore().zoom).toBeCloseTo(0.833, 2);
    });

    it('resetZoom sets zoom to 1', () => {
      getStore().setZoom(2.5);
      getStore().resetZoom();
      expect(getStore().zoom).toBe(1);
    });

    it('setPanPosition updates pan position', () => {
      getStore().setPanPosition({ x: 100, y: 200 });
      expect(getStore().panPosition).toEqual({ x: 100, y: 200 });
    });
  });

  // ===========================================================================
  // TOOLS ACTIONS
  // ===========================================================================

  describe('tools actions', () => {
    it('setMode updates mode and clears temp', () => {
      getStore().setTemp({ type: 'line' });
      getStore().setMode('rect');
      expect(getStore().mode).toBe('rect');
      expect(getStore().temp).toBeNull();
    });

    it('setLineThickness clamps to minimum of 1', () => {
      getStore().setLineThickness(0);
      expect(getStore().lineThickness).toBe(1);
    });

    it('toggleAngleSnap toggles angle snap', () => {
      expect(getStore().angleSnap).toBe(true);
      getStore().toggleAngleSnap();
      expect(getStore().angleSnap).toBe(false);
    });

    it('setOrthoMode sets ortho mode', () => {
      getStore().setOrthoMode(true);
      expect(getStore().orthoMode).toBe(true);
    });

    it('toggleSmartSnap toggles smart snap', () => {
      expect(getStore().smartSnapEnabled).toBe(true);
      getStore().toggleSmartSnap();
      expect(getStore().smartSnapEnabled).toBe(false);
    });
  });

  // ===========================================================================
  // SHAPES ACTIONS
  // ===========================================================================

  describe('shapes actions', () => {
    const testShape = { id: 'test-1', type: 'rect' as const, x: 0, y: 0, w: 100, h: 100 };
    const testLine = { id: 'test-2', type: 'line' as const, x1: 0, y1: 0, x2: 100, y2: 100 };

    it('setShapes replaces shapes array', () => {
      getStore().setShapes([testShape]);
      expect(getStore().shapes).toEqual([testShape]);
    });

    it('addShape appends to shapes array', () => {
      getStore().addShape(testShape);
      getStore().addShape(testLine);
      expect(getStore().shapes).toHaveLength(2);
      expect(getStore().shapes[0]).toEqual(testShape);
      expect(getStore().shapes[1]).toEqual(testLine);
    });

    it('updateShape updates specific shape', () => {
      getStore().setShapes([testShape]);
      getStore().updateShape('test-1', { w: 200 });
      expect(getStore().shapes[0].w).toBe(200);
    });

    it('deleteShape removes shape and clears selection', () => {
      getStore().setShapes([testShape, testLine]);
      getStore().setSelectedId('test-1');
      getStore().deleteShape('test-1');
      expect(getStore().shapes).toHaveLength(1);
      expect(getStore().selectedId).toBeNull();
    });

    it('selectAll selects all shapes', () => {
      getStore().setShapes([testShape, testLine]);
      getStore().selectAll();
      expect(getStore().selectedIds.size).toBe(2);
    });

    it('clearSelection clears all selections', () => {
      getStore().setSelectedId('test-1');
      getStore().setSelectedIds(new Set(['test-1', 'test-2']));
      getStore().clearSelection();
      expect(getStore().selectedId).toBeNull();
      expect(getStore().selectedIds.size).toBe(0);
    });

    it('addToSelection adds to selectedIds', () => {
      getStore().addToSelection('test-1');
      getStore().addToSelection('test-2');
      expect(getStore().selectedIds.size).toBe(2);
    });

    it('removeFromSelection removes from selectedIds', () => {
      getStore().setSelectedIds(new Set(['test-1', 'test-2']));
      getStore().removeFromSelection('test-1');
      expect(getStore().selectedIds.size).toBe(1);
      expect(getStore().selectedIds.has('test-2')).toBe(true);
    });

    it('clearAll clears all shapes and selections', () => {
      getStore().setShapes([testShape]);
      getStore().setSelectedId('test-1');
      getStore().clearAll();
      expect(getStore().shapes).toHaveLength(0);
      expect(getStore().selectedId).toBeNull();
    });
  });

  // ===========================================================================
  // HISTORY ACTIONS
  // ===========================================================================

  describe('history actions', () => {
    const shape1 = { id: 's1', type: 'rect' as const, x: 0, y: 0, w: 100, h: 100 };
    const shape2 = { id: 's2', type: 'rect' as const, x: 50, y: 50, w: 100, h: 100 };

    it('pushHistory adds entry to history', () => {
      getStore().pushHistory([shape1], 'Add shape');
      expect(getStore().history).toHaveLength(1);
      expect(getStore().historyIndex).toBe(0);
    });

    it('pushHistory trims future on new push', () => {
      getStore().pushHistory([shape1], 'Step 1');
      getStore().pushHistory([shape1, shape2], 'Step 2');
      getStore().undo();
      getStore().pushHistory([shape1], 'New step');

      expect(getStore().history).toHaveLength(2);
      expect(getStore().historyIndex).toBe(1);
    });

    it('undo restores previous state', () => {
      getStore().setShapes([]);
      getStore().pushHistory([shape1], 'Step 1');
      getStore().setShapes([shape1]);
      getStore().pushHistory([shape1, shape2], 'Step 2');
      getStore().setShapes([shape1, shape2]);

      getStore().undo();
      expect(getStore().shapes).toHaveLength(1);
      expect(getStore().historyIndex).toBe(0);
    });

    it('redo restores next state', () => {
      getStore().pushHistory([shape1], 'Step 1');
      getStore().pushHistory([shape1, shape2], 'Step 2');
      getStore().undo();
      getStore().redo();

      expect(getStore().historyIndex).toBe(1);
    });

    it('canUndo returns correct value', () => {
      expect(getStore().canUndo()).toBe(false);
      getStore().pushHistory([shape1], 'Step 1');
      expect(getStore().canUndo()).toBe(false); // At index 0
      getStore().pushHistory([shape1, shape2], 'Step 2');
      expect(getStore().canUndo()).toBe(true);
    });

    it('canRedo returns correct value', () => {
      getStore().pushHistory([shape1], 'Step 1');
      getStore().pushHistory([shape1, shape2], 'Step 2');
      expect(getStore().canRedo()).toBe(false);
      getStore().undo();
      expect(getStore().canRedo()).toBe(true);
    });

    it('undo does nothing at start of history', () => {
      getStore().pushHistory([shape1], 'Step 1');
      getStore().undo(); // At index 0, can't go back
      expect(getStore().historyIndex).toBe(0);
    });

    it('redo does nothing at end of history', () => {
      getStore().pushHistory([shape1], 'Step 1');
      const index = getStore().historyIndex;
      getStore().redo();
      expect(getStore().historyIndex).toBe(index);
    });
  });

  // ===========================================================================
  // CLIPBOARD ACTIONS
  // ===========================================================================

  describe('clipboard actions', () => {
    const shape1 = { id: 's1', type: 'rect' as const, x: 0, y: 0, w: 100, h: 100 };
    const shape2 = { id: 's2', type: 'line' as const, x1: 0, y1: 0, x2: 100, y2: 100 };

    it('copyToClipboard copies selected shapes', () => {
      getStore().setShapes([shape1, shape2]);
      getStore().setSelectedId('s1');
      getStore().copyToClipboard();

      expect(getStore().clipboard).toHaveLength(1);
      expect(getStore().clipboard?.[0].id).toBe('s1');
    });

    it('copyToClipboard copies multiple selections', () => {
      getStore().setShapes([shape1, shape2]);
      getStore().setSelectedIds(new Set(['s1', 's2']));
      getStore().copyToClipboard();

      expect(getStore().clipboard).toHaveLength(2);
    });

    it('copyToClipboard does nothing without selection', () => {
      getStore().setShapes([shape1]);
      getStore().copyToClipboard();

      expect(getStore().clipboard).toBeNull();
    });

    it('pasteFromClipboard adds offset copies', () => {
      getStore().setShapes([shape1]);
      getStore().setSelectedId('s1');
      getStore().copyToClipboard();
      getStore().pasteFromClipboard();

      expect(getStore().shapes).toHaveLength(2);
      const pasted = getStore().shapes[1];
      expect(pasted.id).not.toBe('s1');
      if (pasted.type === 'rect') {
        expect(pasted.x).toBe(20); // Original + offset
        expect(pasted.y).toBe(20);
      }
    });

    it('pasteFromClipboard does nothing without clipboard', () => {
      getStore().setShapes([shape1]);
      getStore().pasteFromClipboard();

      expect(getStore().shapes).toHaveLength(1);
    });
  });

  // ===========================================================================
  // MODULE ACTIONS
  // ===========================================================================

  describe('module actions', () => {
    const testConfig: ModuleConfig = {
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
    };

    it('setModuleConfig sets module config', () => {
      getStore().setModuleConfig(testConfig);
      expect(getStore().moduleConfig).toEqual(testConfig);
    });

    it('updateModuleConfig updates partial config', () => {
      getStore().setModuleConfig(testConfig);
      getStore().updateModuleConfig({ widthMm: 3000 });
      expect(getStore().moduleConfig?.widthMm).toBe(3000);
      expect(getStore().moduleConfig?.heightMm).toBe(2100); // Unchanged
    });

    it('updateModuleConfig does nothing if no config', () => {
      getStore().updateModuleConfig({ widthMm: 3000 });
      expect(getStore().moduleConfig).toBeNull();
    });

    it('toggleModulePanel toggles panel visibility', () => {
      expect(getStore().showModulePanel).toBe(false);
      getStore().toggleModulePanel();
      expect(getStore().showModulePanel).toBe(true);
    });

    it('setModuleShapeIds sets module shape IDs', () => {
      getStore().setModuleShapeIds(new Set(['MOD-1', 'MOD-2']));
      expect(getStore().moduleShapeIds.size).toBe(2);
    });

    it('addModuleShapeId adds to module shape IDs', () => {
      getStore().addModuleShapeId('MOD-1');
      getStore().addModuleShapeId('MOD-2');
      expect(getStore().moduleShapeIds.size).toBe(2);
    });

    it('clearModuleShapeIds clears module shape IDs', () => {
      getStore().setModuleShapeIds(new Set(['MOD-1', 'MOD-2']));
      getStore().clearModuleShapeIds();
      expect(getStore().moduleShapeIds.size).toBe(0);
    });

    it('getCalculatedWidth returns width minus reduction', () => {
      getStore().setWidthValue(200);
      getStore().setWidthReduction(36);
      expect(getStore().getCalculatedWidth()).toBe(164);
    });

    it('regenerateModuleShapes generates shapes and updates state', () => {
      getStore().regenerateModuleShapes(testConfig);

      expect(getStore().shapes.length).toBeGreaterThan(0);
      expect(getStore().moduleShapeIds.size).toBeGreaterThan(0);
      expect(getStore().moduleConfig).not.toBeNull();
      expect(getStore().showModulePanel).toBe(true);
      expect(getStore().history.length).toBeGreaterThan(0);
    });

    it('regenerateModuleShapes initializes panelsEnabled for wardrobe_carcass', () => {
      getStore().regenerateModuleShapes(testConfig);
      expect(getStore().moduleConfig?.panelsEnabled).toEqual({
        top: true,
        bottom: true,
        left: true,
        right: true,
        back: true,
      });
    });
  });

  // ===========================================================================
  // UI ACTIONS
  // ===========================================================================

  describe('UI actions', () => {
    it('toggleComponentPanel toggles component panel', () => {
      expect(getStore().showComponentPanel).toBe(false);
      getStore().toggleComponentPanel();
      expect(getStore().showComponentPanel).toBe(true);
    });

    it('toggle3DPreview toggles 3D preview', () => {
      expect(getStore().show3DPreview).toBe(false);
      getStore().toggle3DPreview();
      expect(getStore().show3DPreview).toBe(true);
    });

    it('toggleMeasurementPanel toggles measurement panel', () => {
      expect(getStore().showMeasurementPanel).toBe(false);
      getStore().toggleMeasurementPanel();
      expect(getStore().showMeasurementPanel).toBe(true);
    });

    it('toggleAllDimensions toggles dimension visibility', () => {
      expect(getStore().showAllDimensions).toBe(true);
      getStore().toggleAllDimensions();
      expect(getStore().showAllDimensions).toBe(false);
    });

    it('setDimensionStart sets dimension start point', () => {
      getStore().setDimensionStart({ x: 100, y: 200 });
      expect(getStore().dimensionStart).toEqual({ x: 100, y: 200 });
    });

    it('setMeasurementResult sets measurement result', () => {
      const result = { distance: 100, angle: 45 };
      getStore().setMeasurementResult(result);
      expect(getStore().measurementResult).toEqual(result);
    });
  });

  // ===========================================================================
  // ADDITIONAL CANVAS ACTIONS
  // ===========================================================================

  describe('additional canvas actions', () => {
    it('setGridVisible sets grid visibility directly', () => {
      getStore().setGridVisible(false);
      expect(getStore().gridVisible).toBe(false);
      getStore().setGridVisible(true);
      expect(getStore().gridVisible).toBe(true);
    });

    it('setCanvasSize sets canvas dimensions', () => {
      getStore().setCanvasSize({ w: 800, h: 600 });
      expect(getStore().canvasSize).toEqual({ w: 800, h: 600 });
    });
  });

  // ===========================================================================
  // ADDITIONAL SHAPES ACTIONS
  // ===========================================================================

  describe('additional shapes actions', () => {
    const testRect = { id: 'r1', type: 'rect' as const, x: 0, y: 0, w: 100, h: 100 };
    const testLine = { id: 'l1', type: 'line' as const, x1: 0, y1: 0, x2: 100, y2: 100 };

    it('deleteSelectedShapes removes all selected shapes', () => {
      getStore().setShapes([testRect, testLine]);
      getStore().setSelectedIds(new Set(['r1', 'l1']));
      getStore().deleteSelectedShapes();
      expect(getStore().shapes).toHaveLength(0);
      expect(getStore().selectedIds.size).toBe(0);
    });

    it('deleteSelectedShapes adds to history', () => {
      getStore().setShapes([testRect]);
      getStore().setSelectedId('r1');
      getStore().deleteSelectedShapes();
      expect(getStore().history.length).toBeGreaterThan(0);
    });

    it('deleteSelectedShapes does nothing with no selection', () => {
      getStore().setShapes([testRect]);
      getStore().deleteSelectedShapes();
      expect(getStore().shapes).toHaveLength(1);
    });

    it('setTemp sets temporary shape', () => {
      getStore().setTemp({ type: 'rect', x: 10, y: 10 });
      expect(getStore().temp).toEqual({ type: 'rect', x: 10, y: 10 });
    });

    it('setTemp can clear temp with null', () => {
      getStore().setTemp({ type: 'line' });
      getStore().setTemp(null);
      expect(getStore().temp).toBeNull();
    });

    it('setIsDragging sets dragging state', () => {
      getStore().setIsDragging(true);
      expect(getStore().isDragging).toBe(true);
      getStore().setIsDragging(false);
      expect(getStore().isDragging).toBe(false);
    });

    it('setAlignmentGuides sets alignment guides', () => {
      const guides = [
        { type: 'horizontal' as const, position: 100, start: 0, end: 500 },
        { type: 'vertical' as const, position: 200, start: 0, end: 400 },
      ];
      getStore().setAlignmentGuides(guides);
      expect(getStore().alignmentGuides).toEqual(guides);
    });

    it('setCursorPos sets cursor position', () => {
      getStore().setCursorPos({ x: 150, y: 250 });
      expect(getStore().cursorPos).toEqual({ x: 150, y: 250 });
    });

    it('setCursorPos can clear with null', () => {
      getStore().setCursorPos({ x: 100, y: 100 });
      getStore().setCursorPos(null);
      expect(getStore().cursorPos).toBeNull();
    });

    it('setHoveredPanelId sets hovered panel', () => {
      getStore().setHoveredPanelId('MOD-LEFT');
      expect(getStore().hoveredPanelId).toBe('MOD-LEFT');
    });

    it('setHoveredEdge sets hovered edge', () => {
      getStore().setHoveredEdge('left');
      expect(getStore().hoveredEdge).toBe('left');
      getStore().setHoveredEdge('right');
      expect(getStore().hoveredEdge).toBe('right');
      getStore().setHoveredEdge(null);
      expect(getStore().hoveredEdge).toBeNull();
    });
  });

  // ===========================================================================
  // ADDITIONAL HISTORY ACTIONS
  // ===========================================================================

  describe('additional history actions', () => {
    it('setClipboard sets clipboard directly', () => {
      const shapes = [{ id: 's1', type: 'rect' as const, x: 0, y: 0, w: 50, h: 50 }];
      getStore().setClipboard(shapes);
      expect(getStore().clipboard).toEqual(shapes);
    });

    it('setClipboard can clear with null', () => {
      getStore().setClipboard([{ id: 's1', type: 'rect' as const, x: 0, y: 0, w: 50, h: 50 }]);
      getStore().setClipboard(null);
      expect(getStore().clipboard).toBeNull();
    });

    it('clearHistory clears all history', () => {
      getStore().pushHistory([{ id: 's1', type: 'rect', x: 0, y: 0, w: 100, h: 100 }], 'Step 1');
      getStore().pushHistory([{ id: 's2', type: 'rect', x: 10, y: 10, w: 100, h: 100 }], 'Step 2');
      expect(getStore().history.length).toBe(2);
      getStore().clearHistory();
      expect(getStore().history).toEqual([]);
      expect(getStore().historyIndex).toBe(-1);
    });
  });

  // ===========================================================================
  // ADDITIONAL TOOLS ACTIONS
  // ===========================================================================

  describe('additional tools actions', () => {
    it('setActionMode sets action mode', () => {
      getStore().setActionMode('move');
      expect(getStore().actionMode).toBe('move');
      getStore().setActionMode('resize');
      expect(getStore().actionMode).toBe('resize');
      getStore().setActionMode(null);
      expect(getStore().actionMode).toBeNull();
    });

    it('setLineColor sets line color', () => {
      getStore().setLineColor('#ff0000');
      expect(getStore().lineColor).toBe('#ff0000');
    });

    it('setLineMarker sets line marker', () => {
      getStore().setLineMarker('arrow');
      expect(getStore().lineMarker).toBe('arrow');
      getStore().setLineMarker('circle');
      expect(getStore().lineMarker).toBe('circle');
      getStore().setLineMarker('none');
      expect(getStore().lineMarker).toBe('none');
    });

    it('setAngleSnap sets angle snap directly', () => {
      getStore().setAngleSnap(false);
      expect(getStore().angleSnap).toBe(false);
      getStore().setAngleSnap(true);
      expect(getStore().angleSnap).toBe(true);
    });

    it('toggleOrthoMode toggles ortho mode', () => {
      expect(getStore().orthoMode).toBe(false);
      getStore().toggleOrthoMode();
      expect(getStore().orthoMode).toBe(true);
      getStore().toggleOrthoMode();
      expect(getStore().orthoMode).toBe(false);
    });

    it('toggleShowLineAngle toggles line angle display', () => {
      const initial = getStore().showLineAngle;
      getStore().toggleShowLineAngle();
      expect(getStore().showLineAngle).toBe(!initial);
    });

    it('toggleShowLineCoords toggles line coords display', () => {
      expect(getStore().showLineCoords).toBe(false);
      getStore().toggleShowLineCoords();
      expect(getStore().showLineCoords).toBe(true);
    });

    it('setSmartSnapEnabled sets smart snap directly', () => {
      getStore().setSmartSnapEnabled(false);
      expect(getStore().smartSnapEnabled).toBe(false);
      getStore().setSmartSnapEnabled(true);
      expect(getStore().smartSnapEnabled).toBe(true);
    });

    it('toggleDistanceIndicators toggles distance indicators', () => {
      const initial = getStore().showDistanceIndicators;
      getStore().toggleDistanceIndicators();
      expect(getStore().showDistanceIndicators).toBe(!initial);
    });
  });

  // ===========================================================================
  // ADDITIONAL MODULE ACTIONS
  // ===========================================================================

  describe('additional module actions', () => {
    it('setShowModulePanel sets panel visibility directly', () => {
      getStore().setShowModulePanel(true);
      expect(getStore().showModulePanel).toBe(true);
      getStore().setShowModulePanel(false);
      expect(getStore().showModulePanel).toBe(false);
    });

    it('setCustomDepth sets custom depth', () => {
      getStore().setCustomDepth(600);
      expect(getStore().customDepth).toBe(600);
    });

    it('setDepthModified sets depth modified flag', () => {
      getStore().setDepthModified(true);
      expect(getStore().depthModified).toBe(true);
      getStore().setDepthModified(false);
      expect(getStore().depthModified).toBe(false);
    });
  });

  // ===========================================================================
  // ADDITIONAL UI ACTIONS
  // ===========================================================================

  describe('additional UI actions', () => {
    it('setShowComponentPanel sets component panel visibility', () => {
      getStore().setShowComponentPanel(true);
      expect(getStore().showComponentPanel).toBe(true);
      getStore().setShowComponentPanel(false);
      expect(getStore().showComponentPanel).toBe(false);
    });

    it('setSelectedComponent sets selected component', () => {
      const component = { name: 'Test', width: 100, height: 50, shapes: [] };
      getStore().setSelectedComponent(component);
      expect(getStore().selectedComponent).toEqual(component);
    });

    it('setSelectedComponent can clear with null', () => {
      getStore().setSelectedComponent({ name: 'Test', width: 100, height: 50, shapes: [] });
      getStore().setSelectedComponent(null);
      expect(getStore().selectedComponent).toBeNull();
    });

    it('setComponentFilter sets component filter', () => {
      getStore().setComponentFilter('cabinet');
      expect(getStore().componentFilter).toBe('cabinet');
      getStore().setComponentFilter('hardware');
      expect(getStore().componentFilter).toBe('hardware');
      getStore().setComponentFilter('all');
      expect(getStore().componentFilter).toBe('all');
    });

    it('setShow3DPreview sets 3D preview visibility', () => {
      getStore().setShow3DPreview(true);
      expect(getStore().show3DPreview).toBe(true);
      getStore().setShow3DPreview(false);
      expect(getStore().show3DPreview).toBe(false);
    });

    it('setPreviewRotation sets preview rotation', () => {
      getStore().setPreviewRotation({ x: 45, y: 90 });
      expect(getStore().previewRotation).toEqual({ x: 45, y: 90 });
    });

    it('setShowMeasurementPanel sets measurement panel visibility', () => {
      getStore().setShowMeasurementPanel(true);
      expect(getStore().showMeasurementPanel).toBe(true);
      getStore().setShowMeasurementPanel(false);
      expect(getStore().showMeasurementPanel).toBe(false);
    });

    it('setShowAllDimensions sets all dimensions visibility', () => {
      getStore().setShowAllDimensions(false);
      expect(getStore().showAllDimensions).toBe(false);
      getStore().setShowAllDimensions(true);
      expect(getStore().showAllDimensions).toBe(true);
    });
  });

  // ===========================================================================
  // RESET STORE
  // ===========================================================================

  describe('resetStore', () => {
    it('resets all state to initial values', () => {
      // Modify various state
      getStore().setZoom(2);
      getStore().setMode('line');
      getStore().setShapes([{ id: 'test', type: 'rect', x: 0, y: 0, w: 100, h: 100 }]);
      getStore().pushHistory([], 'Test');
      getStore().setModuleConfig({
        unitType: 'wardrobe',
        name: 'Test',
        widthMm: 1000,
        heightMm: 2000,
        depthMm: 500,
        shutterCount: 2,
        sectionCount: 2,
        loftEnabled: false,
        loftHeightMm: 0,
        carcassMaterial: 'plywood',
        shutterMaterial: 'laminate',
      });

      // Reset
      getStore().resetStore();

      // Verify reset
      expect(getStore().zoom).toBe(1);
      expect(getStore().mode).toBe('select');
      expect(getStore().shapes).toEqual([]);
      expect(getStore().history).toEqual([]);
      expect(getStore().moduleConfig).toBeNull();
    });
  });
});
