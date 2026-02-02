/**
 * AI-related types for Visual Quotation module
 * AI suggestions, detection results
 */

import type { UnitType } from "./core";
import type { WardrobeBox } from "./wardrobe";

export interface AiInteriorBox {
  xNorm: number;
  yNorm: number;
  wNorm: number;
  hNorm: number;
}

export type AiInteriorComponentType =
  | "loft"
  | "door"
  | "drawer_stack"
  | "shelf_column"
  | "hanging_zone"
  | "base_cabinet_row"
  | "wall_cabinet_row"
  | "tall_unit"
  | "tv_panel"
  | "side_storage";

export interface AiInteriorComponent {
  type: AiInteriorComponentType;
  box: AiInteriorBox;
  countHint?: number;
  notes?: string;
}

export interface AiInteriorSuggestion {
  detected: boolean;
  confidence: "low" | "medium" | "high";
  unitType: UnitType;
  primaryBox: AiInteriorBox;
  components: AiInteriorComponent[];
  suggestions?: {
    doors?: number;
    hasLoft?: boolean;
    layoutHint?: string;
  };
}

export interface AiWardrobeLayoutSuggestion {
  wardrobeBox: AiInteriorBox;
  loft: { present: boolean; heightRatio?: number };
  suggestedShutters: number;
  baySplits?: number[];
  confidence: number;
}

export interface AiSuggestion {
  box?: WardrobeBox;
  doors?: number;
  loft?: boolean;
  confidence: number;
}

export interface AiPaidSuggestion {
  detected: boolean;
  confidence: "low" | "medium" | "high";
  wardrobe?: {
    hasLoft: boolean;
    doors: number;
    zones: string[];
  };
}
