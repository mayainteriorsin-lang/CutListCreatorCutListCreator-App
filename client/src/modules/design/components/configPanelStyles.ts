/**
 * Config Panel Shared Styles and Constants
 * Extracted from ModuleConfigPanelUI.tsx for reuse across components.
 */

import type { WardrobeSectionType } from "../engine/shapeGenerator";

// =============================================================================
// STYLE CONSTANTS
// =============================================================================

export const sectionStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #f1f5f9",
};

export const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  fontWeight: 500,
  marginBottom: 4,
  display: "block",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid #e2e8f0",
  borderRadius: 5,
  fontSize: 12,
  outline: "none",
  background: "#fff",
};

export const numberInputStyle: React.CSSProperties = {
  ...inputStyle,
  width: 70,
};

export const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6,
};

// =============================================================================
// OPTION CONSTANTS
// =============================================================================

export const CARCASS_OPTIONS = [
  { value: "plywood", label: "Plywood" },
  { value: "mdf", label: "MDF" },
  { value: "particle_board", label: "Particle Board" },
  { value: "hdhmr", label: "HDHMR" },
];

export const SHUTTER_OPTIONS = [
  { value: "laminate", label: "Laminate" },
  { value: "acrylic", label: "Acrylic" },
  { value: "veneer", label: "Veneer" },
  { value: "lacquer", label: "Lacquer" },
  { value: "membrane", label: "Membrane" },
];

export const SECTION_TYPE_LABELS: Record<WardrobeSectionType, string> = {
  long_hang: "Long Hang",
  short_hang: "Short Hang",
  shelves: "Shelves",
  drawers: "Drawers",
  open: "Open",
};

export const TYPE_COLORS: Record<string, string> = {
  wardrobe: "#6366f1",
  kitchen: "#f59e0b",
  tv_unit: "#06b6d4",
  dresser: "#ec4899",
  study_table: "#8b5cf6",
  shoe_rack: "#f97316",
  book_shelf: "#10b981",
  crockery_unit: "#14b8a6",
  pooja_unit: "#b45309",
  vanity: "#a855f7",
  bar_unit: "#ef4444",
  display_unit: "#3b82f6",
  other: "#6b7280",
};
