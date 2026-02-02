/**
 * Floor Plan 3D State
 *
 * Public API for the Floor Plan 3D state slices.
 * All external imports should come through this file.
 */

// ========================= Floor Plan Slice =========================
export {
  createFloorPlanSlice,
  initialFloorPlanState,
} from "./floorPlanSlice";

export type {
  FloorPlanActions,
  FloorPlanSliceState,
  FloorPlanSlice,
} from "./floorPlanSlice";

// ========================= Models 3D Slice =========================
export {
  createModels3DSlice,
  initialModels3DState,
} from "./models3DSlice";

export type {
  Models3DActions,
  Models3DSliceState,
  Models3DSlice,
} from "./models3DSlice";

// ========================= Types =========================
// Floor Plan types
export type {
  KitchenLayoutType,
  WallOpeningType,
  WallOpening,
  WallEdgeAlignment,
  FloorPlanWall,
  FloorPlanRoom,
  KitchenRun,
  KitchenZone,
  KitchenUnitBox,
  KitchenConfig,
  FloorShapeType,
  LShapeCutCorner,
  FloorPlanFloor,
  FloorPlanDrawMode,
  ApplianceType,
  FloorPlanAppliance,
  FloorPlanHistorySnapshot,
  SnapObjectsSettings,
  FloorPlanState,
} from "./types";

// 3D Model types
export type {
  Model3DCategory,
  Model3DPreset,
  Imported3DModel,
  Models3DState,
} from "./types";

// Constants
export { DEFAULT_3D_PRESETS } from "./types";
