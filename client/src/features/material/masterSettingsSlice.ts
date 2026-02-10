/**
 * PATCH 27: Master Settings Slice
 *
 * Zustand slice for master settings state.
 * Owns its own loading & error state.
 */

import { create } from "zustand";
import { safeFetchZod } from "@/lib/api/fetchZod";
import { MasterSettingsSchema } from "@/lib/api/schemas";
import { API_BASE, apiRequest } from "@/lib/queryClient";
import { normString, normNumber, normArray } from "@/lib/normalize";
import { MasterSettingsMemory } from "@shared/schema";
import { MasterSettingsResponseSchema, safeValidate } from "@shared/schemas";
import { logger } from "@/lib/system/logger";

// PATCH 17: Default master settings object (never null)
const DEFAULT_MASTER_SETTINGS: MasterSettingsMemory = {
  id: 0,
  tenantId: 'default',
  sheetWidth: "1210",
  sheetHeight: "2420",
  kerf: "5",
  masterLaminateCode: null,
  masterPlywoodBrand: "Apple Ply 16mm BWP",
  optimizePlywoodUsage: "true",
  updatedAt: new Date(),
};

interface MasterSettingsState {
  data: MasterSettingsMemory;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  fetch: (force?: boolean) => Promise<void>;
  save: (settings: Partial<MasterSettingsMemory>) => Promise<void>;
}

export const useMasterSettingsStore = create<MasterSettingsState>((set, get) => ({
  data: DEFAULT_MASTER_SETTINGS,
  loaded: false,
  loading: false,
  error: null,

  async fetch(force = false) {
    if (!force && get().loaded) {
      logger.log("[MASTER SETTINGS SLICE] already loaded, skipping fetch");
      return;
    }

    set({ loading: true });

    const defaultSettings = {
      id: 0,
      sheetWidth: "1210",
      sheetHeight: "2420",
      kerf: "5",
      masterLaminateCode: null,
      masterPlywoodBrand: "Apple Ply 16mm BWP",
      optimizePlywoodUsage: "true",
      updatedAt: new Date().toISOString(),
      plywoodTypes: [] as string[],
      laminateCodes: [] as string[],
    };

    try {
      const data = await safeFetchZod(
        `${API_BASE}/api/master-settings`,
        MasterSettingsSchema,
        defaultSettings
      );

      // PATCH 10: Normalize ALL fields with frontend type enforcement
      const normalizedData = {
        id: normNumber(data?.id),
        sheetWidth: normString(data?.sheetWidth) || "1210",
        sheetHeight: normString(data?.sheetHeight) || "2420",
        kerf: normString(data?.kerf) || "5",
        masterLaminateCode: data?.masterLaminateCode
          ? normString(data.masterLaminateCode)
          : null,
        masterPlywoodBrand:
          normString(data?.masterPlywoodBrand) || "Apple Ply 16mm BWP",
        optimizePlywoodUsage: normString(data?.optimizePlywoodUsage) || "true",
        updatedAt: data?.updatedAt ?? new Date().toISOString(),
        plywoodTypes: normArray(data?.plywoodTypes).map(normString),
        laminateCodes: normArray(data?.laminateCodes).map(normString),
      };

      // PATCH 12: Validate with Zod schema
      const safeMasterSettings = safeValidate(
        MasterSettingsResponseSchema,
        normalizedData,
        {
          id: 0,
          sheetWidth: "1210",
          sheetHeight: "2420",
          kerf: "5",
          masterLaminateCode: null,
          masterPlywoodBrand: "Apple Ply 16mm BWP",
          optimizePlywoodUsage: "true",
          updatedAt: new Date().toISOString(),
          plywoodTypes: [],
          laminateCodes: [],
        }
      );

      // Merge with DEFAULT to ensure tenantId is present for MasterSettingsMemory type
      const finalSettings: MasterSettingsMemory = {
        ...DEFAULT_MASTER_SETTINGS,
        ...safeMasterSettings,
        updatedAt: new Date(safeMasterSettings?.updatedAt ?? new Date()),
      };

      set({
        data: finalSettings,
        loaded: true,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      set({
        data: DEFAULT_MASTER_SETTINGS,
        loaded: true,
        loading: false,
        error: e.message,
      });
    }
  },

  async save(settings) {
    try {
      const payload: Record<string, unknown> = {};

      if (settings.sheetWidth !== undefined)
        payload.sheetWidth = String(settings.sheetWidth);
      if (settings.sheetHeight !== undefined)
        payload.sheetHeight = String(settings.sheetHeight);
      if (settings.kerf !== undefined) payload.kerf = String(settings.kerf);
      if ((settings as any).masterLaminateCode !== undefined) {
        payload.masterLaminateCode = (settings as any).masterLaminateCode;
      }
      if ((settings as any).masterPlywoodBrand !== undefined) {
        payload.masterPlywoodBrand = (settings as any).masterPlywoodBrand;
      }
      if ((settings as any).optimizePlywoodUsage !== undefined) {
        const raw = (settings as any).optimizePlywoodUsage;
        payload.optimizePlywoodUsage =
          typeof raw === "string" ? raw === "true" : Boolean(raw);
      }

      if (Object.keys(payload).length === 0) return;

      const response = await apiRequest("POST", "/api/master-settings", payload);
      const json = await response.json();
      const saved = json?.data ?? json;
      set({ data: saved });
    } catch (error) {
      logger.error("Error saving master settings:", error);
    }
  },
}));
