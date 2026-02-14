/**
 * Canvas History Slice
 *
 * Zustand slice for undo/redo history state and actions.
 * Extracted from useDesignCanvasStore.ts to reduce God-store complexity.
 *
 * Pattern: Matches createFloorPlanSlice / createModels3DSlice convention.
 */

import type { DrawnUnit } from '../../../types';

/* ========================= Constants ========================= */

const MAX_HISTORY_SIZE = 50;

/* ========================= Initial State ========================= */

export const initialCanvasHistoryState = {
    history: [] as DrawnUnit[][],
    historyIndex: -1,
    lastDeletedCanvas: null as { key: string; units: DrawnUnit[]; name: string } | null,
};

/* ========================= Slice State Shape ========================= */

export interface CanvasHistorySliceState {
    history: DrawnUnit[][];
    historyIndex: number;
    lastDeletedCanvas: { key: string; units: DrawnUnit[]; name: string } | null;
}

export interface CanvasHistoryActions {
    pushHistory: () => void;
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
}

export type CanvasHistorySlice = CanvasHistorySliceState & CanvasHistoryActions;

/* ========================= Slice Creator ========================= */

/**
 * Creates the Canvas History slice.
 *
 * Uses get()/set() to access full store state (drawnUnits, roomUnits, etc.)
 * since undo/redo must restore domain state across concerns.
 */
export const createCanvasHistorySlice = (
    set: Function,
    get: Function,
) => ({
    ...initialCanvasHistoryState,

    pushHistory: () => set((state: any) => {
        // Clone current drawnUnits to history
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(state.drawnUnits.map((u: DrawnUnit) => ({ ...u })));

        // Limit history size
        if (newHistory.length > MAX_HISTORY_SIZE) {
            newHistory.shift();
        }

        return {
            history: newHistory,
            historyIndex: newHistory.length - 1
        };
    }),

    undo: () => {
        const state = get();
        const { history, historyIndex, drawnUnits, lastDeletedCanvas } = state;

        // First priority: restore deleted canvas if exists
        if (lastDeletedCanvas) {
            // Restore the deleted canvas
            const updatedRoomUnits = {
                ...state.roomUnits,
                [lastDeletedCanvas.key]: lastDeletedCanvas.units,
            };
            const updatedCanvasNames = {
                ...state.canvasNames,
                [lastDeletedCanvas.key]: lastDeletedCanvas.name,
            };

            // Parse the key to get canvas index
            const keyParts = lastDeletedCanvas.key.split('_');
            const restoredCanvasIndex = parseInt(keyParts[keyParts.length - 1], 10);

            set({
                roomUnits: updatedRoomUnits,
                canvasNames: updatedCanvasNames,
                lastDeletedCanvas: null,  // Clear after restore
                activeCanvasIndex: restoredCanvasIndex,
                drawnUnits: lastDeletedCanvas.units,
                activeUnitIndex: lastDeletedCanvas.units.length > 0 ? 0 : -1,
                selectedUnitIndices: lastDeletedCanvas.units.length > 0 ? [0] : [],
            });
            return;
        }

        // If no history yet, save current state first
        if (history.length === 0 && drawnUnits.length > 0) {
            get().pushHistory();
        }

        const currentIndex = get().historyIndex;
        if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            const restoredUnits = history[newIndex].map((u: DrawnUnit) => ({ ...u }));
            set({
                historyIndex: newIndex,
                drawnUnits: restoredUnits,
                activeUnitIndex: restoredUnits.length > 0 ? 0 : -1,
                selectedUnitIndices: restoredUnits.length > 0 ? [0] : []
            });
        }
    },

    redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            const restoredUnits = history[newIndex].map((u: DrawnUnit) => ({ ...u }));
            set({
                historyIndex: newIndex,
                drawnUnits: restoredUnits,
                activeUnitIndex: restoredUnits.length > 0 ? 0 : -1,
                selectedUnitIndices: restoredUnits.length > 0 ? [0] : []
            });
        }
    },

    canUndo: () => {
        const { historyIndex, lastDeletedCanvas } = get();
        return historyIndex > 0 || lastDeletedCanvas !== null;
    },

    canRedo: () => {
        const { history, historyIndex } = get();
        return historyIndex < history.length - 1;
    },
});
