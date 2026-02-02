/**
 * Photo Slice
 * Owns: Room photo, reference photos
 *
 * This slice manages:
 * - Main room photo (single)
 * - Reference photos (multiple)
 * - Active photo selection
 *
 * NOTE: This slice only manages photo state.
 * Side effects (resetting drawing state when photo changes)
 * are handled by the main store orchestrator.
 */

import type { StateCreator } from "zustand";
import type { PhotoSliceState, PhotoSliceActions } from "../../types/slices";
import type { RoomPhoto, ReferencePhoto } from "../../types";

/**
 * Initial state for photo slice
 */
export const initialPhotoState: PhotoSliceState = {
  roomPhoto: undefined,
  referencePhotos: [],
  activePhotoId: null,
};

/**
 * Photo slice type (state + actions)
 */
export type PhotoSlice = PhotoSliceState & PhotoSliceActions;

/**
 * Dependencies from other slices that photo slice needs
 */
export interface PhotoSliceDeps {
  getStatus: () => "DRAFT" | "APPROVED";
  addAudit: (action: string, details?: string) => void;
}

/**
 * Photo slice creator with dependency injection
 */
export const createPhotoSlice = (
  deps: PhotoSliceDeps
): StateCreator<PhotoSlice, [], [], PhotoSlice> => (set, get) => ({
  ...initialPhotoState,

  // Room photo capture
  setRoomPhoto: (src: string, width: number, height: number) => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({
      roomPhoto: { src, width, height },
    }));
    deps.addAudit("Room photo set", `w=${width}px h=${height}px`);
  },

  clearRoomPhoto: () => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({
      roomPhoto: undefined,
    }));
    deps.addAudit("Room photo cleared");
  },

  // Reference photos (multiple)
  addReferencePhoto: (src: string, width: number, height: number) => {
    if (deps.getStatus() === "APPROVED") return;
    const id = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((s) => ({
      referencePhotos: [...s.referencePhotos, { id, src, width, height }],
      activePhotoId: id, // Auto-select newly added photo
    }));
    deps.addAudit("Reference photo added", `id=${id}`);
  },

  removeReferencePhoto: (id: string) => {
    if (deps.getStatus() === "APPROVED") return;
    set((s) => {
      const newPhotos = s.referencePhotos.filter((p) => p.id !== id);
      // If removed photo was active, select the last one or null
      const lastPhoto = newPhotos[newPhotos.length - 1];
      const newActiveId = s.activePhotoId === id
        ? (lastPhoto ? lastPhoto.id : null)
        : s.activePhotoId;
      return {
        referencePhotos: newPhotos,
        activePhotoId: newActiveId,
      };
    });
    deps.addAudit("Reference photo removed", `id=${id}`);
  },

  setActivePhotoId: (id: string | null) => {
    set(() => ({ activePhotoId: id }));
  },

  clearReferencePhotos: () => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({
      referencePhotos: [],
      activePhotoId: null,
    }));
    deps.addAudit("All reference photos cleared");
  },
});
