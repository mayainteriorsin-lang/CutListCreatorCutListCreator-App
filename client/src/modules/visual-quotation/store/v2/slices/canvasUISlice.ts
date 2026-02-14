/**
 * Canvas UI Slice
 *
 * Zustand slice for UI/view state and actions:
 * - View toggles (3D, floor plan)
 * - Drawing mode / edit mode
 * - Unit type selection and custom types
 * - Custom floors / rooms
 * - Production snapshots
 * - Capture-only unit
 *
 * Extracted from useDesignCanvasStore.ts to reduce God-store complexity.
 */

import type { UnitType, RoomInputType, WallId } from '../../../types';
import { FLOOR_OPTIONS, ROOM_OPTIONS } from '../../../constants';

/* ========================= Initial State ========================= */

export const initialCanvasUIState = {
    canvas3DViewEnabled: false,
    floorPlanEnabled: false,
    drawMode: false,
    editMode: "shutter" as "shutter" | "carcass",
    captureOnlyUnitId: null as string | null,
    unitType: 'wardrobe' as UnitType,
    customUnitTypes: [] as string[],
    customFloors: [] as string[],
    customRooms: [] as string[],
    productionCanvasSnapshots: new Map<string, string>(),
};

/* ========================= Slice State Shape ========================= */

export interface CanvasUISliceState {
    canvas3DViewEnabled: boolean;
    floorPlanEnabled: boolean;
    drawMode: boolean;
    editMode: "shutter" | "carcass";
    captureOnlyUnitId: string | null;
    unitType: UnitType;
    customUnitTypes: string[];
    customFloors: string[];
    customRooms: string[];
    productionCanvasSnapshots: Map<string, string>;
}

export interface CanvasUIActions {
    setCanvas3DViewEnabled: (enabled: boolean) => void;
    setFloorPlanEnabled: (enabled: boolean) => void;
    setDrawMode: (enabled: boolean) => void;
    setEditMode: (mode: "shutter" | "carcass") => void;
    setCaptureOnlyUnitId: (id: string | null) => void;
    setUnitType: (type: UnitType) => void;
    addCustomUnitType: (type: string) => void;
    addCustomFloor: () => void;
    addCustomRoom: () => void;
    getAllFloors: () => { value: string; label: string }[];
    getAllRooms: () => { value: string; label: string }[];
    setProductionCanvasSnapshots: (snapshots: Map<string, string>) => void;
}

export type CanvasUISlice = CanvasUISliceState & CanvasUIActions;

/* ========================= Slice Creator ========================= */

/**
 * Creates the Canvas UI slice.
 *
 * Uses get()/set() to access full store state since addCustomFloor/addCustomRoom
 * need to save current units and switch context.
 */
export const createCanvasUISlice = (
    set: Function,
    get: Function,
) => ({
    ...initialCanvasUIState,

    // View Actions
    setCanvas3DViewEnabled: (enabled: boolean) => set({ canvas3DViewEnabled: enabled }),

    setFloorPlanEnabled: (enabled: boolean) => set({ floorPlanEnabled: enabled }),

    // Drawing Mode Actions
    setDrawMode: (enabled: boolean) => set({ drawMode: enabled }),

    setEditMode: (enabled: "shutter" | "carcass") => set({ editMode: enabled }),

    setCaptureOnlyUnitId: (id: string | null) => set({ captureOnlyUnitId: id }),

    setUnitType: (type: UnitType) => set({ unitType: type }),

    addCustomUnitType: (type: string) => set((state: any) => ({
        customUnitTypes: [...new Set([...state.customUnitTypes, type])]
    })),

    addCustomFloor: () => {
        const state = get();
        const currentFloorId = state.activeFloorId;
        const currentKey = `${state.activeFloorId}_${state.activeRoomId}_${state.activeCanvasIndex}`;

        // Get label for current floor
        const baseFloor = FLOOR_OPTIONS.find((f: any) => f.value === currentFloorId);
        const baseLabel = baseFloor?.label || currentFloorId.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

        // Count existing custom floors based on this floor
        let count = 1;
        const baseId = currentFloorId.replace(/_\d+$/, ''); // Remove any existing number suffix
        for (const customFloor of state.customFloors) {
            if (customFloor.startsWith(baseId)) {
                count++;
            }
        }
        count++; // For the new one

        const newFloorId = `${baseId}_${count}`;

        // Save current canvas's units
        const updatedRoomUnits = {
            ...state.roomUnits,
            [currentKey]: [...state.drawnUnits]
        };

        // Create new canvas name for the new floor
        const newKey = `${newFloorId}_${state.activeRoomId}_0`;
        const unitTypeLabel = state.unitType
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase());
        const updatedCanvasNames = {
            ...state.canvasNames,
            [newKey]: `${unitTypeLabel} 1`
        };

        set({
            customFloors: [...state.customFloors, newFloorId],
            roomUnits: updatedRoomUnits,
            canvasNames: updatedCanvasNames,
            activeFloorId: newFloorId,
            activeCanvasIndex: 0,
            drawnUnits: [],
            activeUnitIndex: -1,
            selectedUnitIndices: [],
            wardrobeBox: null,
            loftBox: null,
            drawMode: false,
            history: [],
            historyIndex: -1,
            roomPhoto: null,
        });
    },

    addCustomRoom: () => {
        const state = get();
        const currentRoomId = state.activeRoomId;
        const currentKey = `${state.activeFloorId}_${state.activeRoomId}_${state.activeCanvasIndex}`;

        // Get label for current room
        const baseRoom = ROOM_OPTIONS.find((r: any) => r.value === currentRoomId);
        const baseLabel = baseRoom?.label || currentRoomId.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

        // Count existing custom rooms based on this room
        let count = 1;
        const baseId = currentRoomId.replace(/_\d+$/, ''); // Remove any existing number suffix
        for (const customRoom of state.customRooms) {
            if (customRoom.startsWith(baseId)) {
                count++;
            }
        }
        count++; // For the new one

        const newRoomId = `${baseId}_${count}`;

        // Save current canvas's units
        const updatedRoomUnits = {
            ...state.roomUnits,
            [currentKey]: [...state.drawnUnits]
        };

        // Create new canvas name for the new room
        const newKey = `${state.activeFloorId}_${newRoomId}_0`;
        const unitTypeLabel = state.unitType
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase());
        const updatedCanvasNames = {
            ...state.canvasNames,
            [newKey]: `${unitTypeLabel} 1`
        };

        set({
            customRooms: [...state.customRooms, newRoomId],
            roomUnits: updatedRoomUnits,
            canvasNames: updatedCanvasNames,
            activeRoomId: newRoomId,
            activeCanvasIndex: 0,
            drawnUnits: [],
            activeUnitIndex: -1,
            selectedUnitIndices: [],
            wardrobeBox: null,
            loftBox: null,
            drawMode: false,
            history: [],
            historyIndex: -1,
            roomPhoto: null,
        });
    },

    getAllFloors: () => {
        const state = get();
        // Combine standard floors with custom floors
        const floors = FLOOR_OPTIONS.map((f: any) => ({ value: f.value, label: f.label }));

        // Add custom floors with generated labels
        for (const customFloor of state.customFloors) {
            // Parse the custom floor ID to get base and number
            const match = customFloor.match(/^(.+)_(\d+)$/);
            if (match) {
                const baseId = match[1];
                const num = match[2];
                const baseFloor = FLOOR_OPTIONS.find((f: any) => f.value === baseId);
                const baseLabel = baseFloor?.label || baseId.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                floors.push({ value: customFloor, label: `${baseLabel} ${num}` });
            }
        }

        return floors;
    },

    getAllRooms: () => {
        const state = get();
        // Combine standard rooms with custom rooms
        const rooms = ROOM_OPTIONS.map((r: any) => ({ value: r.value, label: r.label }));

        // Add custom rooms with generated labels
        for (const customRoom of state.customRooms) {
            // Parse the custom room ID to get base and number
            const match = customRoom.match(/^(.+)_(\d+)$/);
            if (match) {
                const baseId = match[1];
                const num = match[2];
                const baseRoom = ROOM_OPTIONS.find((r: any) => r.value === baseId);
                const baseLabel = baseRoom?.label || baseId.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                rooms.push({ value: customRoom, label: `${baseLabel} ${num}` });
            }
        }

        return rooms;
    },

    // Production Snapshots Actions
    setProductionCanvasSnapshots: (snapshots: Map<string, string>) => set({ productionCanvasSnapshots: snapshots }),
});
