/**
 * PATCH 27: Godown Slice (Plywood + Laminates)
 *
 * Zustand slice for godown material state.
 * Owns its own loading & error state.
 */

import { create } from "zustand";
import { safeFetchZod } from "@/lib/api/fetchZod";
import { PlywoodListSchema, LaminateCodeListSchema } from "@/lib/api/schemas";
import { API_BASE, apiRequest } from "@/lib/queryClient";
import { normArray, normString, normNumber } from "@/lib/normalize";
import { PlywoodBrandMemory, LaminateCodeGodown } from "@shared/schema";
import { PlywoodListSchema as SharedPlywoodSchema, LaminateListSchema, safeValidateArray } from "@shared/schemas";

interface GodownState {
  plywoodOptions: PlywoodBrandMemory[];
  laminateOptions: LaminateCodeGodown[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  fetch: (force?: boolean) => Promise<void>;
  addLaminate: (code: string, name?: string) => Promise<void>;
  addPlywood: (brand: string) => Promise<void>;
  removeLaminate: (code: string) => Promise<void>;
  removePlywood: (brand: string) => Promise<void>;
}

export const useGodownStore = create<GodownState>((set, get) => ({
  plywoodOptions: [],
  laminateOptions: [],
  loaded: false,
  loading: false,
  error: null,

  async fetch(force = false) {
    if (!force && get().loaded) {
      console.log("[GODOWN SLICE] already loaded, skipping fetch");
      return;
    }

    set({ loading: true });

    try {
      const plyJson = await safeFetchZod(
        `${API_BASE}/api/godown/plywood`,
        PlywoodListSchema,
        []
      );

      const lamJson = await safeFetchZod(
        `${API_BASE}/api/laminate-code-godown`,
        LaminateCodeListSchema,
        []
      );

      // PATCH 10: Normalize ALL fields with frontend type enforcement
      const normalizedPlywood = normArray(plyJson).map((r: any) => ({
        id: normNumber(r.id),
        brand: normString(r.brand),
        createdAt: r.createdAt ?? new Date().toISOString(),
      }));

      const normalizedLaminates = normArray(lamJson).map((r: any) => ({
        id: normNumber(r.id),
        code: normString(r.code),
        name: normString(r.name),
        innerCode: r.innerCode ? normString(r.innerCode) : null,
        supplier: r.supplier ? normString(r.supplier) : null,
        thickness: r.thickness ? normString(r.thickness) : null,
        description: r.description ? normString(r.description) : null,
        woodGrainsEnabled: normString(r.woodGrainsEnabled) || "false",
        createdAt: r.createdAt ?? new Date().toISOString(),
        updatedAt: r.updatedAt ?? new Date().toISOString(),
      }));

      // PATCH 12: Validate with Zod schemas
      const validatedPlywood = safeValidateArray(SharedPlywoodSchema, normalizedPlywood);
      const validatedLaminates = safeValidateArray(LaminateListSchema, normalizedLaminates);

      set({
        plywoodOptions: Array.isArray(validatedPlywood)
          ? (validatedPlywood as unknown as PlywoodBrandMemory[])
          : [],
        laminateOptions: Array.isArray(validatedLaminates)
          ? (validatedLaminates as unknown as LaminateCodeGodown[])
          : [],
        loaded: true,
        loading: false,
        error: null,
      });
    } catch (e: any) {
      set({
        plywoodOptions: [],
        laminateOptions: [],
        loaded: true,
        loading: false,
        error: e.message,
      });
    }
  },

  async addLaminate(code, name) {
    const codeName = name || code;
    const tempItem: LaminateCodeGodown = {
      id: -1,
      code,
      name: codeName,
      woodGrainsEnabled: "false",
      createdAt: new Date(),
      updatedAt: new Date(),
      innerCode: null,
      supplier: null,
      thickness: null,
      description: null,
    };

    // PATCH 17: Safe array spread
    set((state) => ({
      laminateOptions: [...(state.laminateOptions ?? []), tempItem],
    }));

    try {
      await apiRequest("POST", "/api/laminate-code-godown", {
        code: code,
        name: codeName,
      });
      await get().fetch(true); // Force refresh after mutation
    } catch (error) {
      console.error("Error adding laminate:", error);
      // PATCH 17: Safe array filter
      set((state) => ({
        laminateOptions: (state.laminateOptions ?? []).filter(
          (opt) => opt.code !== code
        ),
      }));
    }
  },

  async addPlywood(brand) {
    const tempItem: PlywoodBrandMemory = {
      id: -1,
      brand,
      createdAt: new Date(),
    };

    // PATCH 17: Safe array spread
    set((state) => ({
      plywoodOptions: [...(state.plywoodOptions ?? []), tempItem],
    }));

    try {
      await apiRequest("POST", "/api/godown/plywood", { brand });
      await get().fetch(true); // Force refresh after mutation
    } catch (error) {
      console.error("Error adding plywood brand:", error);
      // PATCH 17: Safe array filter
      set((state) => ({
        plywoodOptions: (state.plywoodOptions ?? []).filter(
          (opt) => opt.brand !== brand
        ),
      }));
    }
  },

  async removeLaminate(code) {
    const target = code.trim().toLowerCase();
    // PATCH 17: Safe array filter
    set((state) => ({
      laminateOptions: (state.laminateOptions ?? []).filter(
        (opt) => (opt.code || "").trim().toLowerCase() !== target
      ),
    }));
    try {
      await apiRequest(
        "DELETE",
        `/api/laminate-code-godown/${encodeURIComponent(code)}`
      );
    } catch (error) {
      console.error("Error removing laminate:", error);
      // Re-fetch to sync with server if delete failed
      get().fetch(true);
    }
  },

  async removePlywood(brand) {
    const target = brand.trim().toLowerCase();
    // PATCH 17: Safe array filter
    set((state) => ({
      plywoodOptions: (state.plywoodOptions ?? []).filter(
        (opt) => (opt.brand || "").trim().toLowerCase() !== target
      ),
    }));
    try {
      await apiRequest(
        "DELETE",
        `/api/plywood-brand-memory/${encodeURIComponent(brand)}`
      );
    } catch (error) {
      console.error("Error removing plywood:", error);
      get().fetch(true);
    }
  },
}));
