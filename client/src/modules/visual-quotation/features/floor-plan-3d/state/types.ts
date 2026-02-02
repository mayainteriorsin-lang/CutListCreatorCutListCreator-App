/**
 * Floor Plan 3D State Types
 *
 * Types for the Floor Plan 3D feature state slice.
 * These are copied from visualQuotationStore.ts for slice extraction.
 */

/* ========================= FLOOR PLAN TYPES ========================= */

/** Kitchen layout shapes */
export type KitchenLayoutType = "straight" | "l_shape" | "u_shape" | "parallel" | "island";

/** Wall opening type (door or window) */
export type WallOpeningType = "door" | "window" | "opening";

/** Wall opening (door, window, or open pass-through) */
export interface WallOpening {
  id: string;
  type: WallOpeningType;
  positionMm: number; // Distance from wall start point in mm
  widthMm: number; // Opening width
  heightMm: number; // Opening height
  sillHeightMm: number; // Height from floor (0 for doors, ~900mm for windows)
  swingDirection?: "left" | "right" | "both"; // For doors
}

/** Edge direction for wall alignment to floor boundary */
export type WallEdgeAlignment = "top" | "bottom" | "left" | "right" | null;

/** Floor plan wall segment */
export interface FloorPlanWall {
  id: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  lengthMm: number;
  thicknessMm: number; // Wall thickness (default 150mm)
  heightMm: number; // Wall height for 3D
  rotation: number; // Angle in degrees
  isExterior: boolean;
  openings: WallOpening[]; // Doors and windows on this wall
  edgeAlignment?: WallEdgeAlignment; // Which floor edge this wall aligns to (outer face on floor edge)
  // Tool properties
  locked?: boolean; // Prevent accidental edits
  groupId?: string; // Group ID for grouping walls together
}

/** Floor plan room boundary */
export interface FloorPlanRoom {
  id: string;
  name: string;
  walls: FloorPlanWall[];
  area: number; // sqft
  closed: boolean; // Is the room boundary closed?
}

/** Kitchen run (segment of base/wall units) */
export interface KitchenRun {
  id: string;
  wallId: string; // Which wall this run is attached to
  lengthFt: number; // Running feet
  depthMm: number; // Standard: Base=600mm, Wall=300-350mm
  heightMm: number; // Base=850mm, Wall=600-700mm
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  rotation: number;
}

/** Kitchen zone for appliance placement */
export interface KitchenZone {
  id: string;
  type: "hob" | "sink" | "chimney" | "fridge" | "microwave" | "dishwasher" | "counter";
  position: { x: number; y: number };
  widthMm: number;
  depthMm: number;
  runId: string; // Which run this zone belongs to
  label?: string;
}

/** Kitchen unit box (Base or Wall cabinets) */
export interface KitchenUnitBox {
  id: string;
  unitType: "base" | "wall" | "tall";
  layoutType: KitchenLayoutType;
  runs: KitchenRun[];
  zones: KitchenZone[];
  totalRunningFeet: number;
  counterTopMaterial?: string;
  shutterMaterial?: string;
}

/** Complete kitchen configuration */
export interface KitchenConfig {
  layoutType: KitchenLayoutType;
  baseUnit: KitchenUnitBox | null;
  wallUnit: KitchenUnitBox | null;
  tallUnit: KitchenUnitBox | null;
  counterTopOverhang: number; // mm
  splashbackHeight: number; // mm (typically 450-600mm)
  ceilingHeight: number; // For loft calculation
}

/** Floor shape type */
export type FloorShapeType = "rectangle" | "l_shape";

/** L-shape cut corner position */
export type LShapeCutCorner = "top_left" | "top_right" | "bottom_left" | "bottom_right";

/** Floor plan floor/room boundary */
export interface FloorPlanFloor {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string; // Fill color
  label: string; // e.g., "Kitchen", "Living Room"
  // New properties
  locked: boolean; // Prevent accidental edits
  notes: string; // User notes/comments
  shapeType: FloorShapeType; // Rectangle or L-shape
  // L-shape specific properties
  lShapeCutCorner?: LShapeCutCorner; // Which corner is cut
  lShapeCutWidth?: number; // Width of the cut (px)
  lShapeCutHeight?: number; // Height of the cut (px)
  // Tool properties
  groupId?: string; // Group ID for grouping floors together
  flippedH?: boolean; // Flipped horizontally
  flippedV?: boolean; // Flipped vertically
}

/** Floor plan drawing mode */
export type FloorPlanDrawMode = "wall" | "room" | "kitchen_base" | "kitchen_wall" | "floor" | "door" | "window" | "appliance" | "select" | "move" | "pan" | "none";

/** Appliance type for drag-drop */
export type ApplianceType = "hob" | "sink" | "chimney" | "fridge" | "microwave" | "dishwasher" | "oven" | "washing_machine";

/** Appliance placement on floor plan */
export interface FloorPlanAppliance {
  id: string;
  type: ApplianceType;
  x: number;
  y: number;
  widthPx: number;
  heightPx: number;
  rotation: number;
  label?: string;
}

/** History snapshot for undo/redo (only data that can change) */
export interface FloorPlanHistorySnapshot {
  walls: FloorPlanWall[];
  floors: FloorPlanFloor[];
  appliances: FloorPlanAppliance[];
  kitchenConfig: KitchenConfig | null;
}

/** Object snap settings for SnapObjectsTool */
export interface SnapObjectsSettings {
  enabled: boolean;
  snapToEdges: boolean;
  snapToCorners: boolean;
  snapToCenter: boolean;
  snapDistance: number; // in pixels
}

/** Floor plan state */
export interface FloorPlanState {
  enabled: boolean;
  drawMode: FloorPlanDrawMode;
  walls: FloorPlanWall[];
  rooms: FloorPlanRoom[];
  floors: FloorPlanFloor[];
  appliances: FloorPlanAppliance[]; // Placed appliances
  kitchenConfig: KitchenConfig | null;
  selectedWallId: string | null;
  selectedWallIds: string[]; // Multi-select support
  selectedRoomId: string | null;
  selectedFloorId: string | null;
  selectedFloorIds: string[]; // Multi-select support
  selectedApplianceId: string | null; // Selected appliance for editing
  placingApplianceType: ApplianceType | null; // Appliance being placed
  gridSize: number; // Snap grid in px
  showGrid: boolean;
  showDimensions: boolean; // Show wall dimension labels
  showWorkTriangle: boolean; // Show kitchen work triangle
  scaleMmPerPx: number; // Scale factor for floor plan
  // Undo/Redo history
  history: FloorPlanHistorySnapshot[];
  historyIndex: number;
  // Snap settings for tools
  snapToGrid?: boolean; // Snap to grid when drawing/moving
  gridSizeMm?: number; // Grid size in mm (10, 25, 50, 100, 200)
  snapToObjects?: SnapObjectsSettings; // Object snap settings
}

/* ----------------------------- 3D Model Import Types ----------------------------- */

/** 3D Model category for preset library */
export type Model3DCategory = "kitchen" | "appliance" | "furniture" | "decor" | "custom";

/** Preset 3D model definition */
export interface Model3DPreset {
  id: string;
  name: string;
  category: Model3DCategory;
  thumbnailUrl: string;
  modelUrl: string; // URL to GLB/GLTF file
  defaultScale: number;
  description?: string;
}

/** Imported 3D model instance in scene */
export interface Imported3DModel {
  id: string;
  name: string;
  // Source
  sourceType: "file" | "url" | "preset";
  sourceUrl?: string; // URL or data URL for the model
  presetId?: string; // If from preset library
  // Transform
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number }; // Euler angles in degrees
  scale: { x: number; y: number; z: number };
  // Metadata
  category: Model3DCategory;
  visible: boolean;
  locked: boolean;
  // Original file name if uploaded
  fileName?: string;
}

/** 3D Models state */
export interface Models3DState {
  models: Imported3DModel[];
  selectedModelId: string | null;
  presets: Model3DPreset[];
}

/** Default 3D model presets - common kitchen items */
export const DEFAULT_3D_PRESETS: Model3DPreset[] = [
  {
    id: "preset_sink_single",
    name: "Single Bowl Sink",
    category: "kitchen",
    thumbnailUrl: "/assets/3d-presets/sink-single-thumb.png",
    modelUrl: "/assets/3d-presets/sink-single.glb",
    defaultScale: 1,
    description: "Standard single bowl kitchen sink",
  },
  {
    id: "preset_sink_double",
    name: "Double Bowl Sink",
    category: "kitchen",
    thumbnailUrl: "/assets/3d-presets/sink-double-thumb.png",
    modelUrl: "/assets/3d-presets/sink-double.glb",
    defaultScale: 1,
    description: "Double bowl kitchen sink with drainer",
  },
  {
    id: "preset_hob_4burner",
    name: "4 Burner Hob",
    category: "appliance",
    thumbnailUrl: "/assets/3d-presets/hob-4burner-thumb.png",
    modelUrl: "/assets/3d-presets/hob-4burner.glb",
    defaultScale: 1,
    description: "4 burner gas hob",
  },
  {
    id: "preset_chimney",
    name: "Chimney Hood",
    category: "appliance",
    thumbnailUrl: "/assets/3d-presets/chimney-thumb.png",
    modelUrl: "/assets/3d-presets/chimney.glb",
    defaultScale: 1,
    description: "Wall-mounted chimney hood",
  },
  {
    id: "preset_fridge",
    name: "Refrigerator",
    category: "appliance",
    thumbnailUrl: "/assets/3d-presets/fridge-thumb.png",
    modelUrl: "/assets/3d-presets/fridge.glb",
    defaultScale: 1,
    description: "Double door refrigerator",
  },
  {
    id: "preset_microwave",
    name: "Microwave Oven",
    category: "appliance",
    thumbnailUrl: "/assets/3d-presets/microwave-thumb.png",
    modelUrl: "/assets/3d-presets/microwave.glb",
    defaultScale: 1,
    description: "Countertop microwave oven",
  },
  {
    id: "preset_base_cabinet",
    name: "Base Cabinet",
    category: "kitchen",
    thumbnailUrl: "/assets/3d-presets/base-cabinet-thumb.png",
    modelUrl: "/assets/3d-presets/base-cabinet.glb",
    defaultScale: 1,
    description: "Standard 600mm base cabinet",
  },
  {
    id: "preset_wall_cabinet",
    name: "Wall Cabinet",
    category: "kitchen",
    thumbnailUrl: "/assets/3d-presets/wall-cabinet-thumb.png",
    modelUrl: "/assets/3d-presets/wall-cabinet.glb",
    defaultScale: 1,
    description: "Standard 600mm wall cabinet",
  },
];
