/**
 * PATCH 27: Preferences Slice (Wood Grains + Memory)
 *
 * Zustand slice for user preferences state.
 * Owns its own loading & error state.
 */

import { create } from "zustand";
import { safeFetchZod } from "@/lib/api/fetchZod";
import {
  WoodGrainsPrefsSchema,
  MasterSettingsMemorySchema,
} from "@/lib/api/schemas";
import { API_BASE } from "@/lib/queryClient";

interface PreferencesState {
  woodGrains: Record<string, boolean>;
  memory: Record<string, any>;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  fetch: (force?: boolean) => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  woodGrains: {},
  memory: {},
  loaded: false,
  loading: false,
  error: null,

  async fetch(force = false) {
    if (!force && get().loaded) {
      console.log("[PREFERENCES SLICE] already loaded, skipping fetch");
      return;
    }

    set({ loading: true });

    try {
      // Fetch wood grains preferences (array format)
      const woodGrainsArray = await safeFetchZod(
        `${API_BASE}/api/wood-grains-preferences`,
        WoodGrainsPrefsSchema,
        []
      );

      // Convert array to record for easier lookup
      const woodGrainsRecord: Record<string, boolean> = {};
      if (Array.isArray(woodGrainsArray)) {
        woodGrainsArray.forEach((item: any) => {
          if (item.laminateCode) {
            woodGrainsRecord[item.laminateCode] = item.hasWoodGrains ?? false;
          }
        });
      }

      // Fetch master settings memory
      const memory = await safeFetchZod(
        `${API_BASE}/api/master-settings-memory`,
        MasterSettingsMemorySchema,
        {}
      );

      set({
        woodGrains: woodGrainsRecord,
        memory: memory ?? {},
        loaded: true,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      set({
        woodGrains: {},
        memory: {},
        loaded: true,
        loading: false,
        error: e.message,
      });
    }
  },
}));
