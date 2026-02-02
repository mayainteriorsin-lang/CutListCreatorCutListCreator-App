/**
 * Service Layer Types
 *
 * Common types and interfaces for the service layer.
 * Services orchestrate slices + engines without UI dependencies.
 */

import type {
  DrawnUnit,
  QuotationRoom,
  ClientInfo,
  QuoteMeta,
  WardrobeConfig,
  UnitType,
  RoomPhoto,
  ReferencePhoto,
  WardrobeBox,
  LoftBox,
  PricingControl, // Import kept for legacy or if restored
  MaterialPricing,
  VQStatus,
  ScaleState,
} from "../types";

// Import Store Types for accurate persistence
import type { MaterialPricingState } from '../store/v2/usePricingStore';

// ============================================================================
// Service Result Types
// ============================================================================

/**
 * Standard result type for service operations
 */
export interface ServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Async service result
 */
export type AsyncServiceResult<T = void> = Promise<ServiceResult<T>>;

// ============================================================================
// Quotation Service Types
// ============================================================================

export interface QuotationSnapshot {
  version: number;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  client: ClientInfo;
  meta: QuoteMeta;
  rooms: QuotationRoom[];
  activeRoomIndex: number;
  currentUnits: DrawnUnit[];
  timestamp: number;
}

export interface QuotationSummary {
  roomCount: number;
  totalUnits: number;
  totalSqft: number;
  grandTotal: number;
  status: string;
}

// ============================================================================
// Room Service Types
// ============================================================================

export interface RoomData {
  id: string;
  name: string;
  unitType: UnitType;
  units: DrawnUnit[];
  photo?: RoomPhoto;
  referencePhotos?: ReferencePhoto[];
}

export interface RoomCreateParams {
  unitType: UnitType;
  name?: string;
  copyFromCurrent?: boolean;
}

export interface RoomSaveResult {
  roomId: string;
  unitCount: number;
  pricingUpdated: boolean;
}

// ============================================================================
// Pricing Service Types
// ============================================================================

export interface PricingSummary {
  rooms: Array<{
    roomId: string;
    roomName: string;
    unitCount: number;
    carcassSqft: number;
    shutterSqft: number;
    loftSqft: number;
    subtotal: number;
    addOns: number;
  }>;
  totals: {
    totalCarcassSqft: number;
    totalShutterSqft: number;
    totalLoftSqft: number;
    totalSqft: number;
    subtotal: number;
    addOnsTotal: number;
    gst: number;
    grandTotal: number;
  };
}

export interface UnitPricingUpdate {
  unitId: string;
  config?: Partial<WardrobeConfig>;
  dimensions?: { widthMm: number; heightMm: number };
}

// ============================================================================
// Export Service Types
// ============================================================================

export type ExportFormat = "pdf" | "excel" | "clipboard" | "whatsapp";

export interface ExportParams {
  format: ExportFormat;
  includePhotos?: boolean;
  includeBreakdown?: boolean;
  canvasImageData?: string;
}

export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  filename?: string;
  error?: string;
}

// ============================================================================
// Drawing Service Types
// ============================================================================

export interface DrawingParams {
  box: { x: number; y: number; width: number; height: number };
  drawModeType: "shutter" | "shutter_loft" | "loft_only";
}

export interface UnitUpdateParams {
  unitId: string;
  updates: Partial<DrawnUnit>;
}

// ============================================================================
// Service Context
// ============================================================================

/**
 * Context passed to all services for accessing store state and actions
 */
export interface ServiceContext {
  getState: () => unknown;
  // Additional context as needed
}

// ============================================================================
// Persistence Types
// ============================================================================

/**
 * Pricing Rates Structure (matches usePricingStore)
 */
export interface StoredPricingRates {
  sqftRate: number;
  loftSqftRate: number;
  shutterLoftShutterRate: number;
  shutterLoftLoftRate: number;
  addOnPricing: Record<string, number>;
}

/**
 * The full persisted state of a quotation.
 * Mirrors the structure saved by QuotationService.save
 */
export interface PersistedQuotationState {
  // Meta & Client
  leadId: string | null;
  quoteId: string | null;
  client: ClientInfo;
  meta: QuoteMeta;
  status: VQStatus;
  version: number;

  // Canvas & Rooms
  drawnUnits: DrawnUnit[];
  wardrobeBox: WardrobeBox;
  loftBox: LoftBox;
  roomPhoto: RoomPhoto | null;
  referencePhotos: ReferencePhoto[];
  scale: ScaleState;
  quotationRooms: QuotationRoom[];
  activeRoomIndex: number;
  unitType: UnitType;
  customUnitTypes: string[];

  // Pricing & Config
  pricingControl: StoredPricingRates;
  wardrobeConfig: WardrobeConfig;
  materialPricing: MaterialPricingState;
  pricingConfig?: WardrobeConfig; // Legacy compat

  // Legacy/Drawing State (kept for now)
  activeUnitIndex: number;
  drawMode: string; // Keeping as string to avoid circular dep if DrawingMode not easily accessible
  editMode: string;
  activePhotoId: string | null;
  floorPlanEnabled: boolean;
  canvas3DViewEnabled: boolean;
  shutterCount: number;
  shutterDividerXs: number[];
  loftEnabled: boolean;
  loftHeightRatio: number;
  loftShutterCount: number;
  loftDividerXs: number[];

  // Index signature for extensibility/legacy extra fields
  [key: string]: unknown;
}
