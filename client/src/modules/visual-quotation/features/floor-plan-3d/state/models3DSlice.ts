/**
 * 3D Models State Slice
 *
 * Zustand slice for 3D imported models state and actions.
 * Extracted verbatim from visualQuotationStore.ts.
 */

import type { StateCreator } from "zustand";
import type {
  Models3DState,
  Imported3DModel,
  DEFAULT_3D_PRESETS,
} from "./types";

/* ========================= UID Helper ========================= */

function uid(prefix: string): string {
  // good enough for client-side IDs
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

/* ========================= Initial State ========================= */

// Import the presets constant
import { DEFAULT_3D_PRESETS as PRESETS } from "./types";

export const initialModels3DState: Models3DState = {
  models: [],
  selectedModelId: null,
  presets: PRESETS,
};

/* ========================= Action Types ========================= */

export interface Models3DActions {
  // 3D Model import actions
  add3DModel: (model: Omit<Imported3DModel, "id">) => string; // Returns new model ID
  update3DModel: (modelId: string, patch: Partial<Imported3DModel>) => void;
  delete3DModel: (modelId: string) => void;
  select3DModel: (modelId: string | null) => void;
  duplicate3DModel: (modelId: string) => string; // Returns new model ID
  clear3DModels: () => void;
}

/* ========================= Slice State Shape ========================= */

export interface Models3DSliceState {
  models3D: Models3DState;
}

export type Models3DSlice = Models3DSliceState & Models3DActions;

/* ========================= Slice Creator ========================= */

/**
 * Creates the 3D Models slice.
 *
 * @param addAudit - Function to add audit entries (injected from root store)
 */
export const createModels3DSlice = (
  addAudit: (action: string, detail?: string) => void
): StateCreator<Models3DSlice, [], [], Models3DSlice> => (set, get) => ({
  // Initial state
  models3D: initialModels3DState,

  /* --------- 3D Model Import Actions ---------- */
  add3DModel: (model) => {
    const id = uid("MODEL3D");
    set((s) => ({
      models3D: {
        ...s.models3D,
        models: [...s.models3D.models, { ...model, id }],
        selectedModelId: id, // Select the newly added model
      },
    }));
    addAudit("3D model added", model.name);
    return id;
  },

  update3DModel: (modelId, patch) => {
    set((s) => ({
      models3D: {
        ...s.models3D,
        models: s.models3D.models.map((m) =>
          m.id === modelId ? { ...m, ...patch } : m
        ),
      },
    }));
  },

  delete3DModel: (modelId) => {
    set((s) => ({
      models3D: {
        ...s.models3D,
        models: s.models3D.models.filter((m) => m.id !== modelId),
        selectedModelId: s.models3D.selectedModelId === modelId ? null : s.models3D.selectedModelId,
      },
    }));
    addAudit("3D model deleted", modelId);
  },

  select3DModel: (modelId) => {
    set((s) => ({
      models3D: {
        ...s.models3D,
        selectedModelId: modelId,
      },
    }));
  },

  duplicate3DModel: (modelId) => {
    const state = get();
    const original = state.models3D.models.find((m) => m.id === modelId);
    if (!original) return "";

    const newId = uid("MODEL3D");
    const duplicate: Imported3DModel = {
      ...original,
      id: newId,
      name: `${original.name} (copy)`,
      position: {
        x: original.position.x + 50,
        y: original.position.y,
        z: original.position.z + 50,
      },
    };

    set((s) => ({
      models3D: {
        ...s.models3D,
        models: [...s.models3D.models, duplicate],
        selectedModelId: newId,
      },
    }));
    addAudit("3D model duplicated", original.name);
    return newId;
  },

  clear3DModels: () => {
    set((s) => ({
      models3D: {
        ...s.models3D,
        models: [],
        selectedModelId: null,
      },
    }));
    addAudit("All 3D models cleared");
  },
});
