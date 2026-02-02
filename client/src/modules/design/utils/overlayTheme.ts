/**
 * Overlay Theme Constants
 *
 * Centralized styling for all overlay components in the Design module.
 * Ensures visual consistency across PanelSelectionOverlay, CenterPostOverlay, and PropertiesPanel.
 */

import type { CSSProperties } from "react";

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const OVERLAY_COLORS = {
  // Backgrounds
  bgPrimary: "#1e293b",      // Slate-800 - main overlay background
  bgInput: "#0f172a",        // Slate-900 - input backgrounds
  bgHover: "#334155",        // Slate-700 - hover states

  // Text
  textPrimary: "#fff",       // White - primary text
  textSecondary: "#94a3b8",  // Slate-400 - secondary/muted text
  textMuted: "#64748b",      // Slate-500 - labels

  // Borders
  borderDefault: "#334155",  // Slate-700 - default borders
  borderBlue: "#3b82f6",     // Blue-500 - panel selection
  borderOrange: "#f59e0b",   // Amber-500 - center post
  borderGreen: "#10b981",    // Emerald-500 - edit mode

  // Action buttons
  btnCopy: "#3b82f6",        // Blue-500
  btnCopyActive: "#2563eb",  // Blue-600
  btnMove: "#f59e0b",        // Amber-500
  btnMoveActive: "#d97706",  // Amber-600
  btnEdit: "#10b981",        // Emerald-500
  btnDelete: "#dc2626",      // Red-600
  btnDeleteActive: "#b91c1c", // Red-700

  // Shape colors (for shape generator)
  shapeShelf: "#d4d4d4",     // Neutral-300 - shelf fill
  shapePost: "#c0c0c0",      // Gray - center post fill
  shapeBack: "#f0f0f0",      // Light gray - back panel fill
  strokeDark: "#333",        // Dark stroke
  strokeLight: "#999",       // Light stroke
} as const;

// ============================================================================
// OVERLAY CONTAINER STYLES
// ============================================================================

export type OverlayVariant = "panel" | "centerPost" | "properties";

const BORDER_COLORS: Record<OverlayVariant, string> = {
  panel: OVERLAY_COLORS.borderBlue,
  centerPost: OVERLAY_COLORS.borderOrange,
  properties: OVERLAY_COLORS.borderBlue,
};

/**
 * Get base container style for overlays
 */
export function getOverlayContainerStyle(variant: OverlayVariant): CSSProperties {
  return {
    position: "absolute",
    left: 16,
    top: 100,
    background: OVERLAY_COLORS.bgPrimary,
    border: `2px solid ${BORDER_COLORS[variant]}`,
    borderRadius: 8,
    padding: "12px 16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    zIndex: 200,
    minWidth: 200,
  };
}

// ============================================================================
// TEXT STYLES
// ============================================================================

export const OVERLAY_TEXT_STYLES = {
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: OVERLAY_COLORS.textPrimary,
    textAlign: "center" as const,
  },
  dimensions: {
    fontSize: 11,
    color: OVERLAY_COLORS.textSecondary,
    textAlign: "center" as const,
    marginBottom: 12,
  },
  coordinates: {
    fontSize: 10,
    color: OVERLAY_COLORS.textSecondary,
  },
  label: {
    fontSize: 9,
    color: OVERLAY_COLORS.textMuted,
  },
} as const;

// ============================================================================
// BUTTON STYLES
// ============================================================================

export type ButtonVariant = "copy" | "move" | "edit" | "delete";

interface ButtonStyleOptions {
  variant: ButtonVariant;
  isActive?: boolean;
  isDisabled?: boolean;
}

const BUTTON_COLORS: Record<ButtonVariant, { default: string; active: string }> = {
  copy: { default: OVERLAY_COLORS.btnCopy, active: OVERLAY_COLORS.btnCopyActive },
  move: { default: OVERLAY_COLORS.btnMove, active: OVERLAY_COLORS.btnMoveActive },
  edit: { default: OVERLAY_COLORS.btnEdit, active: OVERLAY_COLORS.btnEdit },
  delete: { default: OVERLAY_COLORS.btnDelete, active: OVERLAY_COLORS.btnDeleteActive },
};

const BUTTON_CURSORS: Record<ButtonVariant, string> = {
  copy: "copy",
  move: "move",
  edit: "pointer",
  delete: "not-allowed",
};

/**
 * Get button style for action buttons
 */
export function getButtonStyle(options: ButtonStyleOptions): CSSProperties {
  const { variant, isActive = false, isDisabled = false } = options;
  const colors = BUTTON_COLORS[variant];

  return {
    flex: 1,
    padding: "8px 10px",
    background: isActive ? colors.active : colors.default,
    color: OVERLAY_COLORS.textPrimary,
    border: isActive ? "2px solid #fff" : "none",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: BUTTON_CURSORS[variant],
    opacity: isDisabled ? 0.5 : 1,
  };
}

/**
 * Get toggle button style (for Move/Resize toggles)
 */
export function getToggleButtonStyle(isActive: boolean): CSSProperties {
  return {
    padding: "4px 12px",
    background: isActive ? OVERLAY_COLORS.btnMove : OVERLAY_COLORS.bgHover,
    color: isActive ? "#000" : OVERLAY_COLORS.textSecondary,
    border: "none",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 500,
    cursor: isActive ? "move" : "pointer",
  };
}

// ============================================================================
// INPUT STYLES
// ============================================================================

export const INPUT_STYLE: CSSProperties = {
  width: "100%",
  padding: "4px 6px",
  background: OVERLAY_COLORS.bgInput,
  border: `1px solid ${OVERLAY_COLORS.borderDefault}`,
  borderRadius: 4,
  color: OVERLAY_COLORS.textPrimary,
  fontSize: 11,
};

// ============================================================================
// LAYOUT STYLES
// ============================================================================

export const LAYOUT_STYLES = {
  buttonContainer: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap" as const,
  },
  toggleContainer: {
    display: "flex",
    gap: 4,
    marginBottom: 10,
    justifyContent: "center" as const,
  },
  propertiesGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 6,
    marginBottom: 12,
  },
} as const;
