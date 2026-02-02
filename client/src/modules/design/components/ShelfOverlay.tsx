// ============================================
// ShelfOverlay.tsx
// ============================================
// Floating overlay when a shelf is selected.
// Shows Move (vertical) and Delete buttons.

import React from "react";
import { useDesignStore } from "../store/designStore";
import {
  getOverlayContainerStyle,
  getButtonStyle,
  getToggleButtonStyle,
  OVERLAY_TEXT_STYLES,
  LAYOUT_STYLES,
} from "../utils/overlayTheme";
import type { RectShape } from "../types";

// Parse shelf ID to get section and shelf indices
// Format: MOD-SHELF-{sectionIndex}-{shelfIndex}
function parseShelfId(id: string): { sectionIndex: number; shelfIndex: number } | null {
  const match = id.match(/MOD-SHELF-(\d+)-(\d+)/);
  if (!match) return null;
  return {
    sectionIndex: parseInt(match[1], 10) - 1, // Convert to 0-based
    shelfIndex: parseInt(match[2], 10),
  };
}

export default function ShelfOverlay() {
  const {
    shapes,
    selectedId,
    moduleConfig,
    actionMode,
    setActionMode,
    setMode,
    setShowModulePanel,
    regenerateModuleShapes,
    setSelectedId,
    setSelectedIds,
  } = useDesignStore();

  // Check if selected is a shelf
  const isShelf = selectedId?.startsWith("MOD-SHELF-");

  // Only show for shelves in wardrobe carcass
  if (!selectedId || !isShelf || moduleConfig?.unitType !== "wardrobe_carcass") {
    return null;
  }

  const shelfInfo = parseShelfId(selectedId);
  if (!shelfInfo) return null;

  const shape = shapes.find(s => s.id === selectedId);
  if (!shape || shape.type !== "rect") return null;

  const r = shape as RectShape;
  const w = Math.round(r.w);
  const h = Math.round(r.h);

  // Handle move mode - enable vertical dragging
  const handleMove = () => {
    setActionMode(actionMode === "move" ? null : "move");
    if (actionMode !== "move") {
      setMode("move");
    }
  };

  // Handle edit - open config panel
  const handleEdit = () => {
    setActionMode(null);
    setShowModulePanel(true);
  };

  // Handle delete - remove this shelf
  const handleDelete = () => {
    if (!moduleConfig) return;
    setActionMode("delete");

    const { sections } = moduleConfig;
    if (sections && sections.length > shelfInfo.sectionIndex) {
      const section = sections[shelfInfo.sectionIndex];
      const currentCount = section.shelfCount ?? 0;

      if (currentCount > 0) {
        // Reduce shelf count for this section
        const updatedSections = sections.map((sec, idx) => {
          if (idx === shelfInfo.sectionIndex) {
            // Remove the shelf position if custom positions exist
            const updatedPositions = sec.shelfPositions
              ? sec.shelfPositions.filter((_, i) => i !== shelfInfo.shelfIndex - 1)
              : undefined;
            return {
              ...sec,
              shelfCount: currentCount - 1,
              shelfPositions: updatedPositions,
            };
          }
          return sec;
        });

        const newConfig = { ...moduleConfig, sections: updatedSections };
        regenerateModuleShapes(newConfig);
      }
    }

    setSelectedId(null);
    setSelectedIds(new Set());
    setTimeout(() => setActionMode(null), 500);
  };

  return (
    <div style={{
      ...getOverlayContainerStyle("panel"),
      border: "2px solid #8b5cf6", // Purple for shelves
    }}>
      {/* Title */}
      <div style={OVERLAY_TEXT_STYLES.title}>
        Shelf {shelfInfo.shelfIndex}
      </div>

      {/* Section info */}
      <div style={{ fontSize: 10, color: "#a78bfa", textAlign: "center" as const }}>
        Section {shelfInfo.sectionIndex + 1}
      </div>

      {/* Dimensions */}
      <div style={{ ...OVERLAY_TEXT_STYLES.dimensions, marginBottom: 6 }}>
        {w} × {h} mm
      </div>

      {/* Move toggle */}
      <div style={LAYOUT_STYLES.toggleContainer}>
        <button
          onClick={handleMove}
          style={{
            ...getToggleButtonStyle(actionMode === "move"),
            background: actionMode === "move" ? "#8b5cf6" : "#334155",
            color: actionMode === "move" ? "#fff" : "#94a3b8",
          }}
        >
          ↑ ↓ Move Vertical
        </button>
      </div>

      {/* Action Buttons */}
      <div style={LAYOUT_STYLES.buttonContainer}>
        <button
          onClick={handleEdit}
          style={getButtonStyle({ variant: "edit" })}
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          style={getButtonStyle({ variant: "delete", isActive: actionMode === "delete" })}
        >
          Delete
        </button>
      </div>

      {/* Help text */}
      {actionMode === "move" && (
        <div style={{ fontSize: 9, color: "#a78bfa", textAlign: "center" as const, marginTop: 8 }}>
          Drag shelf up/down to reposition
        </div>
      )}
    </div>
  );
}
