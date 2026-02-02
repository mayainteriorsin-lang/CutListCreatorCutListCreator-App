// ============================================
// DesignCanvas.tsx - REFACTORED IMPLEMENTATION
// ============================================
// SVG canvas with full shape rendering, mouse handlers, keyboard shortcuts,
// selection, move, dimension, measure, and all interaction modes.
//
// Refactored structure:
// - Mouse handlers: useMouseHandlers hook
// - Helper functions: canvasHelpers.ts
// - Rendering: renderHelpers.tsx
// - Keyboard: useKeyboardShortcuts hook

import React, { useRef, useCallback, useEffect, useMemo, useState } from "react";
import { useDesignStore } from "../store/designStore";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useMouseHandlers } from "../hooks/useMouseHandlers";
import type { Shape, RectShape } from "../types";
import type { WardrobeSection } from "../engine/shapeGenerator";
import {
  renderGrid,
  renderShape as renderShapeHelper,
  renderTempShape as renderTempShapeHelper,
  renderAlignmentGuides,
  renderComponentPreview,
  renderBoundaryGuides,
} from "./renderHelpers";
import { renderInnerDimensions } from "../dimensions";
import { getCarcassBounds, getCursorStyle, calculateViewBox } from "../utils/canvasHelpers";
import { ShelfContextMenu } from "../panels";
import {
  getClickTarget,
  clientToSvgCoordinates,
  calculateMenuPosition,
} from "../engine/clickTargetDetector";

export default function DesignCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const panRef = useRef({ x: 0, y: 0 });

  // Context menu state for shelf editing
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    sectionIndex: number;
    sectionType: string;
    shelfCount: number;
  } | null>(null);

  // Get state from store
  const {
    // Canvas
    gridSize,
    gridVisible,
    zoom,
    canvasSize,
    setCanvasSize,
    // Tools
    mode,
    actionMode,
    dimFontSize,
    // Shapes
    shapes,
    selectedId,
    selectedIds,
    temp,
    alignmentGuides,
    cursorPos,
    hoveredPanelId,
    setHoveredPanelId,
    setSelectedId,
    clearSelection,
    // Module
    moduleConfig,
    updateModuleConfig,
    regenerateModuleShapes,
    // UI
    selectedComponent,
  } = useDesignStore();

  // Use keyboard shortcuts hook
  useKeyboardShortcuts({ enabled: true });

  // Use mouse handlers hook
  const { onMouseDown, onMouseMove, onMouseUp, onMouseLeave, dragRef, resizeRef } =
    useMouseHandlers({ svgRef, panRef });

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle right-click on canvas to show shelf context menu
  // Uses extracted getClickTarget for clean separation of concerns
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      e.preventDefault();

      const svg = svgRef.current;
      if (!svg) return;

      // Convert client coordinates to SVG coordinates
      const svgPoint = clientToSvgCoordinates(e.clientX, e.clientY, svg);
      if (!svgPoint) return;

      // Use centralized click target detection
      const target = getClickTarget(svgPoint, moduleConfig, shapes);

      // Only show shelf menu for section clicks
      if (target.type !== "section") {
        return; // Let panel/post selection handle other click types
      }

      // Clear any existing panel selection
      clearSelection();

      // Calculate menu position
      const position = calculateMenuPosition(e.clientX, e.clientY);

      setContextMenu({
        visible: true,
        position,
        sectionIndex: target.sectionIndex ?? 0,
        sectionType: target.sectionType ?? "shelves",
        shelfCount: target.shelfCount ?? 0,
      });
    },
    [moduleConfig, shapes, clearSelection]
  );

  // Handle shelf count change from context menu
  const handleShelfCountChange = useCallback(
    (newCount: number) => {
      if (!moduleConfig || !contextMenu) return;

      const { sections } = moduleConfig;

      // Update the context menu state for immediate UI feedback
      setContextMenu(prev => prev ? { ...prev, shelfCount: newCount } : null);

      if (sections && sections.length > 0) {
        // Update specific section's shelf count
        const updatedSections = sections.map((section, idx) => {
          if (idx === contextMenu.sectionIndex) {
            return { ...section, shelfCount: newCount };
          }
          return section;
        });

        const newConfig = { ...moduleConfig, sections: updatedSections };
        regenerateModuleShapes(newConfig);
      } else {
        // For wardrobe_carcass without sections, create sections based on center posts
        const postCount = moduleConfig.centerPostCount ?? 0;
        const numSections = postCount + 1;

        // Create sections array with the clicked section having the new shelf count
        const newSections: WardrobeSection[] = Array.from({ length: numSections }, (_, idx) => ({
          type: "shelves" as const,
          widthMm: 0,
          shelfCount: idx === contextMenu.sectionIndex ? newCount : 0,
        }));

        const newConfig = { ...moduleConfig, sections: newSections, sectionCount: numSections };
        regenerateModuleShapes(newConfig);
      }
    },
    [moduleConfig, contextMenu, regenerateModuleShapes]
  );

  // Resize canvas on window resize
  useEffect(() => {
    const onResize = () => {
      const container = svgRef.current?.parentElement;
      if (!container) return;
      setCanvasSize({
        w: Math.max(600, container.clientWidth),
        h: Math.max(400, container.clientHeight),
      });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setCanvasSize]);

  // =========================================================================
  // RENDERING
  // =========================================================================

  const renderShapeItem = useCallback(
    (s: Shape) => {
      const isSelected = s.id === selectedId || selectedIds.has(s.id);
      const isHovered = hoveredPanelId === s.id;

      return renderShapeHelper({
        shape: s,
        isSelected,
        isHovered,
        onMouseEnter: () => setHoveredPanelId(s.id),
        onMouseLeave: () => setHoveredPanelId(null),
        dimFontSize,
      });
    },
    [selectedId, selectedIds, hoveredPanelId, setHoveredPanelId, dimFontSize]
  );

  // Calculate cursor style
  const cursor = getCursorStyle(
    resizeRef.current !== null,
    dragRef.current !== null,
    actionMode
  );

  // Calculate viewBox to auto-fit content (wardrobe) centered and maximized
  const viewBox = useMemo(() => {
    const result = calculateViewBox({
      shapes,
      canvasSize,
      zoom,
      dimFontSize,
      padding: 80,
    });
    return result.viewBox;
  }, [shapes, canvasSize, zoom, dimFontSize]);

  return (
    <>
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      style={{ background: "#ffffff", cursor, flex: 1 }}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onContextMenu={handleContextMenu}
    >
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Grid */}
      {renderGrid({
        gridSize,
        gridVisible,
        canvasWidth: canvasSize.w,
        canvasHeight: canvasSize.h,
      })}

      {/* Shapes */}
      <g>
        {shapes.map(renderShapeItem)}
        {renderTempShapeHelper({ temp })}
      </g>

      {/* Inner dimensions for wardrobe carcass - uses unified dimension config */}
      {moduleConfig?.unitType === "wardrobe_carcass" &&
        renderInnerDimensions({ shapes, fontSize: dimFontSize })}

      {/* Alignment guides */}
      {renderAlignmentGuides({ guides: alignmentGuides })}

      {/* Boundary guides when dragging center post */}
      {dragRef.current &&
        (() => {
          const bounds = getCarcassBounds(moduleConfig, shapes);
          if (!bounds) return null;
          const topPanel = shapes.find((s) => s.id === "MOD-TOP") as RectShape | undefined;
          const bottomPanel = shapes.find((s) => s.id === "MOD-BOTTOM") as RectShape | undefined;
          if (!topPanel || !bottomPanel) return null;
          const oy = topPanel.y + topPanel.h;
          const H = bottomPanel.y - oy;
          return renderBoundaryGuides({
            minX: bounds.minX,
            maxX: bounds.maxX,
            topY: oy,
            height: H,
          });
        })()}

      {/* Component preview */}
      {mode === "component" &&
        selectedComponent &&
        cursorPos &&
        renderComponentPreview({ component: selectedComponent, cursorPos })}
    </svg>

    {/* Shelf Context Menu */}
    {contextMenu?.visible && (
      <ShelfContextMenu
        position={contextMenu.position}
        shelfCount={contextMenu.shelfCount}
        sectionIndex={contextMenu.sectionIndex}
        sectionType={contextMenu.sectionType}
        onShelfCountChange={handleShelfCountChange}
        onClose={closeContextMenu}
      />
    )}
    </>
  );
}
