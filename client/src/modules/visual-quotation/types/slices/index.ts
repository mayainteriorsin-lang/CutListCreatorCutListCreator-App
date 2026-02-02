/**
 * Slice Types - Barrel Export
 * State interfaces for store decomposition
 */

// Client slice
export type {
  ClientSliceState,
  ClientSliceActions,
  ClientSlice,
} from "./clientSlice.types";

// Photo slice
export type {
  PhotoSliceState,
  PhotoSliceActions,
  PhotoSlice,
} from "./photoSlice.types";

// Room slice
export type {
  RoomInputState,
  RoomSliceState,
  RoomSliceActions,
  RoomSlice,
} from "./roomSlice.types";

// Units slice
export type {
  UnitsSliceState,
  UnitsSliceActions,
  UnitsSlice,
} from "./unitsSlice.types";

// Drawing slice
export type {
  DrawingSliceState,
  DrawingSliceActions,
  DrawingSlice,
} from "./drawingSlice.types";

// Config slice
export type {
  ConfigSliceState,
  ConfigSliceActions,
  ConfigSlice,
} from "./configSlice.types";
