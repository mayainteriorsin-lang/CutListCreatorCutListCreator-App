/**
 * Library Module - State & Persistence Ownership (PHASE 4)
 *
 * OWNERSHIP MODEL:
 * - State Owner: useLibraryStore (Zustand) - single source of truth for UI
 * - Write Owner: useLibraryStore actions - all mutations should go through store
 * - Persistence Adapter: Zustand persist middleware + api.ts for server sync
 * - Fallback Behavior: API-first when enabled, localStorage fallback for offline
 *
 * SOURCE-OF-TRUTH POLICY:
 * - Authenticated mode: Server is authoritative (via api.ts)
 * - Zustand store is the canonical client-side state
 * - localStorage 'library-store-v1' is managed by Zustand persist middleware
 * - Legacy 'library:modules' key maintained for backwards compatibility read-only
 *
 * WRITE PATH (single canonical entrypoint):
 * - PREFERRED: useLibraryStore.addModule/updateModule/deleteModule
 * - These sync to legacy storage automatically via syncToLegacyStorage()
 * - API sync happens via saveDesignToLibraryAsync() which uses store + api.ts
 *
 * DEPRECATED DIRECT FUNCTIONS (use store instead):
 * - addLibraryModule(), updateLibraryModule(), deleteLibraryModule()
 * - These exist for backwards compatibility but should not be primary path
 *
 * READ PATH:
 * - useLibraryStore.modules - canonical UI state
 * - loadLibraryModules() - reads from legacy key, used for migration
 */

import type { LibraryModule, LibraryWardrobeSection, LibraryCategory } from "./types";
import type { ModuleConfig, WardrobeSection } from "@/modules/design/engine/shapeGenerator";
import { generateUUID } from "@/lib/uuid";
import {
  fetchLibraryModules,
  saveModuleToApi,
  updateModuleInApi,
  deleteModuleFromApi,
  toggleFavoriteApi,
  publishModule,
  unpublishModule,
  getPublishedModule,
} from "./api";
import { useLibraryStore } from "./store/useLibraryStore";
import { logger } from "@/lib/system/logger";
import { createRateCard } from "@/modules/visual-quotation/services/rateCardService";
import { DEFAULT_WARDROBE_CONFIG } from "@/modules/visual-quotation/types/pricing";
import type { RateCardUnitType } from "@/modules/visual-quotation/types/rateCard";

// Legacy storage key - reads maintained for migration, writes go through Zustand
const STORAGE_KEY = "library:modules";

// Flag to enable/disable API syncing
let apiSyncEnabled = true;

// =============================================================================
// Human-Readable ID Generation
// =============================================================================

/** Unit type abbreviations for human-readable ID */
const TYPE_ABBREV: Record<string, string> = {
  wardrobe_carcass: "W/C",
  wardrobe: "WRD",
  kitchen: "KIT",
  tv_unit: "TV",
  study_table: "STD",
  book_shelf: "BSH",
  shoe_rack: "SHO",
  bar_unit: "BAR",
  display_unit: "DSP",
  pooja_unit: "POJ",
  vanity: "VAN",
  crockery_unit: "CRK",
  dresser: "DRS",
  other: "MOD",
};

/**
 * Generate a human-readable ID from module configuration.
 * Format: "W/C 2-Post +Loft 2400×2400×560"
 */
export function generateHumanReadableId(config: ModuleConfig | Record<string, unknown>): string {
  const parts: string[] = [];

  // Type abbreviation
  const unitType = (config.unitType as string) || "other";
  parts.push(TYPE_ABBREV[unitType] || unitType.substring(0, 3).toUpperCase());

  // Center posts (for wardrobe_carcass)
  const centerPostCount = (config as Record<string, unknown>).centerPostCount as number;
  if (centerPostCount && centerPostCount > 0) {
    parts.push(`${centerPostCount}-Post`);
  }

  // Sections (if more than 1)
  const sectionCount = (config.sectionCount as number) || 1;
  if (sectionCount > 1 && !centerPostCount) {
    parts.push(`${sectionCount}-Sec`);
  }

  // Shutters
  const shutterCount = (config.shutterCount as number) || 0;
  if (shutterCount > 0) {
    parts.push(`${shutterCount}-Sht`);
  }

  // Features
  const features: string[] = [];
  if (config.loftEnabled) features.push("Loft");
  if ((config as Record<string, unknown>).skirtingEnabled) features.push("Skirt");
  if (features.length > 0) {
    parts.push(`+${features.join("+")}`);
  }

  // Dimensions (W×H×D)
  const w = (config.widthMm as number) || 0;
  const h = (config.heightMm as number) || 0;
  const d = (config.depthMm as number) || 0;
  if (w > 0 && h > 0) {
    parts.push(`${w}×${h}×${d}`);
  }

  return parts.join(" ");
}

/**
 * Generate a unique fingerprint for a module configuration.
 * Used to detect duplicate models.
 * Compares ALL configuration details - any small change = new model.
 */
function generateModuleFingerprint(config: ModuleConfig): string {
  // Create a deep copy and remove non-essential fields that shouldn't affect uniqueness
  const configCopy = { ...config } as Record<string, unknown>;

  // Remove metadata fields that don't define the model structure
  delete configCopy.name; // Same structure with different name = duplicate
  delete configCopy.id;
  delete configCopy.createdAt;
  delete configCopy.updatedAt;

  // Sort keys for consistent stringification
  const sortedKeys = Object.keys(configCopy).sort();
  const normalized: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    const value = configCopy[key];
    // Include all values, even undefined/null (they matter for comparison)
    if (value !== undefined) {
      normalized[key] = value;
    }
  }

  // Create a simple hash from the FULL stringified config
  const str = JSON.stringify(normalized);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `fp-${Math.abs(hash).toString(36)}`;
}

/**
 * Check if a module with the same configuration already exists.
 * Returns the existing module if found, null otherwise.
 */
export function findDuplicateModule(config: ModuleConfig): LibraryModule | null {
  const fingerprint = generateModuleFingerprint(config);
  const modules = loadLibraryModules();

  for (const mod of modules) {
    // Check if this module has a matching fingerprint
    if (mod.fullConfig) {
      const existingFp = generateModuleFingerprint(mod.fullConfig as ModuleConfig);
      if (existingFp === fingerprint) {
        return mod;
      }
    }
  }

  return null;
}

/** Enable or disable API syncing */
export function setApiSyncEnabled(enabled: boolean): void {
  apiSyncEnabled = enabled;
}

/** Check if API syncing is enabled */
export function isApiSyncEnabled(): boolean {
  return apiSyncEnabled;
}

// =============================================================================
// Category Inference
// =============================================================================

const CATEGORY_MAP: Record<string, LibraryCategory> = {
  wardrobe: "bedroom",
  wardrobe_carcass: "bedroom",
  dresser: "bedroom",
  kitchen: "kitchen",
  tv_unit: "living",
  bar_unit: "living",
  display_unit: "living",
  study_table: "study",
  book_shelf: "study",
  shoe_rack: "utility",
  pooja_unit: "utility",
  vanity: "utility",
  crockery_unit: "utility",
  other: "custom",
};

/** Infer room category from unit type */
export function inferCategoryFromUnitType(unitType: string): LibraryCategory {
  return CATEGORY_MAP[unitType] || "custom";
}

// =============================================================================
// Auto Rate Card Creation
// =============================================================================

/** Map unit types to rate card unit types */
const UNIT_TYPE_TO_RATE_CARD: Record<string, RateCardUnitType> = {
  wardrobe: "wardrobe",
  wardrobe_carcass: "wardrobe",
  kitchen: "kitchen",
  tv_unit: "tv_unit",
  dresser: "dresser",
  study_table: "study_table",
  shoe_rack: "shoe_rack",
  book_shelf: "book_shelf",
  crockery_unit: "crockery_unit",
  pooja_unit: "pooja_unit",
  vanity: "vanity",
  bar_unit: "bar_unit",
  display_unit: "display_unit",
};

/**
 * Create a rate card from a library module.
 * Uses the human-readable ID format (e.g., "W/C 2-Post 2-Sht 2400×2400×560").
 */
export function createRateCardFromLibraryModule(module: LibraryModule): { success: boolean; error?: string } {
  const unitType = UNIT_TYPE_TO_RATE_CARD[module.unitType] || "all";

  // Generate rate card name using human-readable ID format
  const rateCardName = generateHumanReadableId(module.fullConfig || (module as unknown as Record<string, unknown>));

  // Create with default wardrobe config, preserving folder association
  const result = createRateCard({
    name: rateCardName,
    description: `Auto-created from library module: ${module.id}`,
    unitType,
    config: { ...DEFAULT_WARDROBE_CONFIG },
    folderId: module.folderId, // Inherit folder from library module
  });

  if (result.success) {
    logger.log(`[Library] Auto-created rate card: "${rateCardName}" for module ${module.id} (folder: ${module.folderId || "none"})`);
  } else {
    logger.warn(`[Library] Failed to create rate card: ${result.error}`);
  }

  return { success: result.success, error: result.error };
}

/**
 * Create a rate card for an existing library module by ID.
 * Useful for retroactively creating rate cards for modules saved before this feature.
 */
export function createRateCardForExistingModule(moduleId: string): { success: boolean; error?: string } {
  const modules = loadLibraryModules();
  const module = modules.find(m => m.id === moduleId);

  if (!module) {
    return { success: false, error: `Module not found: ${moduleId}` };
  }

  return createRateCardFromLibraryModule(module);
}

/**
 * Create rate cards for all existing library modules that don't have one.
 * Batch operation for migrating existing libraries.
 */
export function createRateCardsForAllModules(): { created: number; failed: number; skipped: number } {
  const modules = loadLibraryModules();
  let created = 0;
  let failed = 0;
  let skipped = 0;

  for (const module of modules) {
    const result = createRateCardFromLibraryModule(module);
    if (result.success) {
      created++;
    } else if (result.error?.includes("already exists")) {
      skipped++;
    } else {
      failed++;
    }
  }

  logger.log(`[Library] Rate card batch creation: ${created} created, ${skipped} skipped, ${failed} failed`);
  return { created, failed, skipped };
}

/** Ensure module has v2 fields (category, isTemplate) */
function migrateModule(m: LibraryModule): LibraryModule {
  return {
    ...m,
    category: m.category || inferCategoryFromUnitType(m.unitType),
    isTemplate: m.isTemplate ?? (m.widthMm === 0 && m.heightMm === 0 && m.depthMm === 0),
  };
}

// =============================================================================
// Favorite Toggle
// =============================================================================

/** Toggle favorite status for a module */
export function toggleFavorite(id: string): LibraryModule[] {
  const modules = loadLibraryModules();
  const idx = modules.findIndex((m) => m.id === id);
  if (idx >= 0) {
    modules[idx] = {
      ...modules[idx],
      favorite: !modules[idx].favorite,
      updatedAt: new Date().toISOString(),
    };
    saveLibraryModules(modules);
  }
  return modules;
}

// =============================================================================
// Module Config Conversion
// =============================================================================

/**
 * Convert a design ModuleConfig to a LibraryModule.
 * Stores the FULL configuration including dimensions for exact reproduction.
 */
export function moduleConfigToLibraryModule(
  config: ModuleConfig,
  options?: { name?: string; description?: string; tags?: string[]; saveAsTemplate?: boolean; folderId?: string }
): LibraryModule {
  const now = new Date().toISOString();
  const saveAsTemplate = options?.saveAsTemplate ?? false;

  // Convert WardrobeSection to LibraryWardrobeSection
  const sections: LibraryWardrobeSection[] | undefined = config.sections?.map((s: WardrobeSection) => ({
    type: s.type,
    widthMm: s.widthMm || 0,
    shelfCount: s.shelfCount,
    drawerCount: s.drawerCount,
    rodHeightPct: s.rodHeightPct,
  }));

  return {
    id: generateUUID(),
    name: options?.name || config.name || "Untitled Module",
    unitType: config.unitType,
    source: "custom",
    description: options?.description,

    // Preserve actual dimensions for exact reproduction
    widthMm: saveAsTemplate ? 0 : (config.widthMm || 0),
    heightMm: saveAsTemplate ? 0 : (config.heightMm || 0),
    depthMm: saveAsTemplate ? 0 : (config.depthMm || 0),

    // Configuration structure (preserved)
    shutterCount: config.shutterCount,
    loftEnabled: config.loftEnabled,
    loftHeightMm: config.loftEnabled ? config.loftHeightMm : undefined,
    sectionCount: config.sectionCount,

    // Materials (preserved)
    carcassMaterial: config.carcassMaterial,
    shutterMaterial: config.shutterMaterial,

    // Section configuration
    sections,
    carcassThicknessMm: config.carcassThicknessMm,

    // Store full config for exact reproduction (includes centerPostCount, etc.)
    fullConfig: { ...config } as Record<string, unknown>,

    // Metadata
    tags: options?.tags || [],
    createdAt: now,
    updatedAt: now,

    // v2 fields
    category: inferCategoryFromUnitType(config.unitType),
    isTemplate: saveAsTemplate,
    favorite: false,

    // Folder association
    folderId: options?.folderId,
  };
}

/**
 * Quick save: convert current design config to library module and save it.
 * Returns the saved module.
 */
export function saveDesignToLibrary(
  config: ModuleConfig,
  options?: { name?: string; description?: string; tags?: string[] }
): LibraryModule {
  const module = moduleConfigToLibraryModule(config, options);
  addLibraryModule(module);
  return module;
}

/**
 * Load modules from legacy localStorage key.
 * Used for migration and backwards compatibility reads.
 * For UI state, prefer useLibraryStore.modules
 */
export function loadLibraryModules(): LibraryModule[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Auto-migrate modules to ensure v2 fields
        const migrated = parsed.map(migrateModule);
        logger.log(`[Library Storage] Loaded ${migrated.length} modules from localStorage`);
        return migrated;
      }
    }
    logger.log('[Library Storage] No modules found in localStorage');
  } catch (error) {
    logger.error('[Library Storage] Error loading modules:', error);
  }
  return [];
}

/**
 * Save modules to legacy localStorage key.
 * @deprecated PHASE 4: Prefer useLibraryStore actions which auto-sync to legacy storage.
 * This function exists for backwards compatibility only.
 */
export function saveLibraryModules(modules: LibraryModule[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
    logger.log(`[Library Storage] Saved ${modules.length} modules to localStorage`);
  } catch (error) {
    logger.error('[Library Storage] Failed to save modules:', error);
  }
}

/**
 * Add module to legacy localStorage.
 * @deprecated PHASE 4: Prefer useLibraryStore.getState().addModule() for canonical writes.
 * This function exists for backwards compatibility only.
 */
export function addLibraryModule(mod: LibraryModule): LibraryModule[] {
  const modules = loadLibraryModules();
  modules.push(mod);
  saveLibraryModules(modules);
  logger.log(`[Library Storage] Added module: "${mod.name}" (${mod.id}), total: ${modules.length}`);
  return modules;
}

/**
 * Update module in legacy localStorage.
 * @deprecated PHASE 4: Prefer useLibraryStore.getState().updateModule() for canonical writes.
 * This function exists for backwards compatibility only.
 */
export function updateLibraryModule(
  id: string,
  updates: Partial<LibraryModule>
): LibraryModule[] {
  const modules = loadLibraryModules();
  const idx = modules.findIndex((m) => m.id === id);
  if (idx >= 0) {
    modules[idx] = {
      ...modules[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveLibraryModules(modules);
  }
  return modules;
}

/**
 * Delete module from legacy localStorage.
 * @deprecated PHASE 4: Prefer useLibraryStore.getState().deleteModule() for canonical writes.
 * This function exists for backwards compatibility only.
 */
export function deleteLibraryModule(id: string): LibraryModule[] {
  const modules = loadLibraryModules().filter((m) => m.id !== id);
  saveLibraryModules(modules);
  return modules;
}

/** Clear all modules from library */
export function clearAllLibraryModules(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// =============================================================================
// Async API Functions (for persistent database storage)
// =============================================================================

/**
 * Load modules from API (async, for persistent storage)
 * Falls back to localStorage if API fails
 */
export async function loadLibraryModulesAsync(): Promise<LibraryModule[]> {
  if (!apiSyncEnabled) {
    return loadLibraryModules();
  }

  try {
    const apiModules = await fetchLibraryModules();
    if (apiModules.length > 0) {
      // Update localStorage with API data for offline access
      saveLibraryModules(apiModules);
      return apiModules;
    }
  } catch (error) {
    logger.warn('[Library] API fetch failed, using localStorage:', error);
  }

  // Fallback to localStorage
  return loadLibraryModules();
}

/**
 * Save module to API (async, for persistent storage)
 * Also saves to localStorage for offline access
 */
export async function addLibraryModuleAsync(mod: LibraryModule): Promise<{ modules: LibraryModule[]; success: boolean }> {
  // Save to localStorage first (for immediate UI update)
  const modules = addLibraryModule(mod);

  if (!apiSyncEnabled) {
    return { modules, success: true };
  }

  // Sync to API
  const result = await saveModuleToApi(mod);
  return { modules, success: result.success };
}

/**
 * Update module in API (async)
 */
export async function updateLibraryModuleAsync(
  id: string,
  updates: Partial<LibraryModule>
): Promise<{ modules: LibraryModule[]; success: boolean }> {
  // Update localStorage first
  const modules = updateLibraryModule(id, updates);

  if (!apiSyncEnabled) {
    return { modules, success: true };
  }

  // Sync to API
  const result = await updateModuleInApi(id, updates);
  return { modules, success: result.success };
}

/**
 * Delete module from API (async)
 */
export async function deleteLibraryModuleAsync(id: string): Promise<{ modules: LibraryModule[]; success: boolean }> {
  // Delete from localStorage first
  const modules = deleteLibraryModule(id);

  if (!apiSyncEnabled) {
    return { modules, success: true };
  }

  // Sync to API
  const result = await deleteModuleFromApi(id);
  return { modules, success: result.success };
}

/**
 * Toggle favorite status (async)
 */
export async function toggleFavoriteAsync(id: string): Promise<{ modules: LibraryModule[]; success: boolean }> {
  // Update localStorage first
  const modules = toggleFavorite(id);

  if (!apiSyncEnabled) {
    return { modules, success: true };
  }

  // Sync to API
  const result = await toggleFavoriteApi(id);
  return { modules, success: result.success };
}

/**
 * Publish module (make shareable with unique code)
 */
export async function publishLibraryModule(id: string): Promise<{ shareCode?: string; success: boolean; error?: string }> {
  if (!apiSyncEnabled) {
    return { success: false, error: 'API sync disabled' };
  }

  return publishModule(id);
}

/**
 * Unpublish module
 */
export async function unpublishLibraryModule(id: string): Promise<{ success: boolean; error?: string }> {
  if (!apiSyncEnabled) {
    return { success: false, error: 'API sync disabled' };
  }

  return unpublishModule(id);
}

/**
 * Get a published module by share code (public access)
 */
export async function getPublishedLibraryModule(shareCode: string): Promise<LibraryModule | null> {
  return getPublishedModule(shareCode);
}

/**
 * Save current design to library (async version)
 * Uses the Zustand store for immediate sync across all pages.
 * Also syncs to API for persistence.
 * Returns error if duplicate module exists.
 * Auto-creates a rate card for the new module.
 */
export async function saveDesignToLibraryAsync(
  config: ModuleConfig,
  options?: { name?: string; description?: string; tags?: string[]; allowDuplicate?: boolean; skipRateCard?: boolean; folderId?: string }
): Promise<{ module: LibraryModule | null; success: boolean; error?: string; duplicate?: LibraryModule; rateCardCreated?: boolean }> {
  // Check for duplicate unless explicitly allowed
  if (!options?.allowDuplicate) {
    const existing = findDuplicateModule(config);
    if (existing) {
      return {
        module: null,
        success: false,
        error: 'DUPLICATE',
        duplicate: existing,
      };
    }
  }

  const module = moduleConfigToLibraryModule(config, options);

  // Use Zustand store for immediate sync (it also saves to localStorage)
  try {
    useLibraryStore.getState().addModule(module);
    logger.log(`[Library] Saved via Zustand store: "${module.name}" (${module.id})`);
  } catch (e) {
    // Fallback to direct localStorage if store fails
    logger.warn('[Library] Zustand store unavailable, using localStorage:', e);
    addLibraryModule(module);
  }

  // Also sync to API if enabled
  let apiSuccess = true;
  if (apiSyncEnabled) {
    try {
      const result = await saveModuleToApi(module);
      apiSuccess = result.success;
    } catch {
      apiSuccess = false;
    }
  }

  // Auto-create rate card for the new module (unless skipped)
  let rateCardCreated = false;
  if (!options?.skipRateCard) {
    const rateCardResult = createRateCardFromLibraryModule(module);
    rateCardCreated = rateCardResult.success;
  }

  return { module, success: apiSuccess, rateCardCreated };
}
