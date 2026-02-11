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
import { FLOOR_OPTIONS, ROOM_OPTIONS } from '../../constants';

/**
 * Design Canvas Store (v2)
 * 
 * Manages drawing state and canvas interactions only.
 * Replaces the drawing/canvas portion of visualQuotationStore.
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

const MAX_HISTORY_SIZE = 50;

const initialState = {
    // Multi-Room Project
    roomUnits: {} as Record<string, DrawnUnit[]>,
    canvasNames: {} as Record<string, string>,  // Canvas display names
    activeFloorId: "ground",
    activeRoomId: "master_bedroom",
    activeCanvasIndex: 0,  // Start with canvas 0

    // History
    history: [] as DrawnUnit[][],
    historyIndex: -1,
    lastDeletedCanvas: null as { key: string; units: DrawnUnit[]; name: string } | null,

    activeUnitIndex: -1,
    selectedUnitIndices: [],
    activeEditPart: "shutter" as const,
    addOnDrawMode: null,
    drawnUnits: [],
    captureOnlyUnitId: null,
    productionCanvasSnapshots: new Map<string, string>(),

    wardrobeBox: null,
    loftBox: null,
    wardrobeSpec: {
        depthMm: 600,
        carcassAreaSqft: 0,
        shutterAreaSqft: 0
    },
    roomPhoto: null,
    referencePhotos: [],
    activePhotoId: null,
    room: {
        inputType: "MANUAL" as RoomInputType,
        selectedWallId: "CENTER" as WallId,
        walls: [],
        obstructions: [],
        scale: {
            refPx: 0,
            refMm: 0,
            pxToMm: 0,
            confidence: "LOW"
        } as ScaleCalibration,
    } as RoomState,
    canvas3DViewEnabled: false,
    floorPlanEnabled: false,
    scale: {
        pixelsPerMm: 1,
        calibrated: false,
        lineStart: null,
        lineEnd: null,
        realWorldMm: 0,
        px: 0,
        mm: 0,
        ratio: 0,
        factor: 1, // Added to match usage
    } as ScaleState,
    drawMode: false,
    editMode: "shutter" as "shutter" | "carcass",
    unitType: 'wardrobe' as UnitType,
    customUnitTypes: [],
    customFloors: [],
    customRooms: [],
    shutterCount: 3,
    sectionCount: 1,
    shutterDividerXs: [],
    loftEnabled: false,
    loftHeightRatio: 0.17,
    loftShutterCount: 2,
    loftDividerXs: [],
    loftDividerYs: [],
};

export const useDesignCanvasStore = create<DesignCanvasState>()(
    persist(
        (set, get, api) => {
            // Placeholder audit function for internal slices
            const addAudit = (action: string, detail?: string) => {
                // Future integration with audit system
            };

            const floorPlanSlice = createFloorPlanSlice(addAudit)(set, get, api);
            const models3DSlice = createModels3DSlice(addAudit)(set, get, api);

            return {
                ...initialState,
                ...floorPlanSlice,
                ...models3DSlice,

                // Unit Actions
                addUnit: (unit) => set(state => ({
                    drawnUnits: [...state.drawnUnits, unit]
                })),

                updateUnit: (index, updates) => set(state => ({
                    drawnUnits: state.drawnUnits.map((u, i) =>
                        i === index ? { ...u, ...updates } : u
                    )
                })),

                deleteUnit: (index) => {
                    // Push current state to history before deletion
                    get().pushHistory();
                    set(state => ({
                        drawnUnits: state.drawnUnits.filter((_, i) => i !== index),
                        activeUnitIndex: state.drawnUnits.length > 1 ? Math.min(state.activeUnitIndex, state.drawnUnits.length - 2) : -1
                    }));
                },

                deleteDrawnUnit: (index) => get().deleteUnit(index),

                updateActiveDrawnUnit: (patch) => {
                    const { activeUnitIndex, drawnUnits } = get();
                    if (drawnUnits[activeUnitIndex]) {
                        get().updateUnit(activeUnitIndex, patch);
                    }
                },

                updateDrawnUnitById: (startId, patch) => {
                    set(state => ({
                        drawnUnits: state.drawnUnits.map(u => u.id === startId ? { ...u, ...patch } : u)
                    }));
                },

                setActiveUnitIndex: (index) => set(state => {
                    // Handle deselection (index = -1)
                    if (index < 0) {
                        return {
                            activeUnitIndex: -1,
                            selectedUnitIndices: [],
                        };
                    }
                    // Invalid index - no change
                    if (index >= state.drawnUnits.length) return {};
                    const unit = state.drawnUnits[index];
                    return {
                        activeUnitIndex: index,
                        selectedUnitIndices: [index],
                        // Load into drawing state
                        wardrobeBox: { ...unit.box },
                        loftBox: unit.loftBox ? { ...unit.loftBox } : undefined,
                        shutterCount: unit.shutterCount || 3,
                        sectionCount: unit.sectionCount || 1,
                        shutterDividerXs: [...(unit.shutterDividerXs || [])],
                        loftEnabled: unit.loftEnabled || false,
                        loftHeightRatio: unit.loftHeightRatio || 0.17,
                        loftShutterCount: unit.loftShutterCount || 2,
                        loftDividerXs: [...(unit.loftDividerXs || [])],
                        unitType: unit.unitType as UnitType
                    };
                }),

                saveCurrentUnitAndAddNew: () => set(state => {
                    if (!state.wardrobeBox) return {};

                    const sections = state.sectionCount || 1;
                    const boxH = state.wardrobeBox.height;
                    const boxY = state.wardrobeBox.y;
                    const hDividers = sections > 1
                        ? Array.from({ length: sections - 1 }, (_, i) => boxY + (boxH / sections) * (i + 1))
                        : [];

                    const newUnit: DrawnUnit = {
                        id: `unit-${Date.now()}`,
                        unitType: state.unitType || 'wardrobe',
                        wallId: state.room.selectedWallId,
                        box: { ...state.wardrobeBox },
                        loftBox: state.loftBox ? { ...state.loftBox } : undefined,
                        shutterCount: state.shutterCount,
                        shutterDividerXs: [...state.shutterDividerXs],
                        loftEnabled: state.loftEnabled,
                        loftHeightRatio: state.loftHeightRatio,
                        loftShutterCount: state.loftShutterCount,
                        loftDividerXs: [...state.loftDividerXs],
                        horizontalDividerYs: hDividers,
                        widthMm: 0, heightMm: 0, depthMm: 0,
                        loftWidthMm: 0, loftHeightMm: 0,
                        sectionCount: sections,
                        shelfCount: 0,
                        drawnAddOns: [],
                        finish: {
                            shutterLaminateCode: '',
                            loftLaminateCode: '',
                            innerLaminateCode: ''
                        }
                    };

                    const newIndex = state.drawnUnits.length;
                    return {
                        drawnUnits: [...state.drawnUnits, newUnit],
                        activeUnitIndex: newIndex,
                        selectedUnitIndices: [newIndex],
                        wardrobeBox: null,
                        loftBox: undefined,
                        shutterCount: 3,
                        sectionCount: 1,
                        shutterDividerXs: [],
                        loftEnabled: false,
                        loftDividerXs: [],
                        drawMode: false
                    };
                }),

                selectAllUnits: () => set(state => ({
                    selectedUnitIndices: state.drawnUnits.map((_, i) => i),
                    activeUnitIndex: 0
                })),

                clearUnitSelection: () => set({ selectedUnitIndices: [], activeUnitIndex: -1 }),

                setSelectedUnitIndices: (indices) => set(state => {
                    const valid = indices.filter(i => i >= 0 && i < state.drawnUnits.length);
                    return {
                        selectedUnitIndices: valid,
                        activeUnitIndex: valid.length > 0 ? valid[0] : -1
                    };
                }),

                deleteSelectedUnits: () => set(state => {
                    if (state.selectedUnitIndices.length === 0) return {};
                    const newUnits = state.drawnUnits.filter((_, i) => !state.selectedUnitIndices.includes(i));
                    return {
                        drawnUnits: newUnits,
                        selectedUnitIndices: [],
                        activeUnitIndex: newUnits.length > 0 ? 0 : -1,
                        wardrobeBox: null, // Clear drawing state if deleted
                        loftBox: undefined
                    };
                }),

                nudgeDrawnUnit: (index, dx, dy) => set(state => {
                    if (!state.drawnUnits[index]) return {};
                    const units = [...state.drawnUnits];
                    const u = units[index];
                    const newBox = { ...u.box, x: u.box.x + dx, y: u.box.y + dy };
                    const newLoft = u.loftBox ? { ...u.loftBox, x: u.loftBox.x + dx, y: u.loftBox.y + dy } : undefined;
                    units[index] = { ...u, box: newBox, loftBox: newLoft };
                    return { drawnUnits: units };
                }),

                removeLoftFromUnit: (index) => set(state => {
                    if (!state.drawnUnits[index]) return {};
                    const units = [...state.drawnUnits];
                    units[index] = { ...units[index], loftEnabled: false, loftBox: undefined };
                    return { drawnUnits: units };
                }),

                setUnitShelfCount: (index, count) => set(state => {
                    const units = [...state.drawnUnits];
                    if (units[index]) {
                        units[index] = { ...units[index], shelfCount: count };
                    }
                    return { drawnUnits: units };
                }),

                setActiveEditPart: (part) => set({ activeEditPart: part }),

                setAddOnDrawMode: (addOnType) => set({ addOnDrawMode: addOnType, drawMode: !!addOnType }),

                addDrawnAddOn: (addOn) => set(state => {
                    if (state.activeUnitIndex < 0 || !state.drawnUnits[state.activeUnitIndex]) return {};
                    const units = [...state.drawnUnits];
                    const active = units[state.activeUnitIndex];
                    const newAddOn: DrawnAddOn = {
                        id: `addon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        ...addOn
                    };
                    units[state.activeUnitIndex] = {
                        ...active,
                        drawnAddOns: [...(active.drawnAddOns || []), newAddOn]
                    };
                    return { drawnUnits: units, addOnDrawMode: null, drawMode: false };
                }),

                removeDrawnAddOn: (id) => set(state => {
                    if (state.activeUnitIndex < 0 || !state.drawnUnits[state.activeUnitIndex]) return {};
                    const units = [...state.drawnUnits];
                    const active = units[state.activeUnitIndex];
                    units[state.activeUnitIndex] = {
                        ...active,
                        drawnAddOns: (active.drawnAddOns || []).filter(a => a.id !== id)
                    };
                    return { drawnUnits: units };
                }),

                updateDrawnAddOn: (id, patch) => set(state => {
                    if (state.activeUnitIndex < 0 || !state.drawnUnits[state.activeUnitIndex]) return {};
                    const units = [...state.drawnUnits];
                    const active = units[state.activeUnitIndex];
                    units[state.activeUnitIndex] = {
                        ...active,
                        drawnAddOns: (active.drawnAddOns || []).map(a => a.id === id ? { ...a, ...patch } : a)
                    };
                    return { drawnUnits: units };
                }),

                // Photo Actions
                setRoomPhoto: (src, width, height) => set({
                    roomPhoto: { src, width, height }
                }),

                clearRoomPhoto: () => set({
                    roomPhoto: null,
                    scale: initialState.scale
                }),

                addReferencePhoto: (photo) => set(state => ({
                    referencePhotos: [...state.referencePhotos, photo]
                })),

                removeReferencePhoto: (id) => set(state => ({
                    referencePhotos: state.referencePhotos.filter(p => p.id !== id)
                })),

                // Simple Room Actions
                setSelectedWall: (wallId) => set(state => ({
                    room: { ...state.room, selectedWallId: wallId }
                })),

                setRoomInputType: (type) => set(state => ({
                    room: { ...state.room, inputType: type }
                })),

                addObstruction: (obs) => set(state => ({
                    room: { ...state.room, obstructions: [...state.room.obstructions, obs] }
                })),

                removeObstruction: (id) => set(state => ({
                    room: { ...state.room, obstructions: state.room.obstructions.filter(o => o.id !== id) }
                })),

                clearObstructions: () => set(state => ({
                    room: { ...state.room, obstructions: [] }
                })),

                // View Actions
                setCanvas3DViewEnabled: (enabled) => set({ canvas3DViewEnabled: enabled }),

                setFloorPlanEnabled: (enabled) => set({ floorPlanEnabled: enabled }),

                // Drawing Mode Actions
                setDrawMode: (enabled) => set({ drawMode: enabled }),

                setEditMode: (enabled) => set({ editMode: enabled }),

                setCaptureOnlyUnitId: (id) => set({ captureOnlyUnitId: id }),

                setUnitType: (type) => set({ unitType: type }),

                addCustomUnitType: (type) => set(state => ({
                    customUnitTypes: [...new Set([...state.customUnitTypes, type])]
                })),

                addCustomFloor: () => {
                    const state = get();
                    const currentFloorId = state.activeFloorId;
                    const currentKey = `${state.activeFloorId}_${state.activeRoomId}_${state.activeCanvasIndex}`;

                    // Get label for current floor
                    const baseFloor = FLOOR_OPTIONS.find(f => f.value === currentFloorId);
                    const baseLabel = baseFloor?.label || currentFloorId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

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
                    const newFloorLabel = `${baseLabel} ${count}`;

                    // Save current canvas's units
                    const updatedRoomUnits = {
                        ...state.roomUnits,
                        [currentKey]: [...state.drawnUnits]
                    };

                    // Create new canvas name for the new floor
                    const newKey = `${newFloorId}_${state.activeRoomId}_0`;
                    const unitTypeLabel = state.unitType
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase());
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
                    const baseRoom = ROOM_OPTIONS.find(r => r.value === currentRoomId);
                    const baseLabel = baseRoom?.label || currentRoomId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

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
                        .replace(/\b\w/g, c => c.toUpperCase());
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
                    const floors = FLOOR_OPTIONS.map(f => ({ value: f.value, label: f.label }));

                    // Add custom floors with generated labels
                    for (const customFloor of state.customFloors) {
                        // Parse the custom floor ID to get base and number
                        const match = customFloor.match(/^(.+)_(\d+)$/);
                        if (match) {
                            const baseId = match[1];
                            const num = match[2];
                            const baseFloor = FLOOR_OPTIONS.find(f => f.value === baseId);
                            const baseLabel = baseFloor?.label || baseId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                            floors.push({ value: customFloor, label: `${baseLabel} ${num}` });
                        }
                    }

                    return floors;
                },

                getAllRooms: () => {
                    const state = get();
                    // Combine standard rooms with custom rooms
                    const rooms = ROOM_OPTIONS.map(r => ({ value: r.value, label: r.label }));

                    // Add custom rooms with generated labels
                    for (const customRoom of state.customRooms) {
                        // Parse the custom room ID to get base and number
                        const match = customRoom.match(/^(.+)_(\d+)$/);
                        if (match) {
                            const baseId = match[1];
                            const num = match[2];
                            const baseRoom = ROOM_OPTIONS.find(r => r.value === baseId);
                            const baseLabel = baseRoom?.label || baseId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                            rooms.push({ value: customRoom, label: `${baseLabel} ${num}` });
                        }
                    }

                    return rooms;
                },

                // Scale Actions
                setScale: (scaleUpdate) => set(state => ({
                    scale: { ...state.scale, ...scaleUpdate }
                })),

                // Production Snapshots Actions
                setProductionCanvasSnapshots: (snapshots) => set({ productionCanvasSnapshots: snapshots }),

                // Shutter Layout Actions
                setShutterCount: (count) => set({ shutterCount: count }),

                setShutterDividerXs: (dividers) => set({ shutterDividerXs: dividers }),

                setLoftEnabled: (enabled) => {
                    const { wardrobeBox, loftShutterCount, activeUnitIndex, drawnUnits } = get();
                    const activeUnit = drawnUnits[activeUnitIndex];

                    if (enabled) {
                        // Create loft box when enabling
                        const box = activeUnit?.box || wardrobeBox;
                        if (box) {
                            const defaultHeight = box.height * 0.25;
                            const newLoft: LoftBox = {
                                x: box.x,
                                width: box.width,
                                y: box.y, // Loft at top of drawn area
                                height: defaultHeight,
                                rotation: 0,
                                dragEdge: null,
                                isDragging: false,
                                locked: false,
                            };
                            // Calculate initial loft dividers
                            const count = loftShutterCount || 3;
                            const dividers = count <= 1 ? [] : Array.from({ length: count - 1 }, (_, i) => {
                                return newLoft.x + (newLoft.width / count) * (i + 1);
                            });

                            // If there's an active unit, update it with loftBox
                            if (activeUnit) {
                                get().updateUnit(activeUnitIndex, {
                                    loftEnabled: true,
                                    loftBox: newLoft,
                                    loftDividerXs: dividers,
                                    loftHeightMm: 400, // Default loft height
                                });
                            }

                            set({ loftEnabled: true, loftBox: newLoft, loftDividerXs: dividers });
                        } else {
                            set({ loftEnabled: true });
                        }
                    } else {
                        // Remove loft box when disabled
                        if (activeUnit) {
                            get().updateUnit(activeUnitIndex, {
                                loftEnabled: false,
                                loftBox: undefined,
                                loftDividerXs: [],
                            });
                        }
                        set({ loftEnabled: false, loftBox: null, loftDividerXs: [] });
                    }
                },

                setLoftBox: (box) => set({ loftBox: box }),

                setLoftShutterCount: (count) => set({ loftShutterCount: count }),

                clearWardrobeBox: () => set({
                    wardrobeBox: null,
                    shutterCount: 2,
                    sectionCount: 1
                }),

                setWardrobeBox: (box) => {
                    set({ wardrobeBox: box });
                    get().computeAreas();
                },

                // Wardrobe Spec Actions
                setDepthMm: (depth) => {
                    const current = get().wardrobeSpec;
                    if (current) {
                        set({ wardrobeSpec: { ...current, depthMm: depth } });
                        get().computeAreas();
                    }
                },

                computeAreas: () => {
                    const { wardrobeBox, scale, wardrobeSpec } = get();
                    // Logic derived from legacy store
                    if (!wardrobeBox || !scale.factor || !wardrobeSpec) return;

                    const widthMm = wardrobeBox.width * scale.factor;
                    const heightMm = wardrobeBox.height * scale.factor;

                    // Simplified calculation for now - just total areas
                    const totalAreaSqft = (widthMm * heightMm) / 92903; // mm^2 to sqft (approx 92903)

                    set({
                        wardrobeSpec: {
                            ...wardrobeSpec,
                            carcassAreaSqft: parseFloat(totalAreaSqft.toFixed(2)),
                            shutterAreaSqft: parseFloat(totalAreaSqft.toFixed(2))
                        }
                    });
                },


                // History Actions (Undo/Redo)
                pushHistory: () => set(state => {
                    // Clone current drawnUnits to history
                    const newHistory = state.history.slice(0, state.historyIndex + 1);
                    newHistory.push(state.drawnUnits.map(u => ({ ...u })));

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
                        const restoredUnits = history[newIndex].map(u => ({ ...u }));
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
                        const restoredUnits = history[newIndex].map(u => ({ ...u }));
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

                // Multi-Room Actions
                // Note: getRoomKey returns base key without canvas index (for backwards compatibility)
                getRoomKey: (floorId: string, roomId: string) => `${floorId}_${roomId}`,

                // getFullRoomKey includes canvas index for unique storage key
                getFullRoomKey: () => {
                    const state = get();
                    return `${state.activeFloorId}_${state.activeRoomId}_${state.activeCanvasIndex}`;
                },

                switchRoom: (floorId: string, roomId: string) => {
                    const state = get();
                    const currentKey = `${state.activeFloorId}_${state.activeRoomId}_${state.activeCanvasIndex}`;
                    const newKey = `${floorId}_${roomId}_0`; // Start at canvas 0 for new room

                    // Don't switch if same room and canvas
                    if (currentKey === newKey) return;

                    // Save current canvas's units
                    const updatedRoomUnits = {
                        ...state.roomUnits,
                        [currentKey]: [...state.drawnUnits]
                    };

                    // Load new room's first canvas (empty array if not exists)
                    const newRoomUnits = updatedRoomUnits[newKey] || [];

                    set({
                        roomUnits: updatedRoomUnits,
                        activeFloorId: floorId,
                        activeRoomId: roomId,
                        activeCanvasIndex: 0, // Reset to first canvas
                        drawnUnits: newRoomUnits,
                        activeUnitIndex: newRoomUnits.length > 0 ? 0 : -1,
                        selectedUnitIndices: [],
                        // Clear drawing state
                        wardrobeBox: null,
                        loftBox: null,
                        drawMode: false,
                        // Reset history for new room
                        history: [],
                        historyIndex: -1,
                        // Clear room photo for new room (each room has its own photo)
                        roomPhoto: null,
                    });
                },

                getAllRoomUnits: () => {
                    const state = get();
                    const currentKey = `${state.activeFloorId}_${state.activeRoomId}_${state.activeCanvasIndex}`;
                    // Include current canvas's units in the result
                    return {
                        ...state.roomUnits,
                        [currentKey]: state.drawnUnits
                    };
                },

                clearCurrentRoom: () => {
                    set({
                        drawnUnits: [],
                        activeUnitIndex: -1,
                        selectedUnitIndices: [],
                        wardrobeBox: null,
                        loftBox: null,
                        roomPhoto: null,
                    });
                },

                // Multi-Canvas Actions (within same room)
                getCanvasCount: () => {
                    const state = get();
                    const baseKey = `${state.activeFloorId}_${state.activeRoomId}_`;
                    // Count keys that start with this room's base key
                    let count = 0;
                    for (const key of Object.keys(state.roomUnits)) {
                        if (key.startsWith(baseKey)) {
                            const index = parseInt(key.substring(baseKey.length), 10);
                            if (!isNaN(index)) {
                                count = Math.max(count, index + 1);
                            }
                        }
                    }
                    // Always at least 1 canvas (current one)
                    return Math.max(count, state.activeCanvasIndex + 1);
                },

                addNewCanvas: () => {
                    const state = get();
                    const currentKey = `${state.activeFloorId}_${state.activeRoomId}_${state.activeCanvasIndex}`;

                    // Save current canvas's units
                    const updatedRoomUnits = {
                        ...state.roomUnits,
                        [currentKey]: [...state.drawnUnits]
                    };

                    // Find next canvas index
                    const baseKey = `${state.activeFloorId}_${state.activeRoomId}_`;
                    let maxIndex = state.activeCanvasIndex;
                    for (const key of Object.keys(updatedRoomUnits)) {
                        if (key.startsWith(baseKey)) {
                            const index = parseInt(key.substring(baseKey.length), 10);
                            if (!isNaN(index)) {
                                maxIndex = Math.max(maxIndex, index);
                            }
                        }
                    }
                    const newCanvasIndex = maxIndex + 1;

                    // Generate canvas name based on unit type
                    // Format: "Unit Type N" where N is count of same type in this room
                    const unitTypeLabel = state.unitType
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase());

                    // Count existing canvases with same unit type in this room
                    let sameTypeCount = 0;
                    const allCanvasNames = { ...state.canvasNames };
                    for (const key of Object.keys(allCanvasNames)) {
                        if (key.startsWith(baseKey)) {
                            const name = allCanvasNames[key] || '';
                            // Check if name starts with the same unit type
                            if (name.toLowerCase().startsWith(unitTypeLabel.toLowerCase())) {
                                sameTypeCount++;
                            }
                        }
                    }
                    // Also check current canvas if it has units of this type
                    const currentCanvasName = allCanvasNames[currentKey] || '';
                    if (!currentCanvasName && state.drawnUnits.length > 0) {
                        // Current canvas has no name yet, set it based on first unit
                        const firstUnitType = state.drawnUnits[0]?.unitType || state.unitType;
                        const firstLabel = firstUnitType
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, c => c.toUpperCase());
                        allCanvasNames[currentKey] = `${firstLabel} 1`;
                        if (firstLabel.toLowerCase() === unitTypeLabel.toLowerCase()) {
                            sameTypeCount++;
                        }
                    }

                    const newCanvasName = `${unitTypeLabel} ${sameTypeCount + 1}`;
                    const newKey = `${state.activeFloorId}_${state.activeRoomId}_${newCanvasIndex}`;
                    allCanvasNames[newKey] = newCanvasName;

                    set({
                        roomUnits: updatedRoomUnits,
                        canvasNames: allCanvasNames,
                        activeCanvasIndex: newCanvasIndex,
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

                switchCanvas: (canvasIndex: number) => {
                    const state = get();
                    if (canvasIndex === state.activeCanvasIndex) return;

                    const currentKey = `${state.activeFloorId}_${state.activeRoomId}_${state.activeCanvasIndex}`;
                    const newKey = `${state.activeFloorId}_${state.activeRoomId}_${canvasIndex}`;

                    // Save current canvas's units
                    const updatedRoomUnits = {
                        ...state.roomUnits,
                        [currentKey]: [...state.drawnUnits]
                    };

                    // Load target canvas's units
                    const newCanvasUnits = updatedRoomUnits[newKey] || [];

                    set({
                        roomUnits: updatedRoomUnits,
                        activeCanvasIndex: canvasIndex,
                        drawnUnits: newCanvasUnits,
                        activeUnitIndex: newCanvasUnits.length > 0 ? 0 : -1,
                        selectedUnitIndices: [],
                        wardrobeBox: null,
                        loftBox: null,
                        drawMode: false,
                        history: [],
                        historyIndex: -1,
                        roomPhoto: null,
                    });
                },

                deleteCanvas: (canvasIndex: number) => {
                    const state = get();
                    const baseKey = `${state.activeFloorId}_${state.activeRoomId}_`;
                    const keyToDelete = `${baseKey}${canvasIndex}`;

                    // Get the units to delete (either from drawnUnits if current canvas, or from roomUnits)
                    const unitsToDelete = canvasIndex === state.activeCanvasIndex
                        ? [...state.drawnUnits]
                        : state.roomUnits[keyToDelete] || [];
                    const nameToDelete = state.canvasNames[keyToDelete] || `Canvas ${canvasIndex + 1}`;

                    // Save deleted canvas for undo
                    const lastDeletedCanvas = {
                        key: keyToDelete,
                        units: unitsToDelete,
                        name: nameToDelete,
                    };

                    // Collect all canvases for this room, sorted by index
                    const roomCanvases: { index: number; units: DrawnUnit[]; name: string }[] = [];

                    // First, save current canvas to roomUnits if needed
                    const allRoomUnits = {
                        ...state.roomUnits,
                        [`${baseKey}${state.activeCanvasIndex}`]: [...state.drawnUnits]
                    };

                    // Find all canvases for this room
                    for (const key of Object.keys(allRoomUnits)) {
                        if (key.startsWith(baseKey)) {
                            const idx = parseInt(key.substring(baseKey.length), 10);
                            if (!isNaN(idx) && idx !== canvasIndex) {
                                roomCanvases.push({
                                    index: idx,
                                    units: allRoomUnits[key] || [],
                                    name: state.canvasNames[key] || `Canvas ${idx + 1}`
                                });
                            }
                        }
                    }

                    // Sort by original index
                    roomCanvases.sort((a, b) => a.index - b.index);

                    // Rebuild roomUnits and canvasNames with sequential indices
                    const updatedRoomUnits = { ...state.roomUnits };
                    const updatedCanvasNames = { ...state.canvasNames };

                    // Remove all old keys for this room
                    for (const key of Object.keys(updatedRoomUnits)) {
                        if (key.startsWith(baseKey)) {
                            delete updatedRoomUnits[key];
                        }
                    }
                    for (const key of Object.keys(updatedCanvasNames)) {
                        if (key.startsWith(baseKey)) {
                            delete updatedCanvasNames[key];
                        }
                    }

                    // Re-add canvases with new sequential indices and update names
                    roomCanvases.forEach((canvas, newIndex) => {
                        const newKey = `${baseKey}${newIndex}`;
                        updatedRoomUnits[newKey] = canvas.units;

                        // Update the name to have correct number
                        // Parse the old name to get the unit type, then add new number
                        const nameMatch = canvas.name.match(/^(.+?)\s*\d*$/);
                        const unitTypePart = nameMatch ? nameMatch[1].trim() : canvas.name;
                        updatedCanvasNames[newKey] = `${unitTypePart} ${newIndex + 1}`;
                    });

                    // Determine new active canvas index
                    let newActiveIndex = 0;
                    if (canvasIndex === state.activeCanvasIndex) {
                        // Deleted current canvas, switch to 0
                        newActiveIndex = 0;
                    } else if (canvasIndex < state.activeCanvasIndex) {
                        // Deleted a canvas before current, adjust index
                        newActiveIndex = state.activeCanvasIndex - 1;
                    } else {
                        // Deleted a canvas after current, keep same index
                        newActiveIndex = state.activeCanvasIndex;
                    }

                    // Make sure newActiveIndex is valid
                    newActiveIndex = Math.min(newActiveIndex, roomCanvases.length - 1);
                    newActiveIndex = Math.max(newActiveIndex, 0);

                    const newKey = `${baseKey}${newActiveIndex}`;
                    const newCanvasUnits = updatedRoomUnits[newKey] || [];

                    set({
                        roomUnits: updatedRoomUnits,
                        canvasNames: updatedCanvasNames,
                        lastDeletedCanvas,
                        activeCanvasIndex: newActiveIndex,
                        drawnUnits: newCanvasUnits,
                        activeUnitIndex: newCanvasUnits.length > 0 ? 0 : -1,
                        selectedUnitIndices: [],
                        wardrobeBox: null,
                        loftBox: null,
                        drawMode: false,
                        history: [],
                        historyIndex: -1,
                        roomPhoto: null,
                    });
                },

                getCanvasName: (canvasIndex: number) => {
                    const state = get();
                    const key = `${state.activeFloorId}_${state.activeRoomId}_${canvasIndex}`;
                    const name = state.canvasNames[key];
                    if (name) return name;

                    // Default name based on first unit type in that canvas, or "Canvas N"
                    const units = canvasIndex === state.activeCanvasIndex
                        ? state.drawnUnits
                        : state.roomUnits[key] || [];

                    if (units.length > 0) {
                        const firstUnitType = units[0].unitType || 'wardrobe';
                        const label = firstUnitType
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, c => c.toUpperCase());
                        return `${label} ${canvasIndex + 1}`;
                    }

                    return `Canvas ${canvasIndex + 1}`;
                },

                getCanvasNames: () => {
                    const state = get();
                    const baseKey = `${state.activeFloorId}_${state.activeRoomId}_`;
                    const canvasCount = Math.max(
                        state.activeCanvasIndex + 1,
                        ...Object.keys(state.roomUnits)
                            .filter(k => k.startsWith(baseKey))
                            .map(k => parseInt(k.substring(baseKey.length), 10) + 1)
                            .filter(n => !isNaN(n)),
                        1
                    );

                    const result: { index: number; name: string }[] = [];
                    for (let i = 0; i < canvasCount; i++) {
                        const key = `${state.activeFloorId}_${state.activeRoomId}_${i}`;
                        let name = state.canvasNames[key];

                        if (!name) {
                            // Get name from first unit in canvas
                            const units = i === state.activeCanvasIndex
                                ? state.drawnUnits
                                : state.roomUnits[key] || [];

                            if (units.length > 0) {
                                const firstUnitType = units[0].unitType || 'wardrobe';
                                const label = firstUnitType
                                    .replace(/_/g, ' ')
                                    .replace(/\b\w/g, c => c.toUpperCase());
                                name = `${label} ${i + 1}`;
                            } else {
                                name = `Canvas ${i + 1}`;
                            }
                        }

                        result.push({ index: i, name });
                    }

                    return result;
                },

                reset: () => set({ ...initialState, floorPlan: floorPlanSlice.floorPlan }),
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
