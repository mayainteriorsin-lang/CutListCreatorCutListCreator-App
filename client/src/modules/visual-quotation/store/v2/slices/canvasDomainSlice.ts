/**
 * Canvas Domain Slice
 *
 * Zustand slice for core drawing domain state and actions:
 * - Multi-room project state (roomUnits, canvasNames, active floor/room/canvas)
 * - Drawing state (drawnUnits, activeUnitIndex, selections)
 * - Wardrobe box / loft box
 * - Room photo / reference photos
 * - Simple room input (walls, obstructions)
 * - Scale calibration
 * - Shutter layout
 * - Wardrobe specification
 * - Multi-room switching and multi-canvas management
 *
 * Extracted from useDesignCanvasStore.ts to reduce God-store complexity.
 */

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
} from '../../../types';

/* ========================= Initial State ========================= */

export const initialCanvasDomainState = {
    // Multi-Room Project
    roomUnits: {} as Record<string, DrawnUnit[]>,
    canvasNames: {} as Record<string, string>,
    activeFloorId: "ground",
    activeRoomId: "master_bedroom",
    activeCanvasIndex: 0,

    // Drawing State - Units
    activeUnitIndex: -1,
    selectedUnitIndices: [] as number[],
    activeEditPart: "shutter" as const,
    addOnDrawMode: null as WardrobeAddOn | null,
    drawnUnits: [] as DrawnUnit[],

    // Drawing State - Current Box
    wardrobeBox: null as WardrobeBox | null,
    loftBox: null as LoftBox | null,

    // Wardrobe Spec
    wardrobeSpec: {
        depthMm: 600,
        carcassAreaSqft: 0,
        shutterAreaSqft: 0
    } as WardrobeSpec | null,

    // Room Photo
    roomPhoto: null as RoomPhoto | null,
    referencePhotos: [] as ReferencePhoto[],
    activePhotoId: null as string | null,

    // Simple Room Input
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

    // Scale Calibration
    scale: {
        pixelsPerMm: 1,
        calibrated: false,
        lineStart: null,
        lineEnd: null,
        realWorldMm: 0,
        px: 0,
        mm: 0,
        ratio: 0,
        factor: 1,
    } as ScaleState,

    // Shutter Layout
    shutterCount: 3,
    sectionCount: 1,
    shutterDividerXs: [] as number[],
    loftEnabled: false,
    loftHeightRatio: 0.17,
    loftShutterCount: 2,
    loftDividerXs: [] as number[],
    loftDividerYs: [] as number[],
};

/* ========================= Slice State Shape ========================= */

export interface CanvasDomainSliceState {
    roomUnits: Record<string, DrawnUnit[]>;
    canvasNames: Record<string, string>;
    activeFloorId: string;
    activeRoomId: string;
    activeCanvasIndex: number;

    drawnUnits: DrawnUnit[];
    activeUnitIndex: number;
    selectedUnitIndices: number[];
    activeEditPart: "shutter" | "loft";
    addOnDrawMode: WardrobeAddOn | null;

    wardrobeBox: WardrobeBox | null;
    loftBox: LoftBox | null;

    wardrobeSpec: WardrobeSpec | null;

    roomPhoto: RoomPhoto | null;
    referencePhotos: ReferencePhoto[];
    activePhotoId: string | null;

    room: RoomState;

    scale: ScaleState;

    shutterCount: number;
    sectionCount: number;
    shutterDividerXs: number[];
    loftEnabled: boolean;
    loftHeightRatio: number;
    loftShutterCount: number;
    loftDividerXs: number[];
    loftDividerYs: number[];
}

export interface CanvasDomainActions {
    // Wardrobe Spec
    setDepthMm: (depth: number) => void;
    computeAreas: () => void;

    // Units (Basic)
    addUnit: (unit: DrawnUnit) => void;
    updateUnit: (index: number, unit: Partial<DrawnUnit>) => void;
    deleteUnit: (index: number) => void;
    deleteDrawnUnit: (index: number) => void;
    updateActiveDrawnUnit: (patch: Partial<DrawnUnit>) => void;
    updateDrawnUnitById: (id: string, patch: Partial<DrawnUnit>) => void;

    // Unit Manipulation (Advanced)
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

    // Add-ons
    setAddOnDrawMode: (addOnType: WardrobeAddOn | null) => void;
    addDrawnAddOn: (addOn: Omit<DrawnAddOn, "id">) => void;
    removeDrawnAddOn: (addOnId: string) => void;
    updateDrawnAddOn: (addOnId: string, patch: Partial<DrawnAddOn>) => void;

    // Photos
    setRoomPhoto: (src: string, width: number, height: number) => void;
    clearRoomPhoto: () => void;
    addReferencePhoto: (photo: ReferencePhoto) => void;
    removeReferencePhoto: (id: string) => void;

    // Simple Room
    setSelectedWall: (wallId: WallId) => void;
    setRoomInputType: (type: RoomInputType) => void;
    addObstruction: (obs: Obstruction) => void;
    removeObstruction: (id: string) => void;
    clearObstructions: () => void;

    // Scale
    setScale: (scale: Partial<ScaleState>) => void;

    // Shutter Layout
    setShutterCount: (count: number) => void;
    setLoftShutterCount: (count: number) => void;
    setShutterDividerXs: (dividers: number[]) => void;
    setLoftEnabled: (enabled: boolean) => void;
    setLoftBox: (box: LoftBox | null) => void;
    clearWardrobeBox: () => void;
    setWardrobeBox: (box: WardrobeBox | null) => void;

    // Multi-Room
    switchRoom: (floorId: string, roomId: string) => void;
    getRoomKey: (floorId: string, roomId: string) => string;
    getAllRoomUnits: () => Record<string, DrawnUnit[]>;
    clearCurrentRoom: () => void;

    // Multi-Canvas
    addNewCanvas: () => void;
    switchCanvas: (canvasIndex: number) => void;
    getCanvasCount: () => number;
    deleteCanvas: (canvasIndex: number) => void;
    getFullRoomKey: () => string;
    getCanvasName: (canvasIndex: number) => string;
    getCanvasNames: () => { index: number; name: string }[];
}

export type CanvasDomainSlice = CanvasDomainSliceState & CanvasDomainActions;

/* ========================= Slice Creator ========================= */

/**
 * Creates the Canvas Domain slice.
 *
 * Uses get()/set() to access full store state since domain actions
 * interact with history (pushHistory) and UI state (drawMode).
 */
export const createCanvasDomainSlice = (
    set: Function,
    get: Function,
) => ({
    ...initialCanvasDomainState,

    // Unit Actions
    addUnit: (unit: DrawnUnit) => set((state: any) => ({
        drawnUnits: [...state.drawnUnits, unit]
    })),

    updateUnit: (index: number, updates: Partial<DrawnUnit>) => set((state: any) => ({
        drawnUnits: state.drawnUnits.map((u: DrawnUnit, i: number) =>
            i === index ? { ...u, ...updates } : u
        )
    })),

    deleteUnit: (index: number) => {
        // Push current state to history before deletion
        get().pushHistory();
        set((state: any) => ({
            drawnUnits: state.drawnUnits.filter((_: DrawnUnit, i: number) => i !== index),
            activeUnitIndex: state.drawnUnits.length > 1 ? Math.min(state.activeUnitIndex, state.drawnUnits.length - 2) : -1
        }));
    },

    deleteDrawnUnit: (index: number) => get().deleteUnit(index),

    updateActiveDrawnUnit: (patch: Partial<DrawnUnit>) => {
        const { activeUnitIndex, drawnUnits } = get();
        if (drawnUnits[activeUnitIndex]) {
            get().updateUnit(activeUnitIndex, patch);
        }
    },

    updateDrawnUnitById: (startId: string, patch: Partial<DrawnUnit>) => {
        set((state: any) => ({
            drawnUnits: state.drawnUnits.map((u: DrawnUnit) => u.id === startId ? { ...u, ...patch } : u)
        }));
    },

    setActiveUnitIndex: (index: number) => set((state: any) => {
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

    saveCurrentUnitAndAddNew: () => set((state: any) => {
        if (!state.wardrobeBox) return {};

        const sections = state.sectionCount || 1;
        const boxH = state.wardrobeBox.height;
        const boxY = state.wardrobeBox.y;
        const hDividers = sections > 1
            ? Array.from({ length: sections - 1 }, (_: any, i: number) => boxY + (boxH / sections) * (i + 1))
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

    selectAllUnits: () => set((state: any) => ({
        selectedUnitIndices: state.drawnUnits.map((_: DrawnUnit, i: number) => i),
        activeUnitIndex: 0
    })),

    clearUnitSelection: () => set({ selectedUnitIndices: [], activeUnitIndex: -1 }),

    setSelectedUnitIndices: (indices: number[]) => set((state: any) => {
        const valid = indices.filter((i: number) => i >= 0 && i < state.drawnUnits.length);
        return {
            selectedUnitIndices: valid,
            activeUnitIndex: valid.length > 0 ? valid[0] : -1
        };
    }),

    deleteSelectedUnits: () => set((state: any) => {
        if (state.selectedUnitIndices.length === 0) return {};
        const newUnits = state.drawnUnits.filter((_: DrawnUnit, i: number) => !state.selectedUnitIndices.includes(i));
        return {
            drawnUnits: newUnits,
            selectedUnitIndices: [],
            activeUnitIndex: newUnits.length > 0 ? 0 : -1,
            wardrobeBox: null, // Clear drawing state if deleted
            loftBox: undefined
        };
    }),

    nudgeDrawnUnit: (index: number, dx: number, dy: number) => set((state: any) => {
        if (!state.drawnUnits[index]) return {};
        const units = [...state.drawnUnits];
        const u = units[index];
        const newBox = { ...u.box, x: u.box.x + dx, y: u.box.y + dy };
        const newLoft = u.loftBox ? { ...u.loftBox, x: u.loftBox.x + dx, y: u.loftBox.y + dy } : undefined;
        units[index] = { ...u, box: newBox, loftBox: newLoft };
        return { drawnUnits: units };
    }),

    removeLoftFromUnit: (index: number) => set((state: any) => {
        if (!state.drawnUnits[index]) return {};
        const units = [...state.drawnUnits];
        units[index] = { ...units[index], loftEnabled: false, loftBox: undefined };
        return { drawnUnits: units };
    }),

    setUnitShelfCount: (index: number, count: number) => set((state: any) => {
        const units = [...state.drawnUnits];
        if (units[index]) {
            units[index] = { ...units[index], shelfCount: count };
        }
        return { drawnUnits: units };
    }),

    setActiveEditPart: (part: "shutter" | "loft") => set({ activeEditPart: part }),

    setAddOnDrawMode: (addOnType: WardrobeAddOn | null) => set({ addOnDrawMode: addOnType, drawMode: !!addOnType }),

    addDrawnAddOn: (addOn: Omit<DrawnAddOn, "id">) => set((state: any) => {
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

    removeDrawnAddOn: (id: string) => set((state: any) => {
        if (state.activeUnitIndex < 0 || !state.drawnUnits[state.activeUnitIndex]) return {};
        const units = [...state.drawnUnits];
        const active = units[state.activeUnitIndex];
        units[state.activeUnitIndex] = {
            ...active,
            drawnAddOns: (active.drawnAddOns || []).filter((a: DrawnAddOn) => a.id !== id)
        };
        return { drawnUnits: units };
    }),

    updateDrawnAddOn: (id: string, patch: Partial<DrawnAddOn>) => set((state: any) => {
        if (state.activeUnitIndex < 0 || !state.drawnUnits[state.activeUnitIndex]) return {};
        const units = [...state.drawnUnits];
        const active = units[state.activeUnitIndex];
        units[state.activeUnitIndex] = {
            ...active,
            drawnAddOns: (active.drawnAddOns || []).map((a: DrawnAddOn) => a.id === id ? { ...a, ...patch } : a)
        };
        return { drawnUnits: units };
    }),

    // Photo Actions
    setRoomPhoto: (src: string, width: number, height: number) => set({
        roomPhoto: { src, width, height }
    }),

    clearRoomPhoto: () => set({
        roomPhoto: null,
        scale: initialCanvasDomainState.scale
    }),

    addReferencePhoto: (photo: ReferencePhoto) => set((state: any) => ({
        referencePhotos: [...state.referencePhotos, photo]
    })),

    removeReferencePhoto: (id: string) => set((state: any) => ({
        referencePhotos: state.referencePhotos.filter((p: ReferencePhoto) => p.id !== id)
    })),

    // Simple Room Actions
    setSelectedWall: (wallId: WallId) => set((state: any) => ({
        room: { ...state.room, selectedWallId: wallId }
    })),

    setRoomInputType: (type: RoomInputType) => set((state: any) => ({
        room: { ...state.room, inputType: type }
    })),

    addObstruction: (obs: Obstruction) => set((state: any) => ({
        room: { ...state.room, obstructions: [...state.room.obstructions, obs] }
    })),

    removeObstruction: (id: string) => set((state: any) => ({
        room: { ...state.room, obstructions: state.room.obstructions.filter((o: Obstruction) => o.id !== id) }
    })),

    clearObstructions: () => set((state: any) => ({
        room: { ...state.room, obstructions: [] }
    })),

    // Scale Actions
    setScale: (scaleUpdate: Partial<ScaleState>) => set((state: any) => ({
        scale: { ...state.scale, ...scaleUpdate }
    })),

    // Shutter Layout Actions
    setShutterCount: (count: number) => set({ shutterCount: count }),

    setShutterDividerXs: (dividers: number[]) => set({ shutterDividerXs: dividers }),

    setLoftEnabled: (enabled: boolean) => {
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
                const dividers = count <= 1 ? [] : Array.from({ length: count - 1 }, (_: any, i: number) => {
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

    setLoftBox: (box: LoftBox | null) => set({ loftBox: box }),

    setLoftShutterCount: (count: number) => set({ loftShutterCount: count }),

    clearWardrobeBox: () => set({
        wardrobeBox: null,
        shutterCount: 2,
        sectionCount: 1
    }),

    setWardrobeBox: (box: WardrobeBox | null) => {
        set({ wardrobeBox: box });
        get().computeAreas();
    },

    // Wardrobe Spec Actions
    setDepthMm: (depth: number) => {
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

    // Multi-Room Actions
    getRoomKey: (floorId: string, roomId: string) => `${floorId}_${roomId}`,

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
            .replace(/\b\w/g, (c: string) => c.toUpperCase());

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
                .replace(/\b\w/g, (c: string) => c.toUpperCase());
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
            const unitTypePart = nameMatch?.[1] ? nameMatch[1].trim() : canvas.name;
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
                .replace(/\b\w/g, (c: string) => c.toUpperCase());
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
                .filter((k: string) => k.startsWith(baseKey))
                .map((k: string) => parseInt(k.substring(baseKey.length), 10) + 1)
                .filter((n: number) => !isNaN(n)),
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
                        .replace(/\b\w/g, (c: string) => c.toUpperCase());
                    name = `${label} ${i + 1}`;
                } else {
                    name = `Canvas ${i + 1}`;
                }
            }

            result.push({ index: i, name });
        }

        return result;
    },
});
