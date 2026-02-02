/**
 * Visual Quotation Types - Barrel Export
 * Import all types from this single file
 */

// Core types
export type {
  VQStatus,
  RoomInputType,
  WallId,
  UnitType,
  ObstructionType,
  Confidence,
  ViewMode,
  CanvasViewMode,
  ProductionSettings,
} from "./core";

export {
  DEFAULT_UNIT_TYPES,
  SIDE_GAP_MM,
  SHUTTER_GAP_MM,
  LOFT_GAP_MM,
} from "./core";

// Room types
export type {
  ScaleCalibration,
  RoomImage,
  RoomPhoto,
  ReferencePhoto,
  ScaleState,
  ScaleLine,
  WallRegion,
  Wall,
  Obstruction,
} from "./room";

// Wardrobe types
export type {
  WardrobeBox,
  LoftDragEdge,
  LoftBox,
  WardrobeLayout,
  WardrobeSpec,
  WardrobeUnit,
  DrawnAddOn,
  DrawnUnit,
} from "./wardrobe";

// Pricing types
export type {
  RateMode,
  QuickRatePreview,
  WardrobeType,
  WardrobeAddOn,
  CarcassMaterial,
  CarcassThickness,
  EdgeBand,
  ShutterMaterial,
  ShutterFinish,
  HandleType,
  PricingUnit,
  AddOnPricing,
  MaterialPricing,
  WardrobeConfig,
} from "./pricing";

export {
  DEFAULT_ADDON_PRICING,
  DEFAULT_KITCHEN_ADDON_PRICING,
  DEFAULT_TV_UNIT_ADDON_PRICING,
  DEFAULT_DRESSER_ADDON_PRICING,
  DEFAULT_STUDY_TABLE_ADDON_PRICING,
  DEFAULT_SHOE_RACK_ADDON_PRICING,
  DEFAULT_BOOK_SHELF_ADDON_PRICING,
  DEFAULT_CROCKERY_ADDON_PRICING,
  DEFAULT_POOJA_ADDON_PRICING,
  DEFAULT_VANITY_ADDON_PRICING,
  DEFAULT_BAR_UNIT_ADDON_PRICING,
  DEFAULT_DISPLAY_UNIT_ADDON_PRICING,
  CARCASS_MATERIAL_PRICES,
  CARCASS_THICKNESS_PRICES,
  EDGE_BAND_PRICES,
  SHUTTER_MATERIAL_PRICES,
  SHUTTER_FINISH_PRICES,
  HANDLE_TYPE_PRICES,
  DEFAULT_WARDROBE_CONFIG,
} from "./pricing";

// AI types
export type {
  AiInteriorBox,
  AiInteriorComponentType,
  AiInteriorComponent,
  AiInteriorSuggestion,
  AiWardrobeLayoutSuggestion,
  AiSuggestion,
  AiPaidSuggestion,
} from "./ai";

// Quotation types
export type {
  ClientInfo,
  QuoteMeta,
  AuditEntry,
  QuotationRoom,
  RoomState,
  PricingControl,
} from "./quotation";

// Slice types (for store decomposition)
export type {
  ClientSliceState,
  ClientSliceActions,
  ClientSlice,
  PhotoSliceState,
  PhotoSliceActions,
  PhotoSlice,
  RoomInputState,
  RoomSliceState,
  RoomSliceActions,
  RoomSlice,
  UnitsSliceState,
  UnitsSliceActions,
  UnitsSlice,
  DrawingSliceState,
  DrawingSliceActions,
  DrawingSlice,
  ConfigSliceState,
  ConfigSliceActions,
  ConfigSlice,
} from "./slices";

// Rate Card types
export type {
  RateCard,
  RateCardUnitType,
  RateCardPreview,
  CreateRateCardParams,
  UpdateRateCardParams,
  RateCardFilterOptions,
  RateCardSliceState,
  RateCardSliceActions,
  RateCardSlice,
  RateCardTemplate,
  RateCardTemplateConfig,
} from "./rateCard";

export {
  RATE_CARD_TEMPLATES,
  RATE_CARD_UNIT_TYPE_LABELS,
} from "./rateCard";

// Rate Line types (grid-based editor)
export type {
  RateLineType,
  RateLine,
  RateLineGridState,
  RateLineTotals,
  RateLineUpdate,
} from "./rateLine";

export {
  RATE_LINE_LABELS,
  RATE_LINE_ORDER,
  CALCULATED_LINES,
  DEFAULT_RATE_LINES,
} from "./rateLine";

// 3D Model types
export type {
  Model3DCategory,
  Model3DPreset,
  Imported3DModel,
} from "../features/floor-plan-3d/state/types";
