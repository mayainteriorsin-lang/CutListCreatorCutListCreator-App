/**
 * StorageService Tests
 *
 * Tests the storage service layer which handles:
 * - LocalStorage abstraction
 * - String and JSON persistence
 * - Production-specific storage helpers
 * - Error handling for storage failures
 *
 * CRITICAL: Tests localStorage operations with proper mocking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getStoredString,
    setStoredString,
    getStoredJson,
    setStoredJson,
    removeStored,
    clearProductionStorage,
    loadSavedMaterials,
    saveMaterials,
    loadPanelOverrides,
    savePanelOverrides,
    loadGaddiSettings,
    saveGaddiSettings,
    loadDeletedPanels,
    saveDeletedPanels,
    loadUnitGapSettings,
    saveUnitGapSettings,
    PRODUCTION_STORAGE_KEYS,
    type ProductionMaterials,
    type PanelOverrides,
    type GaddiSettings,
    type UnitGapSettings,
} from '../storageService';

// Mock localStorage
const mockStorage: Record<string, string> = {};

const localStorageMock = {
    getItem: vi.fn((key: string) => mockStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
    }),
    clear: vi.fn(() => {
        Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    }),
    get length() {
        return Object.keys(mockStorage).length;
    },
    key: vi.fn((index: number) => Object.keys(mockStorage)[index] || null),
};

// Setup global localStorage mock
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

describe('StorageService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear mock storage
        Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // =========================================================================
    // String Storage Tests
    // =========================================================================

    describe('getStoredString', () => {
        it('should return stored string value', () => {
            mockStorage['test-key'] = 'test-value';

            const result = getStoredString('test-key');

            expect(result).toBe('test-value');
            expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key');
        });

        it('should return fallback when key does not exist', () => {
            const result = getStoredString('non-existent', 'fallback');

            expect(result).toBe('fallback');
        });

        it('should return empty string as default fallback', () => {
            const result = getStoredString('non-existent');

            expect(result).toBe('');
        });

        it('should handle localStorage errors gracefully', () => {
            localStorageMock.getItem.mockImplementationOnce(() => {
                throw new Error('Storage error');
            });

            const result = getStoredString('test-key', 'fallback');

            expect(result).toBe('fallback');
        });
    });

    describe('setStoredString', () => {
        it('should store string value', () => {
            setStoredString('test-key', 'test-value');

            expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', 'test-value');
            expect(mockStorage['test-key']).toBe('test-value');
        });

        it('should not store empty string', () => {
            setStoredString('test-key', '');

            expect(localStorageMock.setItem).not.toHaveBeenCalled();
        });

        it('should handle localStorage errors gracefully', () => {
            localStorageMock.setItem.mockImplementationOnce(() => {
                throw new Error('Storage error');
            });

            expect(() => setStoredString('test-key', 'value')).not.toThrow();
        });
    });

    // =========================================================================
    // JSON Storage Tests
    // =========================================================================

    describe('getStoredJson', () => {
        it('should return parsed JSON object', () => {
            const testObj = { name: 'test', value: 123 };
            mockStorage['test-key'] = JSON.stringify(testObj);

            const result = getStoredJson('test-key', {});

            expect(result).toEqual(testObj);
        });

        it('should return fallback when key does not exist', () => {
            const fallback = { default: true };

            const result = getStoredJson('non-existent', fallback);

            expect(result).toEqual(fallback);
        });

        it('should return fallback on invalid JSON', () => {
            mockStorage['test-key'] = 'invalid-json{';
            const fallback = { default: true };

            const result = getStoredJson('test-key', fallback);

            expect(result).toEqual(fallback);
        });

        it('should handle localStorage errors gracefully', () => {
            localStorageMock.getItem.mockImplementationOnce(() => {
                throw new Error('Storage error');
            });
            const fallback = { default: true };

            const result = getStoredJson('test-key', fallback);

            expect(result).toEqual(fallback);
        });

        it('should handle complex nested objects', () => {
            const complexObj = {
                nested: {
                    array: [1, 2, 3],
                    object: { key: 'value' },
                },
            };
            mockStorage['test-key'] = JSON.stringify(complexObj);

            const result = getStoredJson('test-key', {});

            expect(result).toEqual(complexObj);
        });
    });

    describe('setStoredJson', () => {
        it('should store JSON object', () => {
            const testObj = { name: 'test', value: 123 };

            setStoredJson('test-key', testObj);

            expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(testObj));
            expect(mockStorage['test-key']).toBe(JSON.stringify(testObj));
        });

        it('should handle arrays', () => {
            const testArray = [1, 2, 3, 4, 5];

            setStoredJson('test-key', testArray);

            expect(mockStorage['test-key']).toBe(JSON.stringify(testArray));
        });

        it('should handle localStorage errors gracefully', () => {
            localStorageMock.setItem.mockImplementationOnce(() => {
                throw new Error('Storage error');
            });

            expect(() => setStoredJson('test-key', { value: 1 })).not.toThrow();
        });
    });

    // =========================================================================
    // Remove Storage Tests
    // =========================================================================

    describe('removeStored', () => {
        it('should remove item from storage', () => {
            mockStorage['test-key'] = 'test-value';

            removeStored('test-key');

            expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key');
            expect(mockStorage['test-key']).toBeUndefined();
        });

        it('should handle localStorage errors gracefully', () => {
            localStorageMock.removeItem.mockImplementationOnce(() => {
                throw new Error('Storage error');
            });

            expect(() => removeStored('test-key')).not.toThrow();
        });
    });

    // =========================================================================
    // Clear Production Storage Tests
    // =========================================================================

    describe('clearProductionStorage', () => {
        it('should clear all production storage keys', () => {
            // Set all production keys
            Object.values(PRODUCTION_STORAGE_KEYS).forEach(key => {
                mockStorage[key] = 'test-value';
            });

            clearProductionStorage();

            // Verify all keys were removed
            Object.values(PRODUCTION_STORAGE_KEYS).forEach(key => {
                expect(mockStorage[key]).toBeUndefined();
            });
        });

        it('should not affect non-production keys', () => {
            mockStorage['other-key'] = 'other-value';
            mockStorage[PRODUCTION_STORAGE_KEYS.PLYWOOD] = 'plywood-value';

            clearProductionStorage();

            expect(mockStorage['other-key']).toBe('other-value');
            expect(mockStorage[PRODUCTION_STORAGE_KEYS.PLYWOOD]).toBeUndefined();
        });
    });

    // =========================================================================
    // Production Materials Tests
    // =========================================================================

    describe('loadSavedMaterials', () => {
        it('should load saved materials from storage', () => {
            mockStorage[PRODUCTION_STORAGE_KEYS.PLYWOOD] = 'Greenply';
            mockStorage[PRODUCTION_STORAGE_KEYS.FRONT_LAMINATE] = 'L001';
            mockStorage[PRODUCTION_STORAGE_KEYS.INNER_LAMINATE] = 'L002';

            const result = loadSavedMaterials();

            expect(result).toEqual({
                plywood: 'Greenply',
                frontLaminate: 'L001',
                innerLaminate: 'L002',
            });
        });

        it('should return defaults when storage is empty', () => {
            const result = loadSavedMaterials();

            expect(result).toEqual({
                plywood: 'Century',
                frontLaminate: '',
                innerLaminate: '',
            });
        });

        it('should use provided defaults', () => {
            const defaults = {
                plywood: 'CustomPlywood',
                frontLaminate: 'CustomFront',
                innerLaminate: 'CustomInner',
            };

            const result = loadSavedMaterials(defaults);

            expect(result).toEqual(defaults);
        });

        it('should merge storage with defaults', () => {
            mockStorage[PRODUCTION_STORAGE_KEYS.PLYWOOD] = 'Greenply';
            // frontLaminate and innerLaminate not in storage

            const result = loadSavedMaterials({ frontLaminate: 'DefaultFront' });

            expect(result.plywood).toBe('Greenply');
            expect(result.frontLaminate).toBe('DefaultFront');
        });
    });

    describe('saveMaterials', () => {
        it('should save all materials to storage', () => {
            const materials: ProductionMaterials = {
                plywood: 'Greenply',
                frontLaminate: 'L001',
                innerLaminate: 'L002',
            };

            saveMaterials(materials);

            expect(mockStorage[PRODUCTION_STORAGE_KEYS.PLYWOOD]).toBe('Greenply');
            expect(mockStorage[PRODUCTION_STORAGE_KEYS.FRONT_LAMINATE]).toBe('L001');
            expect(mockStorage[PRODUCTION_STORAGE_KEYS.INNER_LAMINATE]).toBe('L002');
        });

        it('should save partial materials', () => {
            saveMaterials({ plywood: 'Greenply' });

            expect(mockStorage[PRODUCTION_STORAGE_KEYS.PLYWOOD]).toBe('Greenply');
            expect(mockStorage[PRODUCTION_STORAGE_KEYS.FRONT_LAMINATE]).toBeUndefined();
        });

        it('should update existing materials', () => {
            mockStorage[PRODUCTION_STORAGE_KEYS.PLYWOOD] = 'OldPlywood';

            saveMaterials({ plywood: 'NewPlywood' });

            expect(mockStorage[PRODUCTION_STORAGE_KEYS.PLYWOOD]).toBe('NewPlywood');
        });
    });

    // =========================================================================
    // Panel Overrides Tests
    // =========================================================================

    describe('loadPanelOverrides', () => {
        it('should load panel overrides from storage', () => {
            const overrides: PanelOverrides = {
                'panel-1': { width: 100, height: 200 },
                'panel-2': { width: 150 },
            };
            mockStorage[PRODUCTION_STORAGE_KEYS.PANEL_OVERRIDES] = JSON.stringify(overrides);

            const result = loadPanelOverrides();

            expect(result).toEqual(overrides);
        });

        it('should return empty object when no overrides exist', () => {
            const result = loadPanelOverrides();

            expect(result).toEqual({});
        });
    });

    describe('savePanelOverrides', () => {
        it('should save panel overrides to storage', () => {
            const overrides: PanelOverrides = {
                'panel-1': { width: 100, height: 200 },
                'panel-2': { width: 150 },
            };

            savePanelOverrides(overrides);

            expect(mockStorage[PRODUCTION_STORAGE_KEYS.PANEL_OVERRIDES]).toBe(JSON.stringify(overrides));
        });

        it('should overwrite existing overrides', () => {
            const oldOverrides = { 'panel-1': { width: 50 } };
            mockStorage[PRODUCTION_STORAGE_KEYS.PANEL_OVERRIDES] = JSON.stringify(oldOverrides);

            const newOverrides: PanelOverrides = { 'panel-2': { width: 100 } };
            savePanelOverrides(newOverrides);

            expect(JSON.parse(mockStorage[PRODUCTION_STORAGE_KEYS.PANEL_OVERRIDES])).toEqual(newOverrides);
        });
    });

    // =========================================================================
    // Gaddi Settings Tests
    // =========================================================================

    describe('loadGaddiSettings', () => {
        it('should load gaddi settings from storage', () => {
            const settings: GaddiSettings = {
                'unit-1': true,
                'unit-2': false,
            };
            mockStorage[PRODUCTION_STORAGE_KEYS.GADDI_SETTINGS] = JSON.stringify(settings);

            const result = loadGaddiSettings();

            expect(result).toEqual(settings);
        });

        it('should return empty object when no settings exist', () => {
            const result = loadGaddiSettings();

            expect(result).toEqual({});
        });
    });

    describe('saveGaddiSettings', () => {
        it('should save gaddi settings to storage', () => {
            const settings: GaddiSettings = {
                'unit-1': true,
                'unit-2': false,
            };

            saveGaddiSettings(settings);

            expect(mockStorage[PRODUCTION_STORAGE_KEYS.GADDI_SETTINGS]).toBe(JSON.stringify(settings));
        });
    });

    // =========================================================================
    // Deleted Panels Tests
    // =========================================================================

    describe('loadDeletedPanels', () => {
        it('should load deleted panels as Set', () => {
            const deletedArray = ['panel-1', 'panel-2', 'panel-3'];
            mockStorage[PRODUCTION_STORAGE_KEYS.DELETED_PANELS] = JSON.stringify(deletedArray);

            const result = loadDeletedPanels();

            expect(result).toBeInstanceOf(Set);
            expect(result.size).toBe(3);
            expect(result.has('panel-1')).toBe(true);
            expect(result.has('panel-2')).toBe(true);
            expect(result.has('panel-3')).toBe(true);
        });

        it('should return empty Set when no deleted panels exist', () => {
            const result = loadDeletedPanels();

            expect(result).toBeInstanceOf(Set);
            expect(result.size).toBe(0);
        });
    });

    describe('saveDeletedPanels', () => {
        it('should save Set as array to storage', () => {
            const deletedSet = new Set(['panel-1', 'panel-2', 'panel-3']);

            saveDeletedPanels(deletedSet);

            const stored = JSON.parse(mockStorage[PRODUCTION_STORAGE_KEYS.DELETED_PANELS]);
            expect(stored).toBeInstanceOf(Array);
            expect(stored).toHaveLength(3);
            expect(stored).toContain('panel-1');
            expect(stored).toContain('panel-2');
            expect(stored).toContain('panel-3');
        });

        it('should save empty Set', () => {
            const deletedSet = new Set<string>();

            saveDeletedPanels(deletedSet);

            const stored = JSON.parse(mockStorage[PRODUCTION_STORAGE_KEYS.DELETED_PANELS]);
            expect(stored).toEqual([]);
        });
    });

    // =========================================================================
    // Unit Gap Settings Tests
    // =========================================================================

    describe('loadUnitGapSettings', () => {
        it('should load unit gap settings from storage', () => {
            const settings: UnitGapSettings = {
                'unit-1': 5,
                'unit-2': 10,
            };
            mockStorage[PRODUCTION_STORAGE_KEYS.UNIT_GAP_SETTINGS] = JSON.stringify(settings);

            const result = loadUnitGapSettings();

            expect(result).toEqual(settings);
        });

        it('should return empty object when no settings exist', () => {
            const result = loadUnitGapSettings();

            expect(result).toEqual({});
        });
    });

    describe('saveUnitGapSettings', () => {
        it('should save unit gap settings to storage', () => {
            const settings: UnitGapSettings = {
                'unit-1': 5,
                'unit-2': 10,
            };

            saveUnitGapSettings(settings);

            expect(mockStorage[PRODUCTION_STORAGE_KEYS.UNIT_GAP_SETTINGS]).toBe(JSON.stringify(settings));
        });

        it('should handle zero gap values', () => {
            const settings: UnitGapSettings = {
                'unit-1': 0,
            };

            saveUnitGapSettings(settings);

            const stored = JSON.parse(mockStorage[PRODUCTION_STORAGE_KEYS.UNIT_GAP_SETTINGS]);
            expect(stored['unit-1']).toBe(0);
        });
    });

    // =========================================================================
    // Integration Tests
    // =========================================================================

    describe('Integration scenarios', () => {
        it('should handle complete production workflow', () => {
            // Save materials
            saveMaterials({
                plywood: 'Greenply',
                frontLaminate: 'L001',
                innerLaminate: 'L002',
            });

            // Save panel overrides
            savePanelOverrides({
                'panel-1': { width: 100, height: 200 },
            });

            // Save gaddi settings
            saveGaddiSettings({
                'unit-1': true,
            });

            // Save deleted panels
            saveDeletedPanels(new Set(['panel-2']));

            // Load everything back
            const materials = loadSavedMaterials();
            const overrides = loadPanelOverrides();
            const gaddi = loadGaddiSettings();
            const deleted = loadDeletedPanels();

            expect(materials.plywood).toBe('Greenply');
            expect(overrides['panel-1']).toEqual({ width: 100, height: 200 });
            expect(gaddi['unit-1']).toBe(true);
            expect(deleted.has('panel-2')).toBe(true);
        });

        it('should clear all production data', () => {
            // Set up production data
            saveMaterials({ plywood: 'Greenply' });
            savePanelOverrides({ 'panel-1': { width: 100 } });
            saveGaddiSettings({ 'unit-1': true });

            // Clear all
            clearProductionStorage();

            // Verify all cleared
            const materials = loadSavedMaterials();
            const overrides = loadPanelOverrides();
            const gaddi = loadGaddiSettings();

            expect(materials.plywood).toBe('Century'); // Default
            expect(overrides).toEqual({});
            expect(gaddi).toEqual({});
        });
    });
});
