/**
 * Floor Plan State Slice
 *
 * Zustand slice for Floor Plan state and actions.
 * Extracted verbatim from visualQuotationStore.ts.
 */

import type { StateCreator } from "zustand";
import type {
  FloorPlanState,
  FloorPlanDrawMode,
  FloorPlanWall,
  FloorPlanRoom,
  FloorPlanFloor,
  FloorPlanAppliance,
  FloorPlanHistorySnapshot,
  KitchenConfig,
  KitchenRun,
  KitchenZone,
  KitchenUnitBox,
  WallOpening,
  ApplianceType,
  SnapObjectsSettings,
} from "./types";

/* ========================= UID Helper ========================= */

function uid(prefix: string): string {
  // good enough for client-side IDs
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

/* ========================= Initial State ========================= */

export const initialFloorPlanState: FloorPlanState = {
  enabled: false,
  drawMode: "none",
  walls: [],
  rooms: [],
  floors: [],
  appliances: [],
  kitchenConfig: null,
  selectedWallId: null,
  selectedWallIds: [],
  selectedRoomId: null,
  selectedFloorId: null,
  selectedFloorIds: [],
  selectedApplianceId: null,
  placingApplianceType: null,
  gridSize: 20, // 20px grid
  showGrid: true,
  showDimensions: true, // Show wall dimensions by default
  showWorkTriangle: true, // Show kitchen work triangle
  scaleMmPerPx: 10, // Default: 10mm per pixel (1px = 1cm)
  history: [],
  historyIndex: -1,
};

/* ========================= Action Types ========================= */

export interface FloorPlanActions {
  // Floor plan actions
  setFloorPlanEnabled: (enabled: boolean) => void;
  setFloorPlanDrawMode: (mode: FloorPlanDrawMode) => void;
  addFloorPlanWall: (wall: Omit<FloorPlanWall, "id">) => void;
  updateFloorPlanWall: (wallId: string, patch: Partial<FloorPlanWall>) => void;
  deleteFloorPlanWall: (wallId: string) => void;
  setSelectedFloorPlanWall: (wallId: string | null) => void;
  selectAllFloorPlanItems: () => void;
  deselectAllFloorPlanItems: () => void;
  addFloorPlanRoom: (room: Omit<FloorPlanRoom, "id">) => void;
  updateFloorPlanRoom: (roomId: string, patch: Partial<FloorPlanRoom>) => void;
  deleteFloorPlanRoom: (roomId: string) => void;
  addFloorPlanFloor: (floor: Omit<FloorPlanFloor, "id">) => void;
  updateFloorPlanFloor: (floorId: string, patch: Partial<FloorPlanFloor>) => void;
  deleteFloorPlanFloor: (floorId: string) => void;
  duplicateFloorPlanFloor: (floorId: string) => void;
  toggleFloorLock: (floorId: string) => void;
  setSelectedFloorPlanFloor: (floorId: string | null) => void;
  setKitchenConfig: (config: KitchenConfig | null) => void;
  updateKitchenConfig: (patch: Partial<KitchenConfig>) => void;
  addKitchenRun: (unitType: "base" | "wall" | "tall", run: Omit<KitchenRun, "id">) => void;
  addKitchenZone: (zone: Omit<KitchenZone, "id">) => void;
  setFloorPlanScale: (mmPerPx: number) => void;
  toggleFloorPlanGrid: () => void;
  toggleFloorPlanDimensions: () => void;
  toggleWorkTriangle: () => void;
  // Appliance actions
  addFloorPlanAppliance: (appliance: Omit<FloorPlanAppliance, "id">) => void;
  updateFloorPlanAppliance: (applianceId: string, patch: Partial<FloorPlanAppliance>) => void;
  deleteFloorPlanAppliance: (applianceId: string) => void;
  setSelectedAppliance: (applianceId: string | null) => void;
  setPlacingApplianceType: (type: ApplianceType | null) => void;
  // Wall opening actions
  addWallOpening: (wallId: string, opening: Omit<WallOpening, "id">) => void;
  updateWallOpening: (wallId: string, openingId: string, patch: Partial<WallOpening>) => void;
  deleteWallOpening: (wallId: string, openingId: string) => void;
  clearFloorPlan: () => void;
  // Floor plan undo/redo
  floorPlanUndo: () => void;
  floorPlanRedo: () => void;
  pushFloorPlanHistory: () => void;
  // Snap settings
  setSnapToGrid: (enabled: boolean, gridSizeMm: number) => void;
  setSnapToObjects: (settings: SnapObjectsSettings) => void;
}

/* ========================= Slice State Shape ========================= */

export interface FloorPlanSliceState {
  floorPlan: FloorPlanState;
}

export type FloorPlanSlice = FloorPlanSliceState & FloorPlanActions;

/* ========================= Slice Creator ========================= */

/**
 * Creates the Floor Plan slice.
 *
 * @param addAudit - Function to add audit entries (injected from root store)
 */
export const createFloorPlanSlice = (
  addAudit: (action: string, detail?: string) => void
): StateCreator<FloorPlanSlice, [], [], FloorPlanSlice> => (set, get) => ({
  // Initial state
  floorPlan: initialFloorPlanState,

  /* --------- Floor Plan Actions ---------- */
  setFloorPlanEnabled: (enabled) => {
    set((s) => ({
      floorPlan: { ...s.floorPlan, enabled },
    }));
    addAudit("Floor plan mode", enabled ? "enabled" : "disabled");
  },

  setFloorPlanDrawMode: (mode) => {
    set((s) => ({
      floorPlan: { ...s.floorPlan, drawMode: mode },
    }));
  },

  addFloorPlanWall: (wall) => {
    get().pushFloorPlanHistory();
    const newWall: FloorPlanWall = {
      ...wall,
      id: uid("WALL"),
      openings: wall.openings || [], // Initialize empty openings array
    };
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        walls: [...s.floorPlan.walls, newWall],
      },
    }));
    addAudit("Wall added", `${newWall.lengthMm}mm`);
  },

  updateFloorPlanWall: (wallId, patch) => {
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        walls: s.floorPlan.walls.map((w) =>
          w.id === wallId ? { ...w, ...patch } : w
        ),
      },
    }));
  },

  deleteFloorPlanWall: (wallId) => {
    get().pushFloorPlanHistory();
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        walls: s.floorPlan.walls.filter((w) => w.id !== wallId),
        selectedWallId: s.floorPlan.selectedWallId === wallId ? null : s.floorPlan.selectedWallId,
      },
    }));
    addAudit("Wall deleted", wallId);
  },

  setSelectedFloorPlanWall: (wallId) => {
    set((s) => ({
      floorPlan: { ...s.floorPlan, selectedWallId: wallId },
    }));
  },

  selectAllFloorPlanItems: () => {
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        selectedWallIds: s.floorPlan.walls.map((w) => w.id),
        selectedFloorIds: s.floorPlan.floors.map((f) => f.id),
        // Also set single selection to first item if exists
        selectedWallId: s.floorPlan.walls[0]?.id || null,
        selectedFloorId: s.floorPlan.floors[0]?.id || null,
      },
    }));
  },

  deselectAllFloorPlanItems: () => {
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        selectedWallId: null,
        selectedWallIds: [],
        selectedFloorId: null,
        selectedFloorIds: [],
        selectedApplianceId: null,
      },
    }));
  },

  addFloorPlanRoom: (room) => {
    const newRoom: FloorPlanRoom = {
      ...room,
      id: uid("FPROOM"),
    };
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        rooms: [...s.floorPlan.rooms, newRoom],
      },
    }));
    addAudit("Floor plan room added", newRoom.name);
  },

  updateFloorPlanRoom: (roomId, patch) => {
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        rooms: s.floorPlan.rooms.map((r) =>
          r.id === roomId ? { ...r, ...patch } : r
        ),
      },
    }));
  },

  deleteFloorPlanRoom: (roomId) => {
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        rooms: s.floorPlan.rooms.filter((r) => r.id !== roomId),
        selectedRoomId: s.floorPlan.selectedRoomId === roomId ? null : s.floorPlan.selectedRoomId,
      },
    }));
    addAudit("Floor plan room deleted", roomId);
  },

  addFloorPlanFloor: (floor) => {
    get().pushFloorPlanHistory();
    const newFloor: FloorPlanFloor = {
      ...floor,
      id: uid("FLOOR"),
      // Set defaults for new properties if not provided
      locked: floor.locked ?? false,
      notes: floor.notes ?? "",
      shapeType: floor.shapeType ?? "rectangle",
    };
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        floors: [...s.floorPlan.floors, newFloor],
        selectedFloorId: newFloor.id,
      },
    }));
    addAudit("Floor added", newFloor.label);
  },

  updateFloorPlanFloor: (floorId, patch) => {
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        floors: s.floorPlan.floors.map((f) =>
          f.id === floorId ? { ...f, ...patch } : f
        ),
      },
    }));
  },

  deleteFloorPlanFloor: (floorId) => {
    get().pushFloorPlanHistory();
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        floors: s.floorPlan.floors.filter((f) => f.id !== floorId),
        selectedFloorId: s.floorPlan.selectedFloorId === floorId ? null : s.floorPlan.selectedFloorId,
      },
    }));
    addAudit("Floor deleted", floorId);
  },

  duplicateFloorPlanFloor: (floorId) => {
    get().pushFloorPlanHistory();
    const state = get();
    const floor = state.floorPlan.floors.find((f) => f.id === floorId);
    if (!floor) return;

    const newFloor: FloorPlanFloor = {
      ...floor,
      id: uid("FLOOR"),
      x: floor.x + 30, // Offset so it's visible
      y: floor.y + 30,
      label: `${floor.label} (Copy)`,
      locked: false, // Duplicated floor is unlocked
    };

    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        floors: [...s.floorPlan.floors, newFloor],
        selectedFloorId: newFloor.id,
      },
    }));
    addAudit("Floor duplicated", floor.label);
  },

  toggleFloorLock: (floorId) => {
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        floors: s.floorPlan.floors.map((f) =>
          f.id === floorId ? { ...f, locked: !f.locked } : f
        ),
      },
    }));
  },

  setSelectedFloorPlanFloor: (floorId) => {
    set((s) => ({
      floorPlan: { ...s.floorPlan, selectedFloorId: floorId },
    }));
  },

  setKitchenConfig: (config) => {
    set((s) => ({
      floorPlan: { ...s.floorPlan, kitchenConfig: config },
    }));
    addAudit("Kitchen config set", config?.layoutType || "cleared");
  },

  updateKitchenConfig: (patch) => {
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        kitchenConfig: s.floorPlan.kitchenConfig
          ? { ...s.floorPlan.kitchenConfig, ...patch }
          : null,
      },
    }));
  },

  addKitchenRun: (unitType, run) => {
    const newRun: KitchenRun = {
      ...run,
      id: uid("KRUN"),
    };
    set((s) => {
      if (!s.floorPlan.kitchenConfig) return s;

      const config = { ...s.floorPlan.kitchenConfig };
      const targetUnit = config[`${unitType}Unit`];

      if (targetUnit) {
        const updatedUnit = {
          ...targetUnit,
          runs: [...targetUnit.runs, newRun],
          totalRunningFeet: targetUnit.totalRunningFeet + run.lengthFt,
        };
        config[`${unitType}Unit`] = updatedUnit;
      } else {
        // Create new unit box
        const newUnitBox: KitchenUnitBox = {
          id: uid("KUNIT"),
          unitType,
          layoutType: config.layoutType,
          runs: [newRun],
          zones: [],
          totalRunningFeet: run.lengthFt,
        };
        config[`${unitType}Unit`] = newUnitBox;
      }

      return {
        floorPlan: { ...s.floorPlan, kitchenConfig: config },
      };
    });
    addAudit("Kitchen run added", `${unitType} - ${run.lengthFt}ft`);
  },

  addKitchenZone: (zone) => {
    const newZone: KitchenZone = {
      ...zone,
      id: uid("KZONE"),
    };
    set((s) => {
      if (!s.floorPlan.kitchenConfig) return s;

      // Find which unit box the zone belongs to based on runId
      const config = { ...s.floorPlan.kitchenConfig };
      const unitTypes = ["base", "wall", "tall"] as const;

      for (const unitType of unitTypes) {
        const unit = config[`${unitType}Unit`];
        if (unit && unit.runs.some((r) => r.id === zone.runId)) {
          const updatedUnit = {
            ...unit,
            zones: [...unit.zones, newZone],
          };
          config[`${unitType}Unit`] = updatedUnit;
          break;
        }
      }

      return {
        floorPlan: { ...s.floorPlan, kitchenConfig: config },
      };
    });
    addAudit("Kitchen zone added", zone.type);
  },

  setFloorPlanScale: (mmPerPx) => {
    set((s) => ({
      floorPlan: { ...s.floorPlan, scaleMmPerPx: mmPerPx },
    }));
    addAudit("Floor plan scale set", `${mmPerPx} mm/px`);
  },

  toggleFloorPlanGrid: () => {
    set((s) => ({
      floorPlan: { ...s.floorPlan, showGrid: !s.floorPlan.showGrid },
    }));
  },

  toggleFloorPlanDimensions: () => {
    set((s) => ({
      floorPlan: { ...s.floorPlan, showDimensions: !s.floorPlan.showDimensions },
    }));
  },

  toggleWorkTriangle: () => {
    set((s) => ({
      floorPlan: { ...s.floorPlan, showWorkTriangle: !s.floorPlan.showWorkTriangle },
    }));
  },

  addFloorPlanAppliance: (appliance) => {
    get().pushFloorPlanHistory();
    const newAppliance: FloorPlanAppliance = {
      ...appliance,
      id: uid("APPL"),
    };
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        appliances: [...s.floorPlan.appliances, newAppliance],
        selectedApplianceId: newAppliance.id,
        placingApplianceType: null,
      },
    }));
    addAudit("Appliance added", appliance.type);
  },

  updateFloorPlanAppliance: (applianceId, patch) => {
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        appliances: s.floorPlan.appliances.map((a) =>
          a.id === applianceId ? { ...a, ...patch } : a
        ),
      },
    }));
  },

  deleteFloorPlanAppliance: (applianceId) => {
    get().pushFloorPlanHistory();
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        appliances: s.floorPlan.appliances.filter((a) => a.id !== applianceId),
        selectedApplianceId: s.floorPlan.selectedApplianceId === applianceId ? null : s.floorPlan.selectedApplianceId,
      },
    }));
    addAudit("Appliance deleted", applianceId);
  },

  setSelectedAppliance: (applianceId) => {
    set((s) => ({
      floorPlan: { ...s.floorPlan, selectedApplianceId: applianceId },
    }));
  },

  setPlacingApplianceType: (type) => {
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        placingApplianceType: type,
        drawMode: type ? "appliance" : s.floorPlan.drawMode,
      },
    }));
  },

  addWallOpening: (wallId, opening) => {
    const newOpening: WallOpening = {
      ...opening,
      id: uid("OPEN"),
    };
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        walls: s.floorPlan.walls.map((w) =>
          w.id === wallId
            ? { ...w, openings: [...w.openings, newOpening] }
            : w
        ),
      },
    }));
    addAudit("Wall opening added", opening.type);
  },

  updateWallOpening: (wallId, openingId, patch) => {
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        walls: s.floorPlan.walls.map((w) =>
          w.id === wallId
            ? {
                ...w,
                openings: w.openings.map((o) =>
                  o.id === openingId ? { ...o, ...patch } : o
                ),
              }
            : w
        ),
      },
    }));
  },

  deleteWallOpening: (wallId, openingId) => {
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        walls: s.floorPlan.walls.map((w) =>
          w.id === wallId
            ? { ...w, openings: w.openings.filter((o) => o.id !== openingId) }
            : w
        ),
      },
    }));
    addAudit("Wall opening deleted", openingId);
  },

  clearFloorPlan: () => {
    // Push current state to history before clearing
    get().pushFloorPlanHistory();
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        walls: [],
        rooms: [],
        floors: [],
        appliances: [],
        kitchenConfig: null,
        selectedWallId: null,
        selectedWallIds: [],
        selectedRoomId: null,
        selectedFloorId: null,
        selectedFloorIds: [],
        selectedApplianceId: null,
        placingApplianceType: null,
      },
    }));
    addAudit("Floor plan cleared");
  },

  // Push current floor plan state to history (call before making changes)
  pushFloorPlanHistory: () => {
    set((s) => {
      const { walls, floors, appliances, kitchenConfig, history, historyIndex } = s.floorPlan;

      // Create snapshot of current state
      const snapshot: FloorPlanHistorySnapshot = {
        walls: JSON.parse(JSON.stringify(walls)),
        floors: JSON.parse(JSON.stringify(floors)),
        appliances: JSON.parse(JSON.stringify(appliances)),
        kitchenConfig: kitchenConfig ? JSON.parse(JSON.stringify(kitchenConfig)) : null,
      };

      // Remove any redo states (everything after current index)
      const newHistory = history.slice(0, historyIndex + 1);

      // Add new snapshot, limit to 50 history items
      newHistory.push(snapshot);
      if (newHistory.length > 50) {
        newHistory.shift();
      }

      return {
        floorPlan: {
          ...s.floorPlan,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        },
      };
    });
  },

  // Undo floor plan action
  floorPlanUndo: () => {
    set((s) => {
      const { history, historyIndex } = s.floorPlan;

      // Can't undo if no history or already at beginning
      if (history.length === 0 || historyIndex < 0) {
        return s;
      }

      // If at the end and have changes, save current state first
      if (historyIndex === history.length - 1) {
        const currentSnapshot: FloorPlanHistorySnapshot = {
          walls: JSON.parse(JSON.stringify(s.floorPlan.walls)),
          floors: JSON.parse(JSON.stringify(s.floorPlan.floors)),
          appliances: JSON.parse(JSON.stringify(s.floorPlan.appliances)),
          kitchenConfig: s.floorPlan.kitchenConfig ? JSON.parse(JSON.stringify(s.floorPlan.kitchenConfig)) : null,
        };

        // Check if current state differs from last history entry
        const lastSnapshot = history[historyIndex];
        const isDifferent =
          JSON.stringify(currentSnapshot.walls) !== JSON.stringify(lastSnapshot.walls) ||
          JSON.stringify(currentSnapshot.floors) !== JSON.stringify(lastSnapshot.floors) ||
          JSON.stringify(currentSnapshot.appliances) !== JSON.stringify(lastSnapshot.appliances) ||
          JSON.stringify(currentSnapshot.kitchenConfig) !== JSON.stringify(lastSnapshot.kitchenConfig);

        if (isDifferent) {
          // Save current state as new entry and restore the previous
          const newHistory = [...history, currentSnapshot];
          const snapshot = history[historyIndex];
          return {
            floorPlan: {
              ...s.floorPlan,
              walls: snapshot.walls,
              floors: snapshot.floors,
              appliances: snapshot.appliances,
              kitchenConfig: snapshot.kitchenConfig,
              selectedWallId: null,
              selectedWallIds: [],
              selectedFloorId: null,
              selectedFloorIds: [],
              selectedApplianceId: null,
              history: newHistory,
              historyIndex: historyIndex,
            },
          };
        }
      }

      // Move back in history
      const newIndex = Math.max(0, historyIndex - 1);
      const snapshot = history[newIndex];

      return {
        floorPlan: {
          ...s.floorPlan,
          walls: snapshot.walls,
          floors: snapshot.floors,
          appliances: snapshot.appliances,
          kitchenConfig: snapshot.kitchenConfig,
          selectedWallId: null,
          selectedWallIds: [],
          selectedFloorId: null,
          selectedFloorIds: [],
          selectedApplianceId: null,
          historyIndex: newIndex,
        },
      };
    });
  },

  // Redo floor plan action
  floorPlanRedo: () => {
    set((s) => {
      const { history, historyIndex } = s.floorPlan;

      // Can't redo if at end of history
      if (historyIndex >= history.length - 1) {
        return s;
      }

      // Move forward in history
      const newIndex = historyIndex + 1;
      const snapshot = history[newIndex];

      return {
        floorPlan: {
          ...s.floorPlan,
          walls: snapshot.walls,
          floors: snapshot.floors,
          appliances: snapshot.appliances,
          kitchenConfig: snapshot.kitchenConfig,
          selectedWallId: null,
          selectedWallIds: [],
          selectedFloorId: null,
          selectedFloorIds: [],
          selectedApplianceId: null,
          historyIndex: newIndex,
        },
      };
    });
  },

  // Set snap to grid settings
  setSnapToGrid: (enabled, gridSizeMm) => {
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        snapToGrid: enabled,
        gridSizeMm,
      },
    }));
  },

  // Set snap to objects settings
  setSnapToObjects: (settings) => {
    set((s) => ({
      floorPlan: {
        ...s.floorPlan,
        snapToObjects: settings,
      },
    }));
  },
});
