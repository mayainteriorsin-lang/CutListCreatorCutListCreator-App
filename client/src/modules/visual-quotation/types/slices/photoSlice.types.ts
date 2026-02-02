/**
 * Photo Slice State Types
 * Owns: Room photo, reference photos
 */

import type { RoomPhoto, ReferencePhoto } from "../room";

/**
 * PhotoSliceState
 * Responsible for photo management (main + references)
 */
export interface PhotoSliceState {
  /* Main room photo */
  roomPhoto?: RoomPhoto;

  /* Reference photos (multiple) */
  referencePhotos: ReferencePhoto[];
  activePhotoId: string | null;
}

/**
 * PhotoSliceActions
 * Actions owned by photo slice
 */
export interface PhotoSliceActions {
  // Room photo capture
  setRoomPhoto: (src: string, width: number, height: number) => void;
  clearRoomPhoto: () => void;

  // Reference photos (multiple)
  addReferencePhoto: (src: string, width: number, height: number) => void;
  removeReferencePhoto: (id: string) => void;
  setActivePhotoId: (id: string | null) => void;
  clearReferencePhotos: () => void;
}

export type PhotoSlice = PhotoSliceState & PhotoSliceActions;
