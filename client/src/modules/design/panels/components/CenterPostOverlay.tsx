/**
 * Center Post Selection Overlay
 *
 * Floating overlay when a center post is selected.
 * Shows Move/Resize toggle and Copy/Edit/Delete buttons.
 */

import React from "react";
import { useDesignStore } from "../../store/designStore";
import { useShapeActions } from "../hooks";
import { isCenterPost, getPostIndex } from "../utils";
import {
  getOverlayContainerStyle,
  getButtonStyle,
  getToggleButtonStyle,
  OVERLAY_TEXT_STYLES,
  LAYOUT_STYLES,
} from "../../utils/overlayTheme";
import type { RectShape } from "../../types";

export function CenterPostOverlay() {
  const { shapes, selectedId, moduleConfig, actionMode, setActionMode } = useDesignStore();

  // IMPORTANT: All hooks must be called before any early returns (Rules of Hooks)
  const { handleCopy, handleEdit, handleDelete } = useShapeActions({
    selectedId,
    shapeType: "centerPost",
  });

  // Check visibility conditions
  const isPost = selectedId ? isCenterPost(selectedId) : false;
  const isWardrobeCarcass = moduleConfig?.unitType === "wardrobe_carcass";

  // Only show for center posts in wardrobe carcass
  if (!selectedId || !isPost || !isWardrobeCarcass) {
    return null;
  }

  const postIndex = getPostIndex(selectedId);
  const shape = shapes.find(s => s.id === selectedId);

  if (!shape || shape.type !== "rect") return null;

  const r = shape as RectShape;
  const w = Math.round(r.w);
  const h = Math.round(r.h);

  return (
    <div style={getOverlayContainerStyle("centerPost")}>
      {/* Title */}
      <div style={OVERLAY_TEXT_STYLES.title}>
        Center Post {postIndex}
      </div>

      {/* Dimensions */}
      <div style={{ ...OVERLAY_TEXT_STYLES.dimensions, marginBottom: 6 }}>
        {w} × {h} mm
      </div>

      {/* Move/Resize toggle */}
      <div style={LAYOUT_STYLES.toggleContainer}>
        <button
          onClick={() => setActionMode(actionMode === "move" ? null : "move")}
          style={getToggleButtonStyle(actionMode === "move")}
        >
          ← → Move
        </button>
        <button
          onClick={() => setActionMode(actionMode === "resize" ? null : "resize")}
          style={{
            ...getToggleButtonStyle(actionMode === "resize"),
            background: actionMode === "resize" ? "#3b82f6" : "#334155",
            color: actionMode === "resize" ? "#fff" : "#94a3b8",
          }}
        >
          ↑ ↓ Resize
        </button>
      </div>

      {/* Action Buttons */}
      <div style={LAYOUT_STYLES.buttonContainer}>
        <button
          onClick={handleCopy}
          style={getButtonStyle({ variant: "copy", isActive: actionMode === "copy" })}
        >
          Copy
        </button>
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
    </div>
  );
}

export default CenterPostOverlay;
