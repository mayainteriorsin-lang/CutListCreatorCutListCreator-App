import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    DrawnUnit,
    WardrobeBox,
    LoftBox,
    RoomPhoto,
    ReferencePhoto,
    ScaleState,
    UnitType,
    RoomState,
    WallId,
    RoomInputType,
    Obstruction,
    WardrobeAddOn,
    DrawnAddOn,
    ScaleCalibration,
    WardrobeSpec
} from '../../types';
import {
    createFloorPlanSlice,
    createModels3DSlice,
    type FloorPlanSlice,
    type Models3DSlice
} from '../../features/floor-plan-3d/state';
import {
    createCanvasHistorySlice,
    initialCanvasHistoryState,
    type CanvasHistorySlice,
} from './slices/canvasHistorySlice';
import {
    createCanvasUISlice,
    initialCanvasUIState,
    type CanvasUISlice,
} from './slices/canvasUISlice';
import {
    createCanvasDomainSlice,
    initialCanvasDomainState,
    type CanvasDomainSlice,
} from './slices/canvasDomainSlice';

/**
 * Design Canvas Store (v2)
 *
 * Manages drawing state and canvas interactions only.
 * Replaces the drawing/canvas portion of visualQuotationStore.
 *
 * Composed from focused slices:
 * - canvasDomainSlice: Core drawing domain (units, boxes, rooms, canvases)
 * - canvasHistorySlice: Undo/redo history
 * - canvasUISlice: View toggles, drawing mode, unit types
 * - floorPlanSlice: Floor plan drawing (external)
 * - models3DSlice: 3D model imports (external)
 */

export interface DesignCanvasState extends FloorPlanSlice, Models3DSlice {
    // Multi-Room Project State
    roomUnits: Record<string, DrawnUnit[]>;  // Key: "floorId_roomId_canvasIndex" → units for that canvas
    canvasNames: Record<string, string>;     // Key: "floorId_roomId_canvasIndex" → display name (e.g., "Wardrobe 2")
    activeFloorId: string;
    activeRoomId: string;
    activeCanvasIndex: number;  // Current canvas within the room (0-based)

    // History State (Undo/Redo)
    history: DrawnUnit[][];
    historyIndex: number;
    lastDeletedCanvas: { key: string; units: DrawnUnit[]; name: string } | null;  // For undo canvas deletion

    // Drawing State - Units (Current room's units)
    drawnUnits: DrawnUnit[];
    activeUnitIndex: number;
    selectedUnitIndices: number[];
    activeEditPart: "shutter" | "loft";
    addOnDrawMode: WardrobeAddOn | null;

    // Drawing State - Current Box
    wardrobeBox: WardrobeBox | null;
    loftBox: LoftBox | null;

    // Room Photo
    roomPhoto: RoomPhoto | null;
    referencePhotos: ReferencePhoto[];
    activePhotoId: string | null;

    // Simple Room Input State (Legacy support for non-floorplan mode)
    room: RoomState;

    // View State
    canvas3DViewEnabled: boolean;
    floorPlanEnabled: boolean;

    // Scale Calibration
    scale: ScaleState;

    // Drawing Mode / UI State
    drawMode: boolean;
    editMode: "shutter" | "carcass";
    captureOnlyUnitId: string | null; // Added

    // Production Canvas Snapshots (per-unit images for production page)
    productionCanvasSnapshots: Map<string, string>;


    // Unit Settings
    unitType: UnitType;
    customUnitTypes: string[];
    customFloors: string[];  // Custom floor IDs like "ground_2", "first_2"
    customRooms: string[];   // Custom room IDs like "master_bedroom_2", "kitchen_2"

    // Shutter Layout (Current Active)
    shutterCount: number;
    sectionCount: number; // Added
    shutterDividerXs: number[];
    loftEnabled: boolean;
    loftHeightRatio: number;
    loftShutterCount: number;
    loftDividerXs: number[];
    loftDividerYs: number[]; // Added

    // Wardrobe Specification (Current Drawing)
    wardrobeSpec: WardrobeSpec | null;

    // Actions - Wardrobe Spec
    setDepthMm: (depth: number) => void;
    computeAreas: () => void;

    // Actions - Units (Basic)
    addUnit: (unit: DrawnUnit) => void;
    updateUnit: (index: number, unit: Partial<DrawnUnit>) => void;
    deleteUnit: (index: number) => void;
    // Aliases / Convenience
    deleteDrawnUnit: (index: number) => void;
    updateActiveDrawnUnit: (patch: Partial<DrawnUnit>) => void;
    updateDrawnUnitById: (id: string, patch: Partial<DrawnUnit>) => void;

    // Actions - Unit Manipulation (Advanced)
    saveCurrentUnitAndAddNew: () => void;
    setActiveUnitIndex: (index: number) => void;
    selectAllUnits: () => void;
    clearUnitSelection: () => void;
    setSelectedUnitIndices: (indices: number[]) => void;
    deleteSelectedUnits: () => void;
    nudgeDrawnUnit: (index: number, dx: number, dy: number) => void;
    removeLoftFromUnit: (index: number) => void;
    setUnitShelfCount: (index: number, count: number) => void;
    setActiveEditPart: (part: "shutter" | "loft") => void;

    // Actions - Add-ons
    setAddOnDrawMode: (addOnType: WardrobeAddOn | null) => void;
    addDrawnAddOn: (addOn: Omit<DrawnAddOn, "id">) => void;
    removeDrawnAddOn: (addOnId: string) => void;
    updateDrawnAddOn: (addOnId: string, patch: Partial<DrawnAddOn>) => void;

    // Actions - Photos
    setRoomPhoto: (src: string, width: number, height: number) => void;
    clearRoomPhoto: () => void;
    addReferencePhoto: (photo: ReferencePhoto) => void;
    removeReferencePhoto: (id: string) => void;

    // Actions - Simple Room
    setSelectedWall: (wallId: WallId) => void;
    setRoomInputType: (type: RoomInputType) => void;
    addObstruction: (obs: Obstruction) => void;
    removeObstruction: (id: string) => void;
    clearObstructions: () => void;

    // Actions - View
    setCanvas3DViewEnabled: (enabled: boolean) => void;
    setFloorPlanEnabled: (enabled: boolean) => void;

    // Actions - Drawing Mode
    setDrawMode: (enabled: boolean) => void;
    setEditMode: (mode: "shutter" | "carcass") => void;
    setCaptureOnlyUnitId: (id: string | null) => void;
    setUnitType: (type: UnitType) => void;
    addCustomUnitType: (type: string) => void;
    addCustomFloor: () => void;   // Creates new floor based on current (e.g., "Ground 2")
    addCustomRoom: () => void;    // Creates new room based on current (e.g., "Master Bedroom 2")
    getAllFloors: () => { value: string; label: string }[];
    getAllRooms: () => { value: string; label: string }[];

    // Actions - Scale
    setScale: (scale: Partial<ScaleState>) => void;

    // Actions - Production Snapshots
    setProductionCanvasSnapshots: (snapshots: Map<string, string>) => void;

    // Actions - Shutter Layout
    setShutterCount: (count: number) => void;
    setLoftShutterCount: (count: number) => void;
    setShutterDividerXs: (dividers: number[]) => void;
    setLoftEnabled: (enabled: boolean) => void;
    setLoftBox: (box: LoftBox | null) => void;
    clearWardrobeBox: () => void;
    setWardrobeBox: (box: WardrobeBox | null) => void;

    // Actions - History (Undo/Redo)
    pushHistory: () => void;
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;

    // Actions - Multi-Room
    switchRoom: (floorId: string, roomId: string) => void;
    getRoomKey: (floorId: string, roomId: string) => string;
    getAllRoomUnits: () => Record<string, DrawnUnit[]>;
    clearCurrentRoom: () => void;

    // Actions - Multi-Canvas (within same room)
    addNewCanvas: () => void;
    switchCanvas: (canvasIndex: number) => void;
    getCanvasCount: () => number;
    deleteCanvas: (canvasIndex: number) => void;
    getFullRoomKey: () => string;
    getCanvasName: (canvasIndex: number) => string;
    getCanvasNames: () => { index: number; name: string }[];

    reset: () => void;
}

export const useDesignCanvasStore = create<DesignCanvasState>()(
    persist(
        (set, get, api) => {
            // Placeholder audit function for internal slices
            const addAudit = (action: string, detail?: string) => {
                // Future integration with audit system
            };

            const floorPlanSlice = createFloorPlanSlice(addAudit)(set, get, api);
            const models3DSlice = createModels3DSlice(addAudit)(set, get, api);
            const historySlice = createCanvasHistorySlice(set, get);
            const uiSlice = createCanvasUISlice(set, get);
            const domainSlice = createCanvasDomainSlice(set, get);

            return {
                ...floorPlanSlice,
                ...models3DSlice,
                ...domainSlice,
                ...historySlice,
                ...uiSlice,

                reset: () => set({
                    ...initialCanvasDomainState,
                    ...initialCanvasHistoryState,
                    ...initialCanvasUIState,
                    floorPlan: floorPlanSlice.floorPlan,
                }),
            };
        },
        {
            name: 'design-canvas-storage-v2',
            version: 1,
            onRehydrateStorage: () => (state) => {
                // Convert productionCanvasSnapshots back to a Map after hydration
                // (zustand persist serializes Maps to plain objects)
                if (state && state.productionCanvasSnapshots && !(state.productionCanvasSnapshots instanceof Map)) {
                    state.productionCanvasSnapshots = new Map(Object.entries(state.productionCanvasSnapshots));
                }
            },
        }
    )
);
