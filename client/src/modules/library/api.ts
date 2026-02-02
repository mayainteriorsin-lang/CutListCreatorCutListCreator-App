/**
 * Library API Client
 *
 * Handles all API calls for library module persistence.
 * Provides both online (API) and offline (localStorage) storage.
 */

import type { LibraryModule } from "./types";

const API_BASE = "/api/library";

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface LibraryModuleApi extends Omit<LibraryModule, 'source'> {
    config: Record<string, unknown>;
    published?: boolean;
    shareCode?: string;
}

/**
 * Check if API is available (user is authenticated)
 */
async function isApiAvailable(): Promise<boolean> {
    try {
        const res = await fetch(API_BASE, { method: 'HEAD' });
        return res.status !== 401;
    } catch {
        return false;
    }
}

/**
 * Fetch all library modules from API
 */
export async function fetchLibraryModules(): Promise<LibraryModule[]> {
    try {
        const res = await fetch(API_BASE);
        if (!res.ok) {
            console.warn('[LibraryAPI] Fetch failed, status:', res.status);
            return [];
        }

        const json: ApiResponse<LibraryModuleApi[]> = await res.json();
        if (!json.success || !json.data) {
            return [];
        }

        // Convert API response to LibraryModule format
        return json.data.map(apiModuleToLibraryModule);
    } catch (error) {
        console.error('[LibraryAPI] Fetch error:', error);
        return [];
    }
}

/**
 * Save a module to the API
 */
export async function saveModuleToApi(module: LibraryModule): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(libraryModuleToApiPayload(module)),
        });

        const json: ApiResponse<{ id: string }> = await res.json();
        return {
            success: json.success,
            id: json.data?.id || module.id,
            error: json.error,
        };
    } catch (error) {
        console.error('[LibraryAPI] Save error:', error);
        return { success: false, error: 'Network error' };
    }
}

/**
 * Update a module in the API
 */
export async function updateModuleInApi(id: string, updates: Partial<LibraryModule>): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });

        const json: ApiResponse<void> = await res.json();
        return { success: json.success, error: json.error };
    } catch (error) {
        console.error('[LibraryAPI] Update error:', error);
        return { success: false, error: 'Network error' };
    }
}

/**
 * Delete a module from the API
 */
export async function deleteModuleFromApi(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE',
        });

        const json: ApiResponse<void> = await res.json();
        return { success: json.success, error: json.error };
    } catch (error) {
        console.error('[LibraryAPI] Delete error:', error);
        return { success: false, error: 'Network error' };
    }
}

/**
 * Publish a module (make it shareable)
 */
export async function publishModule(id: string): Promise<{ success: boolean; shareCode?: string; error?: string }> {
    try {
        const res = await fetch(`${API_BASE}/${id}/publish`, {
            method: 'POST',
        });

        const json: ApiResponse<{ shareCode: string }> = await res.json();
        return {
            success: json.success,
            shareCode: (json as { shareCode?: string }).shareCode,
            error: json.error,
        };
    } catch (error) {
        console.error('[LibraryAPI] Publish error:', error);
        return { success: false, error: 'Network error' };
    }
}

/**
 * Unpublish a module
 */
export async function unpublishModule(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await fetch(`${API_BASE}/${id}/unpublish`, {
            method: 'POST',
        });

        const json: ApiResponse<void> = await res.json();
        return { success: json.success, error: json.error };
    } catch (error) {
        console.error('[LibraryAPI] Unpublish error:', error);
        return { success: false, error: 'Network error' };
    }
}

/**
 * Toggle favorite status
 */
export async function toggleFavoriteApi(id: string): Promise<{ success: boolean; favorite?: boolean; error?: string }> {
    try {
        const res = await fetch(`${API_BASE}/${id}/toggle-favorite`, {
            method: 'POST',
        });

        const json: ApiResponse<{ favorite: boolean }> = await res.json();
        return {
            success: json.success,
            favorite: (json as { favorite?: boolean }).favorite,
            error: json.error,
        };
    } catch (error) {
        console.error('[LibraryAPI] Toggle favorite error:', error);
        return { success: false, error: 'Network error' };
    }
}

/**
 * Get a published module by share code (public, no auth required)
 */
export async function getPublishedModule(shareCode: string): Promise<LibraryModule | null> {
    try {
        const res = await fetch(`${API_BASE}/public/${shareCode}`);
        if (!res.ok) {
            return null;
        }

        const json: ApiResponse<LibraryModuleApi> = await res.json();
        if (!json.success || !json.data) {
            return null;
        }

        return apiModuleToLibraryModule(json.data);
    } catch (error) {
        console.error('[LibraryAPI] Get published error:', error);
        return null;
    }
}

// ============================================================================
// Conversion helpers
// ============================================================================

function apiModuleToLibraryModule(api: LibraryModuleApi): LibraryModule {
    const config = api.config || {};
    // Extract fullConfig if stored, otherwise use config as fullConfig
    const fullConfig = (config.fullConfig as Record<string, unknown>) || config;

    return {
        id: api.id,
        name: api.name,
        unitType: api.unitType,
        source: 'custom',
        description: api.description,
        widthMm: (config.widthMm as number) || 0,
        heightMm: (config.heightMm as number) || 0,
        depthMm: (config.depthMm as number) || 0,
        shutterCount: (config.shutterCount as number) || undefined,
        loftEnabled: (config.loftEnabled as boolean) || undefined,
        loftHeightMm: (config.loftHeightMm as number) || undefined,
        sectionCount: (config.sectionCount as number) || undefined,
        carcassMaterial: (config.carcassMaterial as string) || undefined,
        shutterMaterial: (config.shutterMaterial as string) || undefined,
        shutterLaminateCode: (config.shutterLaminateCode as string) || undefined,
        sections: config.sections as LibraryModule['sections'],
        carcassThicknessMm: (config.carcassThicknessMm as number) || undefined,
        fullConfig, // Store full config for exact reproduction
        tags: api.tags || [],
        createdAt: api.createdAt || new Date().toISOString(),
        updatedAt: api.updatedAt || new Date().toISOString(),
        category: api.category as LibraryModule['category'],
        isTemplate: (config.isTemplate as boolean) ?? false,
        favorite: api.favorite,
    };
}

function libraryModuleToApiPayload(module: LibraryModule): Record<string, unknown> {
    return {
        id: module.id,
        name: module.name,
        unitType: module.unitType,
        description: module.description,
        category: module.category,
        tags: module.tags,
        favorite: module.favorite,
        config: {
            widthMm: module.widthMm,
            heightMm: module.heightMm,
            depthMm: module.depthMm,
            shutterCount: module.shutterCount,
            loftEnabled: module.loftEnabled,
            loftHeightMm: module.loftHeightMm,
            sectionCount: module.sectionCount,
            carcassMaterial: module.carcassMaterial,
            shutterMaterial: module.shutterMaterial,
            shutterLaminateCode: module.shutterLaminateCode,
            sections: module.sections,
            carcassThicknessMm: module.carcassThicknessMm,
            isTemplate: module.isTemplate,
            // Store full config for exact reproduction (includes centerPostCount, etc.)
            fullConfig: module.fullConfig,
        },
    };
}

export { isApiAvailable };
