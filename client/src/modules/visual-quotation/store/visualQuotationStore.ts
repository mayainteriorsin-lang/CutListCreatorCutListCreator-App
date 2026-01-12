import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calculatePricing } from "../engine/pricingEngine";
import { logActivity, upsertQuoteSummary, updateLeadStatus, getLeadById, getQuoteById } from "@/modules/crm/storage";

/**
 * Visual Quotation Store (Single Source of Truth)
 * ------------------------------------------------
 * - Holds Room Photo/Plan input, wall selection, scale calibration
 * - Holds Design Units (wardrobes) and basic configuration
 * - Holds versioning, approval lock, audit trail (loss protection)
 * - Persists to localStorage so nothing is lost (offline-safe)
 *
 * NOTE: We keep this store independent so UI can evolve (2D → 2.5D → 3D).
 */

/* ----------------------------- Types ----------------------------- */

export type VQStatus = "DRAFT" | "APPROVED";

export type RoomInputType = "PHOTO" | "MANUAL" | "PLAN";

export type WallId = "LEFT" | "RIGHT" | "CENTER" | "FULL";

// Default unit types - custom types can be added by user
export type UnitType = string;

export const DEFAULT_UNIT_TYPES = [
  "wardrobe",
  "kitchen",
  "tv_unit",
  "dresser",
  "study_table",
  "shoe_rack",
  "book_shelf",
  "crockery_unit",
  "pooja_unit",
  "vanity",
  "bar_unit",
  "display_unit",
  "other",
] as const;

export type ObstructionType =
  | "BEAM"
  | "SKIRTING"
  | "WINDOW"
  | "SWITCHBOARD"
  | "DOOR_SWING"
  | "PLINTH"
  | "OTHER";

export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type ViewMode = "CUSTOMER" | "PRODUCTION";
export type CanvasViewMode = "front" | "top" | "isometric" | "perspective" | "3d";

export interface ProductionSettings {
  roundingMm: number;
  widthReductionMm: number;
  heightReductionMm: number;
  includeLoft: boolean;
}

export const SIDE_GAP_MM = 3;
export const SHUTTER_GAP_MM = 2;
export const LOFT_GAP_MM = 3;

export interface ScaleCalibration {
  refPx: number; // pixels measured on image
  refMm: number; // real-world mm (user provided)
  pxToMm: number; // computed ratio
  confidence: Confidence;
}

export interface RoomImage {
  src: string; // dataURL (preferred) or URL
  widthPx: number;
  heightPx: number;
}

export interface RoomPhoto {
  src: string;
  width: number;
  height: number;
}

export interface WardrobeBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  source?: "ai" | "manual" | "fallback";
}

export type LoftDragEdge = "left" | "right" | "top" | "bottom" | "move";

export interface LoftBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  dragEdge: LoftDragEdge | null;
  isDragging: boolean;
  locked: boolean;
}

export interface WardrobeLayout {
  doors: number; // 2..6
  loft: boolean;
  divisions: number[]; // ratios 0-1
  loftHeight?: number; // px
  loftHeightRatio?: number; // 0..1 of wardrobe height
}

export interface ScaleState {
  px: number;
  mm: number;
  ratio: number; // mm per px
}

export interface ScaleLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lengthPx: number;
}

export interface WardrobeSpec {
  depthMm: number;
  carcassAreaSqft: number;
  shutterAreaSqft: number;
}

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

export interface WallRegion {
  // Region on the image/canvas where drawing is allowed (in px)
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Wall {
  id: WallId;
  label: string;
  region?: WallRegion; // optional now; we can set it later
}

export interface Obstruction {
  id: string;
  type: ObstructionType;
  label: string;
  // Rectangle on canvas (in px). Later we can map to mm.
  rect: { x: number; y: number; w: number; h: number };
  // Optional height/depth metadata in mm if needed
  heightMm?: number;
  notes?: string;
}

export interface ClientInfo {
  name: string;
  phone: string;
  location: string;
}

export interface QuoteMeta {
  quoteNo: string;
  dateISO: string; // YYYY-MM-DD
  validTillISO?: string;
  designer?: string;
}



export interface WardrobeUnit {
  id: string;
  wallId: WallId;

  // placement & size in mm (real-world)
  widthMm: number;
  heightMm: number;
  depthMm: number;

  // loft is part of unit but priced separately later
  loftEnabled: boolean;
  loftHeightMm: number;

  // door/shutter planning (auto later)
  sectionCount: number;

  // finishes (laminate codes)
  finish: {
    shutterLaminateCode?: string;
    loftLaminateCode?: string;
    innerLaminateCode?: string;
  };

  // swing direction placeholder per shutter (advanced later)
  doorSwingMode?: "AUTO" | "LEFT" | "RIGHT";

  // Custom shutter widths in MM (if manually adjusted)
  customShutterWidthsMm?: number[];
}

export interface AuditEntry {
  id: string;
  tsISO: string;
  action: string;
  details?: string;
}

/** Drawn unit on canvas - represents a single furniture piece drawn on the room photo */
export interface DrawnUnit {
  id: string;
  unitType: UnitType;
  box: WardrobeBox;
  loftBox?: LoftBox;
  shutterCount: number;
  shutterDividerXs: number[];
  loftEnabled: boolean;
  loftHeightRatio: number;
  loftShutterCount: number;
  loftDividerXs: number[];
  // Horizontal splitup (rows)
  horizontalDividerYs: number[];
  // Real-world dimensions for shutter/wardrobe
  widthMm: number;
  heightMm: number;
  depthMm: number;
  // Separate loft dimensions (user enters separately)
  loftWidthMm: number;
  loftHeightMm: number;
  sectionCount: number; // number of horizontal rows
}

/** Room/Area in quotation - each room has its own canvas and units */
export interface QuotationRoom {
  id: string;
  name: string; // e.g., "Master Bedroom - Wardrobe", "Kitchen"
  unitType: UnitType; // wardrobe, kitchen, tv_unit, etc.
  roomPhoto?: RoomPhoto;
  drawnUnits: DrawnUnit[];
  activeUnitIndex: number;
  // Canvas state for this room
  wardrobeBox?: WardrobeBox;
  loftBox?: LoftBox;
  shutterCount: number;
  shutterDividerXs: number[];
  loftEnabled: boolean;
  loftHeightRatio: number;
  loftShutterCount: number;
  loftDividerXs: number[];
}

export interface VisualQuotationState {
  /* CRM context */
  leadId: string | null;
  quoteId: string | null;

  /* Quotation core */
  status: VQStatus;
  version: number;

  client: ClientInfo;
  meta: QuoteMeta;
  roomType: string;
  unitType: UnitType;
  customUnitTypes: string[]; // User-defined unit types that persist

  /* Room input */
  room: {
    inputType: RoomInputType;
    image?: RoomImage;
    // manual room dimensions (mm) if inputType=MANUAL
    manualRoom?: { lengthMm: number; widthMm: number; heightMm: number };
    scale: ScaleCalibration;
    walls: Wall[];
    selectedWallId: WallId;
    obstructions: Obstruction[];
  };

  /* Room photo capture */
  roomPhoto?: RoomPhoto;

  /* Wardrobe area (px on canvas) */
  wardrobeBox?: WardrobeBox;
  loftBox?: LoftBox;

  /* Shutter layout (px on canvas) */
  shutterCount: number;
  shutterDividerXs: number[];
  gapsScaled: boolean;
  loftEnabled: boolean;
  loftHeightRatio: number;
  loftShutterCount: number;
  loftDividerXs: number[];

  /* Wardrobe layout suggestions */
  wardrobeLayout?: WardrobeLayout;

  /* Wardrobe spec (derived from photo + scale) */
  wardrobeSpec?: WardrobeSpec;

  /* AI suggestion (non-destructive) */
  aiSuggestion?: AiSuggestion;
  aiPaidSuggestion?: AiPaidSuggestion;
  aiInteriorSuggestion?: AiInteriorSuggestion;
  aiWardrobeLayoutSuggestion?: AiWardrobeLayoutSuggestion;

  /* Scale calibration */
  scale?: ScaleState;
  scaleLine?: ScaleLine;
  scaleDrawMode: boolean;

  /* Canvas drawing */
  drawMode: boolean;
  editMode: "shutter" | "carcass";

  /* Sqft rate for pricing */
  sqftRate: number;

  /* Units / design objects */
  units: WardrobeUnit[];

  /* Multi-unit canvas drawing */
  drawnUnits: DrawnUnit[];
  activeUnitIndex: number;
  activeEditPart: "shutter" | "loft"; // Which part is being edited

  /* Multi-room quotation - each room has its own canvas */
  quotationRooms: QuotationRoom[];
  activeRoomIndex: number;

  /* Profit protection */
  pricingControl: {
    marginPct: number; // hidden from customer view
    discountPct: number; // needs approval in future
    discountLocked: boolean;
    gstPct: number;
    rounding: "NONE" | "NEAREST_10" | "NEAREST_100";
  };

  /* Audit + snapshots */
  audit: AuditEntry[];
  approvedSnapshot?: string; // JSON snapshot when approved

  /* UI */
  viewMode: ViewMode;
  canvasViewMode: CanvasViewMode;
  viewIntensity: number; // 0-100, controls how intense the 3D effect is
  productionSettings: ProductionSettings;

  /* Production canvas snapshots - map of roomIndex to base64 image */
  productionCanvasSnapshots: Map<number, string>;

  backgroundImage: HTMLImageElement | null;
  locked: boolean;
  isCornerResizing: boolean;
  edgeResizeOnly: boolean;
  setEdgeResizeOnly: (value: boolean) => void;
  toggleEdgeResizeOnly: () => void;
  _loftPointer?: { x: number; y: number };

  /* ---------------- Actions ---------------- */

  // URL sync (CRM context)
  syncFromUrl: (input: { leadId?: string | null; quoteId?: string | null }) => void;

  // Client/meta
  setClientField: (key: keyof ClientInfo, value: string) => void;
  setMetaField: (key: keyof QuoteMeta, value: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setCanvasViewMode: (mode: CanvasViewMode) => void;
  setViewIntensity: (value: number) => void;
  setProductionSettings: (patch: Partial<ProductionSettings>) => void;
  setProductionCanvasSnapshots: (snapshots: Map<number, string>) => void;
  setBackgroundImage: (img: HTMLImageElement | null) => void;
  setLocked: (value: boolean) => void;
  setRoomType: (value: string) => void;
  setUnitType: (value: UnitType) => void;
  addCustomUnitType: (value: string) => void;

  // Room input
  setRoomInputType: (type: RoomInputType) => void;
  setRoomImage: (img: RoomImage) => void;
  setManualRoom: (dims: { lengthMm: number; widthMm: number; heightMm: number }) => void;

  setSelectedWall: (wallId: WallId) => void;

  // Scale calibration (critical)
  setScaleByReference: (refPx: number, refMm: number) => void;
  setScaleConfidence: (confidence: Confidence) => void;

  // Obstructions
  addObstruction: (o: Omit<Obstruction, "id">) => void;
  removeObstruction: (id: string) => void;
  clearObstructions: () => void;

  // Units
  addWardrobeUnit: (u: Partial<WardrobeUnit> & { wallId: WallId }) => void;
  updateWardrobeUnit: (id: string, patch: Partial<WardrobeUnit>) => void;
  removeWardrobeUnit: (id: string) => void;
  clearUnits: () => void;

  // Room photo capture
  setRoomPhoto: (src: string, width: number, height: number) => void;
  clearRoomPhoto: () => void;

  // Wardrobe area
  setWardrobeBox: (box: WardrobeBox) => void;
  clearWardrobeBox: () => void;
  setDrawMode: (active: boolean) => void;
  setEditMode: (mode: "shutter" | "carcass") => void;
  setSqftRate: (rate: number | ((prev: number) => number)) => void;
  setActiveEditPart: (part: "shutter" | "loft") => void;
  setWardrobeLayout: (layout: WardrobeLayout) => void;
  setShutterCount: (count: number) => void;
  setShutterDividerX: (index: number, x: number) => void;
  setLoftEnabled: (enabled: boolean) => void;
  setLoftBox: (box: LoftBox | undefined) => void;
  setLoftShutterCount: (count: number) => void;
  ensureLoftBoxForWardrobe: () => void;
  startCornerResize: () => void;
  stopCornerResize: () => void;
  startLoftDrag: (edge: LoftDragEdge) => void;
  updateLoftDrag: () => void;
  stopLoftDrag: () => void;
  lockLoft: () => void;
  updateDivisions: (divisions: number[]) => void;
  toggleLoft: (on: boolean) => void;
  setDoors: (count: number) => void;
  setDepthMm: (depthMm: number) => void;
  computeAreas: () => void;
  setAiSuggestion: (suggestion?: AiSuggestion) => void;
  clearAiSuggestion: () => void;
  applyAiSuggestion: () => void;
  setAiPaidSuggestion: (suggestion?: AiPaidSuggestion | null) => void;
  clearAiPaidSuggestion: () => void;
  applyAiPaidSuggestion: () => void;
  setAiInteriorSuggestion: (suggestion?: AiInteriorSuggestion) => void;
  clearAiInteriorSuggestion: () => void;
  applyAiInteriorSuggestionSoft: () => boolean;
  setAiWardrobeLayoutSuggestion: (suggestion?: AiWardrobeLayoutSuggestion) => void;
  clearAiWardrobeLayoutSuggestion: () => void;
  setScale: (px: number, mm: number) => void;
  clearScale: () => void;
  setScaleLine: (line?: ScaleLine) => void;
  setScaleDrawMode: (active: boolean) => void;

  // Profit controls
  setPricingControl: <K extends keyof VisualQuotationState["pricingControl"]>(
    key: K,
    value: VisualQuotationState["pricingControl"][K]
  ) => void;

  // Versioning / approval
  bumpVersion: (reason?: string) => void;
  approveQuote: () => void;
  unapproveToDraft: () => void;
  resetDraft: () => void;

  // Audit helpers
  addAudit: (action: string, details?: string) => void;

  // Reset
  resetAll: () => void;

  // Multi-unit canvas actions
  saveCurrentUnitAndAddNew: () => void;
  setActiveUnitIndex: (index: number) => void;
  deleteDrawnUnit: (index: number) => void;
  updateActiveDrawnUnit: (patch: Partial<DrawnUnit>) => void;

  // Multi-room quotation actions
  addQuotationRoom: (unitType: UnitType, name?: string) => void;
  setActiveRoomIndex: (index: number) => void;
  deleteQuotationRoom: (index: number) => void;
  updateQuotationRoom: (index: number, patch: Partial<QuotationRoom>) => void;
  saveCurrentRoomState: () => void;
  loadRoomState: (index: number) => void;
}

/* --------------------------- Utilities --------------------------- */

function nowISO(): string {
  return new Date().toISOString();
}

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function uid(prefix: string): string {
  // good enough for client-side IDs
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function computePxToMm(refPx: number, refMm: number): number {
  if (refPx <= 0 || refMm <= 0) return 0;
  return refMm / refPx;
}

function inferConfidence(pxToMm: number): Confidence {
  // Simple heuristic: if scale is set (non-zero), default to MEDIUM.
  // Later we can compute confidence based on refPx length and image resolution.
  return pxToMm > 0 ? "MEDIUM" : "LOW";
}

export function clampBoxSize(width: number, height: number): { width: number; height: number } {
  return {
    width: Math.max(20, width),
    height: Math.max(20, height),
  };
}

export function createFallbackWardrobeBox(photoWidth: number, photoHeight: number): WardrobeBox {
  const CANVAS_WIDTH = 900;
  const CANVAS_HEIGHT = 500;
  const scale = Math.min(CANVAS_WIDTH / photoWidth, CANVAS_HEIGHT / photoHeight);
  photoWidth *= scale;
  photoHeight *= scale;
  const offsetX = (CANVAS_WIDTH - photoWidth) / 2;
  const offsetY = (CANVAS_HEIGHT - photoHeight) / 2;

  const x = photoWidth * 0.15;
  const y = photoHeight * 0.1;
  const width = photoWidth * 0.7;
  const height = photoHeight * 0.8;

  return { x: x + offsetX, y: y + offsetY, width, height, rotation: 0, source: "fallback" };
}

function buildShutterDividers(
  box: WardrobeBox,
  count: number,
  _pxToMm?: number
): { dividers: number[]; gapsScaled: boolean } {
  // Allow unlimited shutters (minimum 1)
  const clamped = Math.max(Math.round(count), 1);
  if (box.width <= 0 || clamped <= 1) return { dividers: [], gapsScaled: false };

  // Simple equal pixel spacing - divide wardrobe into equal parts
  const shutterWidth = box.width / clamped;

  // Create dividers at equal intervals
  const dividers = Array.from({ length: clamped - 1 }, (_, i) => {
    return box.x + shutterWidth * (i + 1);
  });

  return { dividers, gapsScaled: false };
}

/* ------------------------- Initial State ------------------------- */

const initialState = (): Omit<
  VisualQuotationState,
  | "syncFromUrl"
  | "setClientField"
  | "setMetaField"
  | "setViewMode"
  | "setCanvasViewMode"
  | "setViewIntensity"
  | "setProductionSettings"
  | "setProductionCanvasSnapshots"
  | "setBackgroundImage"
  | "setLocked"
  | "setRoomInputType"
  | "setRoomImage"
  | "setManualRoom"
  | "setSelectedWall"
  | "setRoomType"
  | "setUnitType"
  | "addCustomUnitType"
  | "setScaleByReference"
  | "setScaleConfidence"
  | "addObstruction"
  | "removeObstruction"
  | "clearObstructions"
  | "addWardrobeUnit"
  | "updateWardrobeUnit"
  | "removeWardrobeUnit"
  | "clearUnits"
  | "setRoomPhoto"
  | "clearRoomPhoto"
  | "setWardrobeBox"
  | "clearWardrobeBox"
  | "setDrawMode"
  | "setEditMode"
  | "setSqftRate"
  | "setActiveEditPart"
  | "setWardrobeLayout"
  | "setShutterCount"
  | "setShutterDividerX"
  | "setLoftEnabled"
  | "setLoftBox"
  | "setLoftShutterCount"
  | "ensureLoftBoxForWardrobe"
  | "startCornerResize"
  | "stopCornerResize"
  | "setEdgeResizeOnly"
  | "toggleEdgeResizeOnly"
  | "startLoftDrag"
  | "updateLoftDrag"
  | "stopLoftDrag"
  | "lockLoft"
  | "updateDivisions"
  | "toggleLoft"
  | "setDoors"
  | "setDepthMm"
  | "computeAreas"
  | "setAiSuggestion"
  | "clearAiSuggestion"
  | "applyAiSuggestion"
  | "setAiPaidSuggestion"
  | "clearAiPaidSuggestion"
  | "applyAiPaidSuggestion"
  | "setAiInteriorSuggestion"
  | "clearAiInteriorSuggestion"
  | "applyAiInteriorSuggestionSoft"
  | "setAiWardrobeLayoutSuggestion"
  | "clearAiWardrobeLayoutSuggestion"
  | "setScale"
  | "clearScale"
  | "setScaleLine"
  | "setScaleDrawMode"
  | "setPricingControl"
  | "bumpVersion"
  | "approveQuote"
  | "unapproveToDraft"
  | "resetDraft"
  | "addAudit"
  | "resetAll"
  | "saveCurrentUnitAndAddNew"
  | "setActiveUnitIndex"
  | "deleteDrawnUnit"
  | "updateActiveDrawnUnit"
  | "addQuotationRoom"
  | "setActiveRoomIndex"
  | "deleteQuotationRoom"
  | "updateQuotationRoom"
  | "saveCurrentRoomState"
  | "loadRoomState"
> => ({
  leadId: null,
  quoteId: null,

  status: "DRAFT",
  version: 1,

  client: { name: "", phone: "", location: "" },

  meta: {
    quoteNo: `VQ-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
    dateISO: todayISODate(),
  },
  roomType: "Bedroom – Wardrobe",
  unitType: "wardrobe",
  customUnitTypes: [], // User-added unit types persisted in localStorage

  room: {
    inputType: "PHOTO",
    image: undefined,
    manualRoom: undefined,
    scale: {
      refPx: 0,
      refMm: 0,
      pxToMm: 0,
      confidence: "LOW",
    },
    walls: [
      { id: "LEFT", label: "Left Wall" },
      { id: "RIGHT", label: "Right Wall" },
      { id: "CENTER", label: "Center Wall" },
      { id: "FULL", label: "Full Wall" },
    ],
    selectedWallId: "RIGHT",
    obstructions: [],
  },

  roomPhoto: undefined,
  wardrobeBox: undefined,
  loftBox: undefined,
  shutterCount: 3,
  shutterDividerXs: [],
  gapsScaled: false,
  loftEnabled: false,
  loftHeightRatio: 0.17,
  loftShutterCount: 2,
  loftDividerXs: [],
  wardrobeLayout: undefined,
  wardrobeSpec: undefined,
  aiSuggestion: undefined,
  aiPaidSuggestion: undefined,
  aiInteriorSuggestion: undefined,
  aiWardrobeLayoutSuggestion: undefined,
  scale: undefined,
  scaleLine: undefined,
  scaleDrawMode: false,
  drawMode: false,
  editMode: "shutter",
  sqftRate: 150,

  units: [],

  drawnUnits: [],
  activeUnitIndex: 0,
  activeEditPart: "shutter",

  // Multi-room quotation
  quotationRooms: [],
  activeRoomIndex: 0,

  pricingControl: {
    marginPct: 20,
    discountPct: 0,
    discountLocked: true,
    gstPct: 18,
    rounding: "NEAREST_10",
  },

  audit: [],
  approvedSnapshot: undefined,

  viewMode: "CUSTOMER",
  canvasViewMode: "front",
  viewIntensity: 50, // Default 50% intensity
  productionSettings: {
    roundingMm: 1,
    widthReductionMm: 0,
    heightReductionMm: 0,
    includeLoft: true,
  },

  productionCanvasSnapshots: new Map(),

  backgroundImage: null,
  locked: false,
  isCornerResizing: false,
  edgeResizeOnly: false,
  _loftPointer: undefined,
});

/* ---------------------------- Store ----------------------------- */

export const useVisualQuotationStore = create<VisualQuotationState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      syncFromUrl: ({ leadId, quoteId }) => {
        set(() => ({ leadId: leadId ?? null, quoteId: quoteId ?? null }));

        const nextLeadId = leadId ?? null;
        const nextQuoteId = quoteId ?? null;
        if (!nextLeadId || !nextQuoteId) return;

        // Pre-populate client info from CRM lead
        const lead = getLeadById(nextLeadId);
        if (lead) {
          const currentClient = get().client;
          // Only populate if client info is empty (don't overwrite existing data)
          if (!currentClient.name && !currentClient.phone) {
            set(() => ({
              client: {
                name: lead.name || "",
                phone: lead.mobile || "",
                location: lead.location || "",
              },
            }));
            get().addAudit("Client populated from CRM", `leadId=${nextLeadId}`);
          }
        }

        // Restore quote data if it exists
        const existingQuote = getQuoteById(nextQuoteId);
        if (existingQuote?.data) {
          try {
            const savedState = JSON.parse(existingQuote.data);
            // Restore key state from saved quote
            if (savedState) {
              set((s) => ({
                status: existingQuote.status || s.status,
                version: savedState.version || s.version,
                client: savedState.client || s.client,
                meta: savedState.meta || s.meta,
                units: savedState.units || s.units,
                pricingControl: savedState.pricingControl || s.pricingControl,
                approvedSnapshot: savedState.approvedSnapshot,
              }));
              get().addAudit("Quote restored from CRM", `quoteId=${nextQuoteId}`);
            }
          } catch {
            // Ignore parse errors - just use default state
          }
        }

        const pricing = calculatePricing(get().units || []);
        upsertQuoteSummary({
          quoteId: nextQuoteId,
          leadId: nextLeadId,
          status: get().status,
          amount: pricing.total || 0,
        });
      },

      /* --------- Client/meta ---------- */
      setClientField: (key, value) => {
        if (get().status === "APPROVED") return;
        set((s) => ({
          client: { ...s.client, [key]: value },
        }));
        get().addAudit("Client updated", `${key} = ${value}`);
      },

      setMetaField: (key, value) => {
        if (get().status === "APPROVED") return;
        set((s) => ({
          meta: { ...s.meta, [key]: value },
        }));
        get().addAudit("Meta updated", `${key} = ${value}`);
      },

      /* --------- Room input ---------- */
      setRoomInputType: (type) => {
        if (get().status === "APPROVED") return;
        set((s) => ({
          room: { ...s.room, inputType: type },
        }));
        get().addAudit("Room input type", type);
      },

      setRoomImage: (img) => {
        if (get().status === "APPROVED") return;
        set((s) => ({
          room: {
            ...s.room,
            image: img,
            // If image changes, scale becomes suspicious; reset scale safely.
            scale: {
              refPx: 0,
              refMm: 0,
              pxToMm: 0,
              confidence: "LOW",
            },
          },
        }));
        get().addAudit("Room image set", `w=${img.widthPx}px h=${img.heightPx}px`);
      },

      setManualRoom: (dims) => {
        if (get().status === "APPROVED") return;
        set((s) => ({
          room: { ...s.room, manualRoom: dims },
        }));
        get().addAudit("Manual room set", JSON.stringify(dims));
      },

      setSelectedWall: (wallId) => {
        if (get().status === "APPROVED") return;
        set((s) => ({
          room: { ...s.room, selectedWallId: wallId },
        }));
        get().addAudit("Selected wall", wallId);
      },

      setScaleByReference: (refPx, refMm) => {
        if (get().status === "APPROVED") return;
        const pxToMm = computePxToMm(refPx, refMm);
        set((s) => {
          const next = s.wardrobeBox
            ? buildShutterDividers(s.wardrobeBox, s.shutterCount, pxToMm)
            : { dividers: [], gapsScaled: pxToMm > 0 };
          return {
            room: {
              ...s.room,
              scale: {
                refPx,
                refMm,
                pxToMm,
                confidence: inferConfidence(pxToMm),
              },
            },
            scale: refPx > 0 && refMm > 0 ? { px: refPx, mm: refMm, ratio: pxToMm } : undefined,
            shutterDividerXs: next.dividers,
            gapsScaled: next.gapsScaled,
          };
        });
        get().addAudit("Scale calibrated", `refPx=${refPx}, refMm=${refMm}, pxToMm=${pxToMm}`);
        get().computeAreas();
      },

      setScaleConfidence: (confidence) => {
        if (get().status === "APPROVED") return;
        set((s) => ({
          room: { ...s.room, scale: { ...s.room.scale, confidence } },
        }));
        get().addAudit("Scale confidence", confidence);
      },

      /* --------- Room photo capture ---------- */
      setRoomPhoto: (src, width, height) => {
        if (get().status === "APPROVED") return;
        set(() => ({
          roomPhoto: { src, width, height },
          wardrobeBox: undefined,
          loftBox: undefined,
          shutterCount: 3,
          shutterDividerXs: [],
          gapsScaled: false,
          loftEnabled: false,
          loftHeightRatio: 0.17,
          wardrobeLayout: undefined,
          scale: undefined,
          scaleLine: undefined,
          scaleDrawMode: false,
          wardrobeSpec: undefined,
          aiSuggestion: undefined,
          aiInteriorSuggestion: undefined,
          aiWardrobeLayoutSuggestion: undefined,
          units: [],
        }));
        get().addAudit("Room photo set", `w=${width}px h=${height}px`);
      },

      clearRoomPhoto: () => {
        if (get().status === "APPROVED") return;
        set(() => ({
          roomPhoto: undefined,
          wardrobeBox: undefined,
          loftBox: undefined,
          shutterCount: 3,
          shutterDividerXs: [],
          gapsScaled: false,
          loftEnabled: false,
          loftHeightRatio: 0.17,
          wardrobeLayout: undefined,
          scale: undefined,
          scaleLine: undefined,
          scaleDrawMode: false,
          drawMode: false,
          wardrobeSpec: undefined,
          aiSuggestion: undefined,
          aiInteriorSuggestion: undefined,
          aiWardrobeLayoutSuggestion: undefined,
          units: [],
        }));
        get().addAudit("Room photo cleared");
      },

      /* --------- Wardrobe area ---------- */
      setWardrobeBox: (box) => {
        if (get().isCornerResizing) return;
        if (get().status === "APPROVED") return;
        const normalized = { ...box, rotation: box.rotation ?? 0 };
        set((s) => {
          const ratio = s.scale?.ratio ?? s.room.scale.pxToMm ?? 0;
          const { dividers, gapsScaled } = buildShutterDividers(normalized, s.shutterCount, ratio);
          return {
            wardrobeBox: normalized,
            drawMode: false,
            scaleDrawMode: false,
            shutterDividerXs: dividers,
            gapsScaled,
          };
        });
        get().addAudit(
          "Wardrobe area set",
          `x=${normalized.x}, y=${normalized.y}, w=${normalized.width}, h=${normalized.height}`
        );
        get().computeAreas();
      },

      clearWardrobeBox: () => {
        if (get().status === "APPROVED") return;
        set(() => ({
          wardrobeBox: undefined,
          loftBox: undefined,
          shutterCount: 3,
          shutterDividerXs: [],
          gapsScaled: false,
          loftEnabled: false,
          loftHeightRatio: 0.17,
          wardrobeLayout: undefined,
          wardrobeSpec: undefined,
          units: [],
          aiSuggestion: undefined,
        }));
        get().addAudit("Wardrobe area cleared");
      },

      setDrawMode: (active) => {
        if (get().status === "APPROVED") return;
        set((s) => ({ drawMode: active, scaleDrawMode: active ? false : s.scaleDrawMode }));
      },
      setEditMode: (mode) => {
        set(() => ({ editMode: mode }));
      },
      setSqftRate: (rate) => {
        set((s) => ({
          sqftRate: typeof rate === "function" ? rate(s.sqftRate) : rate,
        }));
      },
      setActiveEditPart: (part) => {
        set(() => ({ activeEditPart: part }));
      },

      setWardrobeLayout: (layout) => {
        if (get().status === "APPROVED") return;
        set(() => ({ wardrobeLayout: layout }));
        get().addAudit("Wardrobe layout set", `doors=${layout.doors}, loft=${layout.loft}`);
        get().computeAreas();
      },

      setShutterCount: (count) => {
        if (get().status === "APPROVED") return;
        // Allow unlimited shutters (minimum 1)
        const clamped = Math.max(Math.round(count), 1);
        set((s) => {
          const ratio = s.scale?.ratio ?? s.room.scale.pxToMm ?? 0;
          const next = s.wardrobeBox
            ? buildShutterDividers(s.wardrobeBox, clamped, ratio)
            : { dividers: [], gapsScaled: ratio > 0 };
          return {
            shutterCount: clamped,
            shutterDividerXs: next.dividers,
            gapsScaled: next.gapsScaled,
          };
        });
        get().addAudit("Shutter count set", String(clamped));
      },

      setShutterDividerX: (index, x) => {
        if (get().status === "APPROVED") return;
        set((s) => {
          if (!s.shutterDividerXs.length) return {};
          if (index < 0 || index >= s.shutterDividerXs.length) return {};
          const next = [...s.shutterDividerXs];
          next[index] = x;
          return { shutterDividerXs: next };
        });
      },

      setLoftEnabled: (enabled) => {
        if (get().status === "APPROVED") return;
        const { wardrobeBox, loftShutterCount } = get();

        if (enabled && wardrobeBox) {
          // Create loft box above wardrobe
          const defaultHeight = wardrobeBox.height * 0.25;
          const newLoft: LoftBox = {
            x: wardrobeBox.x,
            width: wardrobeBox.width,
            y: wardrobeBox.y - defaultHeight,
            height: defaultHeight,
            rotation: 0,
            dragEdge: null,
            isDragging: false,
            locked: false,
          };
          // Calculate initial loft dividers
          const dividers = loftShutterCount <= 1 ? [] : Array.from({ length: loftShutterCount - 1 }, (_, i) => {
            return newLoft.x + (newLoft.width / loftShutterCount) * (i + 1);
          });
          // Switch to loft edit mode when enabling loft
          set(() => ({ loftEnabled: true, loftBox: newLoft, loftDividerXs: dividers, activeEditPart: "loft" }));
        } else {
          // Remove loft box when disabled, switch back to shutter
          set(() => ({ loftEnabled: false, loftBox: undefined, loftDividerXs: [], activeEditPart: "shutter" }));
        }
        get().addAudit("Loft toggled", enabled ? "on" : "off");
      },

      setLoftBox: (box) =>
        set((state) => ({
          ...state,
          loftBox: box,
        })),

      setLoftShutterCount: (count: number) => {
        if (get().status === "APPROVED") return;
        // Allow unlimited shutters (minimum 1)
        const clamped = Math.max(Math.round(count), 1);
        set((s) => {
          if (!s.loftBox) return { loftShutterCount: clamped, loftDividerXs: [] };
          // Calculate loft dividers using same logic as wardrobe
          const dividers = clamped <= 1 ? [] : Array.from({ length: clamped - 1 }, (_, i) => {
            return s.loftBox!.x + (s.loftBox!.width / clamped) * (i + 1);
          });
          return { loftShutterCount: clamped, loftDividerXs: dividers };
        });
        get().addAudit("Loft shutter count set", String(clamped));
      },

      ensureLoftBoxForWardrobe: () =>
        set((state) => {
          const { wardrobeBox, loftBox } = state;
          if (!wardrobeBox) return state;
          if (loftBox) return state;

          const defaultHeight = wardrobeBox.height * 0.3;
          const newLoft: LoftBox = {
            x: wardrobeBox.x,
            width: wardrobeBox.width,
            // loft is above wardrobe, bottom of loft touches top of wardrobe
            y: wardrobeBox.y - defaultHeight,
            height: defaultHeight,
            rotation: 0,
            dragEdge: null,
            isDragging: false,
            locked: false,
          };

          return { ...state, loftBox: newLoft };
        }),

      startCornerResize: () =>
        set((s) => ({
          isCornerResizing: true,
          loftBox: s.loftBox ? { ...s.loftBox, isDragging: false, dragEdge: null } : undefined,
        })),

      stopCornerResize: () =>
        set((s) => ({
          isCornerResizing: false,
          loftBox: s.loftBox ? { ...s.loftBox, isDragging: false, dragEdge: null } : undefined,
        })),

      setEdgeResizeOnly: (value) =>
        set(() => ({
          edgeResizeOnly: value,
        })),

      toggleEdgeResizeOnly: () =>
        set((s) => ({
          edgeResizeOnly: !s.edgeResizeOnly,
        })),

      startLoftDrag: (edge) =>
        set((state) => {
          if (!state.loftBox || state.loftBox.locked) return state;
          if (state.status === "APPROVED") return state;
          return {
            ...state,
            loftBox: { ...state.loftBox, dragEdge: edge, isDragging: true },
          };
        }),

      updateLoftDrag: () =>
        set((state) => {
          if (state.isCornerResizing) return state;
          const { loftBox, wardrobeBox, shutterDividerXs, _loftPointer } = state;
          if (!loftBox || loftBox.locked || !loftBox.isDragging) return state;
          if (state.status === "APPROVED") return state;
          if (!_loftPointer) return state;

          const SNAP = 10;
          const walls = wardrobeBox
            ? {
              left: wardrobeBox.x,
              right: wardrobeBox.x + wardrobeBox.width,
            }
            : {
              left: loftBox.x,
              right: loftBox.x + loftBox.width,
            };

          const wardrobeTop = wardrobeBox ? wardrobeBox.y : loftBox.y + loftBox.height;

          let updated: LoftBox = { ...loftBox };
          const oldRight = updated.x + updated.width;
          const oldBottom = updated.y + updated.height;

          const px = _loftPointer.x;
          const py = _loftPointer.y;

          if (updated.dragEdge === "left") {
            updated.x = px;
            updated.width = oldRight - px;
          } else if (updated.dragEdge === "right") {
            updated.width = px - updated.x;
          } else if (updated.dragEdge === "top") {
            updated.y = py;
            updated.height = oldBottom - py;
          } else if (updated.dragEdge === "bottom") {
            updated.height = py - updated.y;
          } else if (updated.dragEdge === "move") {
            const cx = updated.x + updated.width / 2;
            const cy = updated.y + updated.height / 2;
            const dx = px - cx;
            const dy = py - cy;
            updated.x += dx;
            updated.y += dy;
          }

          // prevent negative / tiny sizes
          updated.width = Math.max(40, updated.width);
          updated.height = Math.max(40, updated.height);

          // snap to wardrobe side walls
          if (Math.abs(updated.x - walls.left) < SNAP) {
            updated.x = walls.left;
          }
          if (Math.abs(updated.x + updated.width - walls.right) < SNAP) {
            updated.width = walls.right - updated.x;
          }

          // snap loft bottom to wardrobe top (loft sits exactly above wardrobe)
          const loftBottom = updated.y + updated.height;
          if (Math.abs(loftBottom - wardrobeTop) < SNAP) {
            updated.height = wardrobeTop - updated.y;
          }

          // snap loft bottom to shutter divider Xs projected as vertical guides if needed
          // (we keep simple: snap left/right edges to shutterDividerXs)
          if (shutterDividerXs && shutterDividerXs.length > 0) {
            shutterDividerXs.forEach((xPos) => {
              // snap left edge to divider
              if (Math.abs(updated.x - xPos) < SNAP) {
                const delta = xPos - updated.x;
                updated.x = xPos;
                updated.width -= delta;
              }
              // snap right edge to divider
              if (Math.abs(updated.x + updated.width - xPos) < SNAP) {
                updated.width = xPos - updated.x;
              }
            });
          }

          return { ...state, loftBox: updated };
        }),

      stopLoftDrag: () =>
        set((state) => {
          if (!state.loftBox) return state;
          return {
            ...state,
            loftBox: {
              ...state.loftBox,
              dragEdge: null,
              isDragging: false,
            },
            _loftPointer: undefined,
          } as any;
        }),

      lockLoft: () =>
        set((state) => {
          if (!state.loftBox) return state;
          return {
            ...state,
            loftBox: { ...state.loftBox, locked: true, dragEdge: null, isDragging: false },
          };
        }),

      updateDivisions: (divisions) => {
        if (get().status === "APPROVED") return;
        const clamped = [...divisions].map((d) => Math.min(Math.max(d, 0), 1)).sort((a, b) => a - b);
        set((s) => ({
          wardrobeLayout: s.wardrobeLayout
            ? { ...s.wardrobeLayout, divisions: clamped }
            : { doors: 3, loft: false, divisions: clamped },
        }));
        get().addAudit("Wardrobe divisions updated", clamped.join(","));
      },

      toggleLoft: (on) => {
        if (get().status === "APPROVED") return;
        set((s) => {
          const layout = s.wardrobeLayout ?? { doors: 3, loft: false, divisions: [1 / 3, 2 / 3] };
          return { wardrobeLayout: { ...layout, loft: on } };
        });
        get().addAudit("Wardrobe loft toggled", on ? "on" : "off");
      },

      setDoors: (count) => {
        if (get().status === "APPROVED") return;
        const doors = Math.min(Math.max(count, 2), 6);
        const divisions = Array.from({ length: doors - 1 }, (_, i) => (i + 1) / doors);
        set((s) => {
          const base = s.wardrobeLayout ?? { doors, loft: false, divisions };
          return { wardrobeLayout: { ...base, doors, divisions } };
        });
        get().addAudit("Wardrobe doors set", String(doors));
      },

      setDepthMm: (depthMm) => {
        if (get().status === "APPROVED") return;
        const clamped = Math.min(Math.max(depthMm, 300), 900);
        set((s) => ({
          wardrobeSpec: {
            depthMm: clamped,
            carcassAreaSqft: s.wardrobeSpec?.carcassAreaSqft ?? 0,
            shutterAreaSqft: s.wardrobeSpec?.shutterAreaSqft ?? 0,
          },
        }));
        get().addAudit("Wardrobe depth set", `${clamped}mm`);
        get().computeAreas();
      },

      /* --------- Scale calibration ---------- */
      setScale: (px, mm) => {
        if (get().status === "APPROVED") return;
        if (px <= 0 || mm <= 0) return;
        const ratio = mm / px;
        set((s) => {
          const next = s.wardrobeBox
            ? buildShutterDividers(s.wardrobeBox, s.shutterCount, ratio)
            : { dividers: [], gapsScaled: ratio > 0 };
          return {
            scale: { px, mm, ratio },
            scaleDrawMode: false,
            scaleLine: s.scaleLine,
            shutterDividerXs: next.dividers,
            gapsScaled: next.gapsScaled,
          };
        });
        get().addAudit("Scale set", `px=${px}, mm=${mm}, ratio=${ratio.toFixed(4)}`);
        get().computeAreas();
      },

      clearScale: () => {
        if (get().status === "APPROVED") return;
        set((s) => {
          const ratio = s.room.scale.pxToMm ?? 0;
          const next = s.wardrobeBox
            ? buildShutterDividers(s.wardrobeBox, s.shutterCount, ratio)
            : { dividers: [], gapsScaled: ratio > 0 };
          return {
            scale: undefined,
            scaleLine: undefined,
            scaleDrawMode: false,
            wardrobeSpec: undefined,
            aiSuggestion: undefined,
            aiInteriorSuggestion: undefined,
            aiWardrobeLayoutSuggestion: undefined,
            units: [],
            shutterDividerXs: next.dividers,
            gapsScaled: next.gapsScaled,
          };
        });
        get().addAudit("Scale cleared");
      },

      setScaleLine: (line) => {
        if (get().status === "APPROVED") return;
        set(() => ({ scaleLine: line, scaleDrawMode: false }));
        if (line) {
          get().addAudit("Scale line set", `px=${line.lengthPx.toFixed(2)}`);
        }
      },

      setScaleDrawMode: (active) => {
        if (get().status === "APPROVED") return;
        set((s) => ({ scaleDrawMode: active, drawMode: active ? false : s.drawMode }));
        if (active) {
          get().addAudit("Scale draw mode", "activated");
        }
      },

      setAiSuggestion: (suggestion) => {
        if (get().status === "APPROVED") return;
        set(() => ({ aiSuggestion: suggestion }));
      },

      clearAiSuggestion: () => {
        if (get().status === "APPROVED") return;
        set(() => ({ aiSuggestion: undefined }));
      },

      applyAiSuggestion: () => {
        if (get().status === "APPROVED") return;
        const s = get();
        const suggestion = s.aiSuggestion;
        if (!suggestion) return;

        if (!s.wardrobeBox && suggestion.box) {
          const normalized = { ...suggestion.box, rotation: suggestion.box.rotation ?? 0 };
          set(() => ({ wardrobeBox: normalized, drawMode: false, scaleDrawMode: false }));
          get().addAudit("AI suggestion applied", "wardrobe box set");
        }

        if (!s.wardrobeLayout && (suggestion.doors || suggestion.loft !== undefined)) {
          const doors = suggestion.doors ?? 3;
          const layout: WardrobeLayout = {
            doors,
            loft: suggestion.loft ?? false,
            divisions: Array.from({ length: doors - 1 }, (_, i) => (i + 1) / doors),
          };
          set(() => ({ wardrobeLayout: layout }));
          get().addAudit("AI suggestion applied", `doors=${doors}, loft=${layout.loft}`);
        }

        set(() => ({ aiSuggestion: undefined }));
        get().computeAreas();
      },

      setAiPaidSuggestion: (suggestion) => {
        if (get().status === "APPROVED") return;
        set(() => ({ aiPaidSuggestion: suggestion || undefined }));
        if (suggestion?.detected) {
          get().addAudit("AI paid suggestion", `confidence=${suggestion.confidence}`);
          if (!get().wardrobeBox && get().roomPhoto && get().unitType === "wardrobe") {
            get().applyAiPaidSuggestion();
          }
        }
      },

      clearAiPaidSuggestion: () => {
        if (get().status === "APPROVED") return;
        set(() => ({ aiPaidSuggestion: undefined }));
      },

      applyAiPaidSuggestion: () => {
        const s = get();
        if (s.status === "APPROVED") return;
        if (!s.aiPaidSuggestion?.detected) return;
        if (s.wardrobeBox) return;

        const CANVAS_WIDTH = 900;
        const CANVAS_HEIGHT = 500;

        let width = 360;
        let height = 320;
        if (s.roomPhoto) {
          const scale = Math.min(CANVAS_WIDTH / s.roomPhoto.width, CANVAS_HEIGHT / s.roomPhoto.height);
          const renderWidth = s.roomPhoto.width * scale;
          const renderHeight = s.roomPhoto.height * scale;
          width = Math.max(180, Math.min(renderWidth * 0.6, CANVAS_WIDTH * 0.9));
          height = Math.max(160, Math.min(renderHeight * 0.6, CANVAS_HEIGHT * 0.9));
        }
        const x = (CANVAS_WIDTH - width) / 2;
        const y = (CANVAS_HEIGHT - height) / 2;

        const doors = s.aiPaidSuggestion.wardrobe?.doors ?? 3;
        const loft = s.aiPaidSuggestion.wardrobe?.hasLoft ?? false;

        const box: WardrobeBox = { x, y, width, height, rotation: 0 };
        set(() => ({
          wardrobeBox: box,
          wardrobeLayout: s.wardrobeLayout ?? {
            doors,
            loft,
            divisions: Array.from({ length: doors - 1 }, (_, i) => (i + 1) / doors),
          },
        }));
        get().addAudit("AI paid suggestion applied", `doors=${doors}, loft=${loft}`);
        get().computeAreas();
      },

      setAiInteriorSuggestion: (suggestion) => {
        if (get().status === "APPROVED") return;
        set(() => ({ aiInteriorSuggestion: suggestion }));
        if (suggestion?.detected && !get().wardrobeBox && get().unitType === "wardrobe") {
          get().applyAiInteriorSuggestionSoft();
        }
      },

      clearAiInteriorSuggestion: () => {
        if (get().status === "APPROVED") return;
        set(() => ({ aiInteriorSuggestion: undefined }));
      },

      setAiWardrobeLayoutSuggestion: (suggestion) => {
        if (get().status === "APPROVED") return;
        set(() => ({ aiWardrobeLayoutSuggestion: suggestion }));
      },

      clearAiWardrobeLayoutSuggestion: () => {
        if (get().status === "APPROVED") return;
        set(() => ({ aiWardrobeLayoutSuggestion: undefined }));
      },

      applyAiInteriorSuggestionSoft: () => {
        const s = get();
        if (s.status === "APPROVED") return false;
        if (!s.aiInteriorSuggestion?.detected) return false;
        if (!s.roomPhoto) return false;
        if (s.wardrobeBox) return false;
        if (s.unitType !== "wardrobe") return false;

        const CANVAS_WIDTH = 900;
        const CANVAS_HEIGHT = 500;
        const primary = s.aiInteriorSuggestion.primaryBox;

        const boxPx = {
          x: primary.xNorm * s.roomPhoto.width,
          y: primary.yNorm * s.roomPhoto.height,
          width: primary.wNorm * s.roomPhoto.width,
          height: primary.hNorm * s.roomPhoto.height,
        };

        const scale = Math.min(CANVAS_WIDTH / s.roomPhoto.width, CANVAS_HEIGHT / s.roomPhoto.height);
        const renderWidth = s.roomPhoto.width * scale;
        const renderHeight = s.roomPhoto.height * scale;
        const offsetX = (CANVAS_WIDTH - renderWidth) / 2;
        const offsetY = (CANVAS_HEIGHT - renderHeight) / 2;

        const x = offsetX + boxPx.x * scale;
        const y = offsetY + boxPx.y * scale;
        const width = boxPx.width * scale;
        const height = boxPx.height * scale;

        const box: WardrobeBox = { x, y, width, height, rotation: 0 };

        get().setWardrobeBox(box);
        if (!s.wardrobeLayout) {
          const doors = s.aiInteriorSuggestion.suggestions?.doors ?? 3;
          const loft = s.aiInteriorSuggestion.suggestions?.hasLoft ?? false;
          get().setWardrobeLayout({
            doors,
            loft,
            divisions: Array.from({ length: doors - 1 }, (_, i) => (i + 1) / doors),
          });
        }
        get().addAudit("AI interior suggestion applied", `unitType=${s.aiInteriorSuggestion.unitType}`);
        return true;
      },

      computeAreas: () => {
        const s = get();
        if (s.status === "APPROVED") return;
        if (!s.scale || !s.wardrobeBox) {
          set(() => ({ wardrobeSpec: undefined, units: [] }));
          return;
        }

        const depthMm = s.wardrobeSpec?.depthMm ?? 600;
        const widthMm = s.wardrobeBox.width * s.scale.ratio;
        const heightMm = s.wardrobeBox.height * s.scale.ratio;

        const shutterAreaSqft = (widthMm * heightMm) / 92903;
        const carcassAreaSqft = shutterAreaSqft;

        const nextSpec: WardrobeSpec = {
          depthMm,
          carcassAreaSqft: Number(carcassAreaSqft.toFixed(2)),
          shutterAreaSqft: Number(shutterAreaSqft.toFixed(2)),
        };

        const existingUnit = s.units[0];
        const finish = existingUnit?.finish ?? { shutterLaminateCode: "", loftLaminateCode: "", innerLaminateCode: "" };
        const wallId = existingUnit?.wallId ?? "FULL";
        const sectionCount = s.shutterCount ?? 3;
        const id = existingUnit?.id ?? uid("UNIT");

        const unit: WardrobeUnit = {
          id,
          wallId,
          widthMm: Math.round(widthMm),
          heightMm: Math.round(heightMm),
          depthMm,
          loftEnabled: s.loftEnabled,
          loftHeightMm: s.loftEnabled ? Math.round(heightMm * s.loftHeightRatio) : 0,
          sectionCount,
          finish,
          doorSwingMode: existingUnit?.doorSwingMode ?? "AUTO",
        };

        set(() => ({
          wardrobeSpec: nextSpec,
          units: [unit],
        }));
      },

      /* --------- Obstructions ---------- */
      addObstruction: (o) => {
        if (get().status === "APPROVED") return;
        const newO: Obstruction = { ...o, id: uid("OBS") };
        set((s) => ({
          room: { ...s.room, obstructions: [...s.room.obstructions, newO] },
        }));
        get().addAudit("Obstruction added", `${newO.type} (${newO.label})`);
      },

      removeObstruction: (id) => {
        if (get().status === "APPROVED") return;
        set((s) => ({
          room: { ...s.room, obstructions: s.room.obstructions.filter((x) => x.id !== id) },
        }));
        get().addAudit("Obstruction removed", id);
      },

      clearObstructions: () => {
        if (get().status === "APPROVED") return;
        set((s) => ({
          room: { ...s.room, obstructions: [] },
        }));
        get().addAudit("Obstructions cleared");
      },

      /* --------- Units ---------- */
      addWardrobeUnit: (u) => {
        if (get().status === "APPROVED") return;
        const id = uid("UNIT");
        const s = get();

        // Custom Width Calculation (The Fix)
        let customShutterWidthsMm: number[] | undefined = undefined;
        const box = s.wardrobeBox;
        const xs = s.shutterDividerXs;
        const pxToMm = s.room.scale.pxToMm;

        if (box && pxToMm && xs && xs.length > 0) {
          const sortedXs = [...xs].sort((a, b) => a - b);
          const startX = box.x;
          const endX = box.x + box.width;
          const boundaries = [startX, ...sortedXs, endX];
          customShutterWidthsMm = [];
          for (let i = 0; i < boundaries.length - 1; i++) {
            const curr = boundaries[i];
            const next = boundaries[i + 1];
            if (curr !== undefined && next !== undefined) {
              const diffPx = next - curr;
              customShutterWidthsMm.push(Math.round(diffPx * pxToMm));
            }
          }
        }

        const base: WardrobeUnit = {
          id,
          wallId: u.wallId,
          widthMm: u.widthMm ?? 1800,
          heightMm: u.heightMm ?? 2400,
          depthMm: u.depthMm ?? 600,
          loftEnabled: u.loftEnabled ?? false,
          loftHeightMm: u.loftHeightMm ?? 450,
          sectionCount: u.sectionCount ?? 3,
          finish: {
            shutterLaminateCode: u.finish?.shutterLaminateCode,
            loftLaminateCode: u.finish?.loftLaminateCode,
            innerLaminateCode: u.finish?.innerLaminateCode,
          },
          doorSwingMode: u.doorSwingMode ?? "AUTO",
          customShutterWidthsMm,
        };

        set((s) => ({
          units: [...s.units, base],
        }));
        get().addAudit("Wardrobe unit added", `${id} on ${base.wallId}`);
        get().bumpVersion("Unit added");

        const { leadId, quoteId, status, units } = get();
        if (leadId && quoteId) {
          const pricing = calculatePricing(units || []);
          const snapshot = JSON.stringify(get());
          upsertQuoteSummary({ quoteId, leadId, status, amount: pricing.total || 0, data: snapshot });
        }
      },

      updateWardrobeUnit: (id, patch) => {
        if (get().status === "APPROVED") return;
        set((s) => ({
          units: s.units.map((u) => (u.id === id ? { ...u, ...patch } : u)),
        }));
        get().addAudit("Wardrobe unit updated", `${id} patch=${Object.keys(patch).join(",")}`);
        get().bumpVersion("Unit updated");
        // Sync
        const { leadId, quoteId, status, units } = get();
        if (leadId && quoteId) {
          const pricing = calculatePricing(units || []);
          const snapshot = JSON.stringify(get());
          upsertQuoteSummary({ quoteId, leadId, status, amount: pricing.total || 0, data: snapshot });
        }
      },

      removeWardrobeUnit: (id) => {
        if (get().status === "APPROVED") return;
        set((s) => ({
          units: s.units.filter((u) => u.id !== id),
        }));
        get().addAudit("Wardrobe unit removed", id);
        get().bumpVersion("Unit removed");
        // Sync
        const { leadId, quoteId, status, units } = get();
        if (leadId && quoteId) {
          const pricing = calculatePricing(units || []);
          const snapshot = JSON.stringify(get());
          upsertQuoteSummary({ quoteId, leadId, status, amount: pricing.total || 0, data: snapshot });
        }
      },

      clearUnits: () => {
        if (get().status === "APPROVED") return;
        set(() => ({ units: [] }));
        get().addAudit("Units cleared");
        get().bumpVersion("Units cleared");
        // Sync
        const { leadId, quoteId, status } = get();
        if (leadId && quoteId) {
          const snapshot = JSON.stringify(get());
          upsertQuoteSummary({ quoteId, leadId, status, amount: 0, data: snapshot });
        }
      },

      /* --------- Pricing controls ---------- */
      setPricingControl: (key, value) => {
        if (get().status === "APPROVED") return;
        set((s) => ({
          pricingControl: { ...s.pricingControl, [key]: value },
        }));
        get().addAudit("Pricing control changed", `${String(key)}=${String(value)}`);
      },

      /* --------- Versioning / approval ---------- */
      bumpVersion: (reason) => {
        if (get().status === "APPROVED") return;
        set((s) => ({ version: s.version + 1 }));
        if (reason) get().addAudit("Version bumped", reason);
      },

      approveQuote: () => {
        const s = get();
        const snapshot = JSON.stringify(
          {
            status: "APPROVED",
            version: s.version,
            client: s.client,
            meta: s.meta,
            room: s.room,
            units: s.units,
            pricingControl: s.pricingControl,
          },
          null,
          0
        );

        set(() => ({
          status: "APPROVED",
          approvedSnapshot: snapshot,
        }));

        get().addAudit("Quote approved", `version=${s.version}`);

        const { leadId, quoteId, units } = get();
        if (leadId && quoteId) {
          const pricing = calculatePricing(units || []);
          upsertQuoteSummary({ quoteId, leadId, status: "APPROVED", amount: pricing.total || 0, data: snapshot });

          logActivity({
            leadId,
            type: "QUOTE_APPROVED",
            message: "Quote approved.",
            meta: { quoteId },
          });

          updateLeadStatus(leadId, "DESIGN_SHARED");
        }
      },

      unapproveToDraft: () => {
        // In real business, only admin should do this. We keep it for safety now.
        set(() => ({
          status: "DRAFT",
          approvedSnapshot: undefined,
        }));
        get().addAudit("Unapproved to draft");
        get().bumpVersion("Unapproved to draft");
      },

      resetDraft: () => {
        const current = get();
        set(() => ({
          status: "DRAFT",
          approvedSnapshot: undefined,
          version: current.version + 1,
        }));
        get().addAudit("Duplicated as new draft", `from version=${current.version}`);
      },

      /* --------- Audit ---------- */
      addAudit: (action, details) => {
        const entry: AuditEntry = {
          id: uid("AUD"),
          tsISO: nowISO(),
          action,
          details,
        };
        set((s) => ({ audit: [entry, ...s.audit].slice(0, 200) })); // keep last 200
      },

      /* --------- Reset ---------- */
      resetAll: () => {
        set(() => ({
          ...initialState(),
        }));
      },

      /* --------- Multi-unit canvas ---------- */
      saveCurrentUnitAndAddNew: () => {
        const state = get();
        if (state.status === "APPROVED") return;
        if (!state.wardrobeBox) return;

        // Create a new drawn unit from current state
        const sectionCount = state.units[0]?.sectionCount || 1;
        // Calculate horizontal divider Y positions based on sectionCount
        const boxHeight = state.wardrobeBox.height;
        const boxY = state.wardrobeBox.y;
        const horizontalDividerYs = sectionCount > 1
          ? Array.from({ length: sectionCount - 1 }, (_, i) => boxY + (boxHeight / sectionCount) * (i + 1))
          : [];

        const newUnit: DrawnUnit = {
          id: `unit-${Date.now()}`,
          unitType: state.unitType,
          box: { ...state.wardrobeBox },
          loftBox: state.loftBox ? { ...state.loftBox } : undefined,
          shutterCount: state.shutterCount,
          shutterDividerXs: [...state.shutterDividerXs],
          loftEnabled: state.loftEnabled,
          loftHeightRatio: state.loftHeightRatio,
          loftShutterCount: state.loftShutterCount,
          loftDividerXs: [...state.loftDividerXs],
          horizontalDividerYs,
          // Start with blank dimensions - user will enter them
          widthMm: 0,
          heightMm: 0,
          depthMm: 0,
          // Separate loft dimensions - user enters separately
          loftWidthMm: 0,
          loftHeightMm: 0,
          sectionCount,
        };

        // Add to drawnUnits array and reset current drawing state
        set((s) => ({
          drawnUnits: [...s.drawnUnits, newUnit],
          activeUnitIndex: s.drawnUnits.length, // Point to the newly saved unit (index of new item)
          wardrobeBox: undefined,
          loftBox: undefined,
          shutterCount: 3,
          shutterDividerXs: [],
          loftEnabled: false,
          loftDividerXs: [],
          drawMode: false, // Don't auto-enter draw mode - user must click "Add Another"
          unitType: "wardrobe", // Reset to default
        }));

        get().addAudit("Unit saved", `Added ${newUnit.unitType} unit`);
      },

      setActiveUnitIndex: (index) => {
        const state = get();
        if (index < 0 || index >= state.drawnUnits.length) return;

        const unit = state.drawnUnits[index];
        if (!unit) return;

        // Load the selected unit's data into current editing state
        set(() => ({
          activeUnitIndex: index,
          wardrobeBox: { ...unit.box },
          loftBox: unit.loftBox ? { ...unit.loftBox } : undefined,
          shutterCount: unit.shutterCount,
          shutterDividerXs: [...unit.shutterDividerXs],
          loftEnabled: unit.loftEnabled,
          loftHeightRatio: unit.loftHeightRatio,
          loftShutterCount: unit.loftShutterCount,
          loftDividerXs: [...unit.loftDividerXs],
          unitType: unit.unitType,
        }));
      },

      deleteDrawnUnit: (index) => {
        const state = get();
        if (state.status === "APPROVED") return;
        if (index < 0 || index >= state.drawnUnits.length) return;

        const newUnits = state.drawnUnits.filter((_, i) => i !== index);
        const newActiveIndex = Math.min(state.activeUnitIndex, Math.max(0, newUnits.length - 1));

        set(() => ({
          drawnUnits: newUnits,
          activeUnitIndex: newActiveIndex,
        }));

        // If we deleted the last unit, clear current state
        if (newUnits.length === 0) {
          set(() => ({
            wardrobeBox: undefined,
            loftBox: undefined,
          }));
        } else if (newUnits[newActiveIndex]) {
          // Load the new active unit
          const unit = newUnits[newActiveIndex];
          set(() => ({
            wardrobeBox: { ...unit.box },
            loftBox: unit.loftBox ? { ...unit.loftBox } : undefined,
            shutterCount: unit.shutterCount,
            shutterDividerXs: [...unit.shutterDividerXs],
            loftEnabled: unit.loftEnabled,
            unitType: unit.unitType,
          }));
        }

        get().addAudit("Unit deleted", `Removed unit at index ${index}`);
      },

      updateActiveDrawnUnit: (patch) => {
        const state = get();
        if (state.status === "APPROVED") return;
        if (state.drawnUnits.length === 0) return;

        set((s) => {
          const activeUnit = s.drawnUnits[s.activeUnitIndex];
          if (!activeUnit) return {};

          // If shutter count changed, recalculate dividers
          let newDividers = patch.shutterDividerXs;
          if (patch.shutterCount !== undefined && patch.shutterCount !== activeUnit.shutterCount) {
            const box = activeUnit.box;
            const count = patch.shutterCount;
            if (count > 1 && box.width > 0) {
              const shutterWidth = box.width / count;
              newDividers = Array.from({ length: count - 1 }, (_, i) => box.x + shutterWidth * (i + 1));
            } else {
              newDividers = [];
            }
          }

          // If loftEnabled changed, create or remove loft box
          let newLoftBox = patch.loftBox;
          let newLoftDividers = patch.loftDividerXs;
          let newLoftShutterCount: number | undefined;
          if (patch.loftEnabled !== undefined && patch.loftEnabled !== activeUnit.loftEnabled) {
            if (patch.loftEnabled) {
              // Create loft box above the wardrobe
              const box = activeUnit.box;
              const defaultHeight = box.height * 0.25;
              newLoftBox = {
                x: box.x,
                width: box.width,
                y: box.y - defaultHeight,
                height: defaultHeight,
                rotation: 0,
                dragEdge: null,
                isDragging: false,
                locked: false,
              };
              // Match loft shutter count to wardrobe shutter count on first enable
              const loftCount = activeUnit.shutterCount || 3;
              newLoftShutterCount = loftCount;
              newLoftDividers = loftCount <= 1 ? [] : Array.from({ length: loftCount - 1 }, (_, i) => {
                return newLoftBox!.x + (newLoftBox!.width / loftCount) * (i + 1);
              });
            } else {
              // Remove loft box
              newLoftBox = undefined;
              newLoftDividers = [];
            }
          }

          // If loftShutterCount changed, recalculate loft dividers
          if (patch.loftShutterCount !== undefined && patch.loftShutterCount !== activeUnit.loftShutterCount) {
            const loftBox = newLoftBox !== undefined ? newLoftBox : activeUnit.loftBox;
            if (loftBox && activeUnit.loftEnabled) {
              const count = patch.loftShutterCount;
              if (count > 1 && loftBox.width > 0) {
                newLoftDividers = Array.from({ length: count - 1 }, (_, i) => loftBox.x + (loftBox.width / count) * (i + 1));
              } else {
                newLoftDividers = [];
              }
            }
          }

          const updatedUnit = {
            ...activeUnit,
            ...patch,
            ...(newDividers !== undefined ? { shutterDividerXs: newDividers } : {}),
            ...(newLoftBox !== undefined ? { loftBox: newLoftBox } : {}),
            ...(newLoftDividers !== undefined ? { loftDividerXs: newLoftDividers } : {}),
            ...(newLoftShutterCount !== undefined ? { loftShutterCount: newLoftShutterCount } : {}),
          };

          return {
            drawnUnits: s.drawnUnits.map((unit, i) =>
              i === s.activeUnitIndex ? updatedUnit : unit
            ),
            // Also update the current state dividers so canvas reflects change
            ...(newDividers !== undefined ? { shutterDividerXs: newDividers, shutterCount: patch.shutterCount } : {}),
            ...(patch.loftEnabled !== undefined ? { loftEnabled: patch.loftEnabled } : {}),
            ...(patch.loftShutterCount !== undefined ? { loftShutterCount: patch.loftShutterCount } : {}),
            ...(newLoftShutterCount !== undefined ? { loftShutterCount: newLoftShutterCount } : {}),
            ...(newLoftBox !== undefined ? { loftBox: newLoftBox } : {}),
            ...(newLoftDividers !== undefined ? { loftDividerXs: newLoftDividers } : {}),
          };
        });
      },

      /* --------- Multi-room quotation ---------- */
      addQuotationRoom: (unitType, name) => {
        const state = get();
        if (state.status === "APPROVED") return;

        // Save current room state first if we have rooms
        if (state.quotationRooms.length > 0) {
          get().saveCurrentRoomState();
        }

        // Generate room name if not provided
        const unitLabels: Record<UnitType, string> = {
          wardrobe: "Wardrobe",
          kitchen: "Kitchen",
          tv_unit: "TV Unit",
          dresser: "Dresser",
          other: "Other",
        };
        const roomName = name || `${unitLabels[unitType]} ${state.quotationRooms.filter(r => r.unitType === unitType).length + 1}`;

        const newRoom: QuotationRoom = {
          id: uid("ROOM"),
          name: roomName,
          unitType,
          roomPhoto: undefined,
          drawnUnits: [],
          activeUnitIndex: 0,
          wardrobeBox: undefined,
          loftBox: undefined,
          shutterCount: 3,
          shutterDividerXs: [],
          loftEnabled: false,
          loftHeightRatio: 0.17,
          loftShutterCount: 2,
          loftDividerXs: [],
        };

        const newRooms = [...state.quotationRooms, newRoom];
        const newIndex = newRooms.length - 1;

        // Set state to new room (fresh canvas)
        set(() => ({
          quotationRooms: newRooms,
          activeRoomIndex: newIndex,
          unitType,
          // Reset canvas for new room
          roomPhoto: undefined,
          wardrobeBox: undefined,
          loftBox: undefined,
          drawnUnits: [],
          activeUnitIndex: 0,
          shutterCount: 3,
          shutterDividerXs: [],
          loftEnabled: false,
          loftHeightRatio: 0.17,
          loftShutterCount: 2,
          loftDividerXs: [],
          drawMode: false,
        }));

        get().addAudit("Room added", `${roomName} (${unitType})`);
      },

      setActiveRoomIndex: (index) => {
        const state = get();
        if (index < 0 || index >= state.quotationRooms.length) return;
        if (index === state.activeRoomIndex) return;

        // Save current room state before switching
        get().saveCurrentRoomState();

        // Load the target room
        get().loadRoomState(index);
      },

      deleteQuotationRoom: (index) => {
        const state = get();
        if (state.status === "APPROVED") return;
        if (index < 0 || index >= state.quotationRooms.length) return;

        const deletedRoom = state.quotationRooms[index];
        const newRooms = state.quotationRooms.filter((_, i) => i !== index);

        if (newRooms.length === 0) {
          // No rooms left - reset to initial state
          set(() => ({
            quotationRooms: [],
            activeRoomIndex: 0,
            roomPhoto: undefined,
            wardrobeBox: undefined,
            loftBox: undefined,
            drawnUnits: [],
            activeUnitIndex: 0,
            unitType: "wardrobe",
          }));
        } else {
          // Adjust active index
          const newActiveIndex = Math.min(state.activeRoomIndex, newRooms.length - 1);
          set(() => ({
            quotationRooms: newRooms,
            activeRoomIndex: newActiveIndex,
          }));
          // Load the new active room
          get().loadRoomState(newActiveIndex);
        }

        get().addAudit("Room deleted", deletedRoom?.name || `Room ${index + 1}`);
      },

      updateQuotationRoom: (index, patch) => {
        const state = get();
        if (state.status === "APPROVED") return;
        if (index < 0 || index >= state.quotationRooms.length) return;

        set((s) => ({
          quotationRooms: s.quotationRooms.map((room, i) =>
            i === index ? { ...room, ...patch } : room
          ),
        }));
      },

      saveCurrentRoomState: () => {
        const state = get();
        if (state.quotationRooms.length === 0) return;
        if (state.activeRoomIndex < 0 || state.activeRoomIndex >= state.quotationRooms.length) return;

        const currentRoom = state.quotationRooms[state.activeRoomIndex];
        if (!currentRoom) return;

        const updatedRoom: QuotationRoom = {
          ...currentRoom,
          roomPhoto: state.roomPhoto,
          drawnUnits: [...state.drawnUnits],
          activeUnitIndex: state.activeUnitIndex,
          wardrobeBox: state.wardrobeBox,
          loftBox: state.loftBox,
          shutterCount: state.shutterCount,
          shutterDividerXs: [...state.shutterDividerXs],
          loftEnabled: state.loftEnabled,
          loftHeightRatio: state.loftHeightRatio,
          loftShutterCount: state.loftShutterCount,
          loftDividerXs: [...state.loftDividerXs],
        };

        set((s) => ({
          quotationRooms: s.quotationRooms.map((room, i) =>
            i === s.activeRoomIndex ? updatedRoom : room
          ),
        }));
      },

      loadRoomState: (index) => {
        const state = get();
        if (index < 0 || index >= state.quotationRooms.length) return;

        const room = state.quotationRooms[index];
        if (!room) return;

        set(() => ({
          activeRoomIndex: index,
          unitType: room.unitType,
          roomPhoto: room.roomPhoto,
          drawnUnits: [...room.drawnUnits],
          activeUnitIndex: room.activeUnitIndex,
          wardrobeBox: room.wardrobeBox,
          loftBox: room.loftBox,
          shutterCount: room.shutterCount,
          shutterDividerXs: [...room.shutterDividerXs],
          loftEnabled: room.loftEnabled,
          loftHeightRatio: room.loftHeightRatio,
          loftShutterCount: room.loftShutterCount,
          loftDividerXs: [...room.loftDividerXs],
        }));
      },

      setViewMode: (mode) => {
        set(() => ({ viewMode: mode }));
        get().addAudit("View mode changed", mode);
      },

      setCanvasViewMode: (mode) => {
        set(() => ({ canvasViewMode: mode }));
      },

      setViewIntensity: (value) => {
        set(() => ({ viewIntensity: Math.max(0, Math.min(100, value)) }));
      },

      setProductionSettings: (patch) => {
        set((s) => ({
          productionSettings: { ...s.productionSettings, ...patch },
        }));
      },

      setProductionCanvasSnapshots: (snapshots) => {
        set(() => ({ productionCanvasSnapshots: snapshots }));
      },

      setBackgroundImage: (img) => {
        set(() => ({ backgroundImage: img }));
      },

      setLocked: (value) => {
        set(() => ({ locked: value }));
      },

      setRoomType: (value) => {
        if (get().status === "APPROVED") return;
        set(() => ({ roomType: value }));
        get().addAudit("Room type set", value);
      },

      setUnitType: (value) => {
        if (get().status === "APPROVED") return;
        set(() => ({ unitType: value }));
        get().addAudit("Unit type set", value);
      },

      addCustomUnitType: (value) => {
        const trimmed = value.trim().toLowerCase().replace(/\s+/g, "_");
        if (!trimmed) return;
        // Don't add if it's a default type or already exists
        const defaults = ["wardrobe", "kitchen", "tv_unit", "dresser", "other"];
        if (defaults.includes(trimmed)) return;
        const existing = get().customUnitTypes;
        if (existing.includes(trimmed)) return;
        set(() => ({ customUnitTypes: [...existing, trimmed] }));
        get().addAudit("Custom unit type added", trimmed);
      },
    }),
    {
      name: "visual-quotation-store-v1",
      version: 1,
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<VisualQuotationState> & { shutterDividers?: number[] };
        const { shutterDividers, shutterDividerXs, ...rest } = state;
        return {
          ...currentState,
          ...rest,
          shutterDividerXs:
            shutterDividerXs ?? shutterDividers ?? currentState.shutterDividerXs,
          // Always default loft to off for new units/sessions
          loftEnabled: false,
          loftBox: undefined,
          loftDividerXs: [],
        };
      },
      partialize: (state) => ({
        // Persist everything needed for offline-safe work
        status: state.status,
        version: state.version,
        client: state.client,
        meta: state.meta,
        room: state.room,
        roomPhoto: state.roomPhoto,
        units: state.units,
        pricingControl: state.pricingControl,
        audit: state.audit,
        approvedSnapshot: state.approvedSnapshot,
        viewMode: state.viewMode,
        productionSettings: state.productionSettings,
        roomType: state.roomType,
        unitType: state.unitType,
        wardrobeBox: state.wardrobeBox,
        loftBox: state.loftBox,
        shutterCount: state.shutterCount,
        shutterDividerXs: state.shutterDividerXs,
        gapsScaled: state.gapsScaled,
        loftEnabled: state.loftEnabled,
        loftHeightRatio: state.loftHeightRatio,
        drawMode: state.drawMode,
        wardrobeLayout: state.wardrobeLayout,
        wardrobeSpec: state.wardrobeSpec,
        scale: state.scale,
        scaleLine: state.scaleLine,
        scaleDrawMode: state.scaleDrawMode,
        aiSuggestion: state.aiSuggestion,
        aiPaidSuggestion: state.aiPaidSuggestion,
        aiInteriorSuggestion: state.aiInteriorSuggestion,
        aiWardrobeLayoutSuggestion: state.aiWardrobeLayoutSuggestion,
        // Multi-room quotation
        quotationRooms: state.quotationRooms,
        activeRoomIndex: state.activeRoomIndex,
        drawnUnits: state.drawnUnits,
        activeUnitIndex: state.activeUnitIndex,
      }),
    }
  )
);
