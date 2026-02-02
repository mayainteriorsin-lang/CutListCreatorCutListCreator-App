/**
 * Store Slices - Barrel Export
 * Each slice owns its state and actions
 *
 * @deprecated V1 LEGACY - Use V2 stores instead:
 * - useDesignCanvasStore (replaces drawing, units, photo slices)
 * - usePricingStore (replaces pricing logic)
 * - useQuotationMetaStore (replaces client slice)
 * - useRoomStore (replaces room slice)
 *
 * Import from '../index' for V2 stores.
 * These slices remain for backward compatibility during migration.
 */

// Client slice
export { createClientSlice, initialClientState } from "./clientSlice";
export type { ClientSlice } from "./clientSlice";

// Photo slice
export { createPhotoSlice, initialPhotoState } from "./photoSlice";
export type { PhotoSlice, PhotoSliceDeps } from "./photoSlice";

// Config slice
export { createConfigSlice, initialConfigState } from "./configSlice";
export type { ConfigSlice, ConfigSliceDeps } from "./configSlice";

// Room slice
export { createRoomSlice, initialRoomState, initialRoomInputState } from "./roomSlice";
export type { RoomSlice, RoomSliceDeps } from "./roomSlice";

// Units slice
export { createUnitsSlice, initialUnitsState } from "./unitsSlice";
export type { UnitsSlice, UnitsSliceDeps } from "./unitsSlice";

// Drawing slice
export { createDrawingSlice, initialDrawingState } from "./drawingSlice";
export type { DrawingSlice, DrawingSliceDeps } from "./drawingSlice";

// Combined slices utility
export {
  createCombinedSlices,
  combinedInitialState,
} from "./createCombinedSlices";
export type { CombinedSliceState } from "./createCombinedSlices";
