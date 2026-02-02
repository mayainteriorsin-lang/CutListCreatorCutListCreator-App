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

/**
 * Design Canvas Store (v2)
 * 
 * Manages drawing state and canvas interactions only.
 * Replaces the drawing/canvas portion of visualQuotationStore.
 */

export interface DesignCanvasState extends FloorPlanSlice, Models3DSlice {
    // Drawing State - Units
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

    // Actions - Scale
    setScale: (scale: Partial<ScaleState>) => void;

    // Actions - Production Snapshots
    setProductionCanvasSnapshots: (snapshots: Map<string, string>) => void;

    // Actions - Shutter Layout
    setShutterCount: (count: number) => void;
    setLoftShutterCount: (count: number) => void;
    setShutterDividerXs: (dividers: number[]) => void;
    setLoftEnabled: (enabled: boolean) => void;
    clearWardrobeBox: () => void;
    setWardrobeBox: (box: WardrobeBox | null) => void;

    reset: () => void;
}

const initialState = {
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

                deleteUnit: (index) => set(state => ({
                    drawnUnits: state.drawnUnits.filter((_, i) => i !== index),
                    activeUnitIndex: Math.max(0, state.activeUnitIndex - 1)
                })),

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
                    if (index < 0 || index >= state.drawnUnits.length) return {};
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

                    return {
                        drawnUnits: [...state.drawnUnits, newUnit],
                        activeUnitIndex: state.drawnUnits.length,
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

                // Scale Actions
                setScale: (scaleUpdate) => set(state => ({
                    scale: { ...state.scale, ...scaleUpdate }
                })),

                // Production Snapshots Actions
                setProductionCanvasSnapshots: (snapshots) => set({ productionCanvasSnapshots: snapshots }),

                // Shutter Layout Actions
                setShutterCount: (count) => set({ shutterCount: count }),

                setShutterDividerXs: (dividers) => set({ shutterDividerXs: dividers }),

                setLoftEnabled: (enabled) => set({ loftEnabled: enabled }),

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


                reset: () => set({ ...initialState, floorPlan: floorPlanSlice.floorPlan }),
            };
        },
        {
            name: 'design-canvas-storage-v2',
            version: 1,
        }
    )
);
