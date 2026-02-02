import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    readCabinetFormMemory,
    writeCabinetFormMemory,
    readShutterFormMemory,
    writeShutterFormMemory,
    readLaminateTracking,
    writeLaminateTracking,
    clearLaminateTracking,
    readPromptedClients,
    readSpreadsheetSnapshot
} from '../homePage.repository';

// Create a mock localStorage
function createMockStorage(): Storage {
    const store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
        get length() { return Object.keys(store).length; },
        key: vi.fn((index: number) => Object.keys(store)[index] ?? null)
    };
}

describe('homePage.repository', () => {
    describe('readCabinetFormMemory', () => {
        it('should return null when storage is empty', () => {
            const storage = createMockStorage();
            const result = readCabinetFormMemory(storage);
            expect(result).toBeNull();
        });

        it('should return null when storage is null (SSR)', () => {
            const result = readCabinetFormMemory(null);
            expect(result).toBeNull();
        });

        it('should parse valid JSON object', () => {
            const storage = createMockStorage();
            storage.setItem('cabinetFormMemory_v1', JSON.stringify({ topPanelLaminateCode: 'L1' }));

            const result = readCabinetFormMemory(storage);
            expect(result).toEqual({ topPanelLaminateCode: 'L1' });
        });

        it('should return null for corrupted JSON', () => {
            const storage = createMockStorage();
            storage.setItem('cabinetFormMemory_v1', '{ broken json }');

            const result = readCabinetFormMemory(storage);
            expect(result).toBeNull();
        });

        it('should return null for non-object JSON (e.g., array)', () => {
            const storage = createMockStorage();
            storage.setItem('cabinetFormMemory_v1', JSON.stringify(['not', 'an', 'object']));

            const result = readCabinetFormMemory(storage);
            expect(result).toBeNull();
        });
    });

    describe('writeCabinetFormMemory', () => {
        it('should serialize and store values', () => {
            const storage = createMockStorage();
            const values = { topPanelLaminateCode: 'L1' } as any;

            writeCabinetFormMemory(values, storage);

            expect(storage.setItem).toHaveBeenCalledWith(
                'cabinetFormMemory_v1',
                JSON.stringify(values)
            );
        });

        it('should not throw when storage is null', () => {
            expect(() => writeCabinetFormMemory({} as any, null)).not.toThrow();
        });
    });

    describe('readShutterFormMemory', () => {
        it('should parse valid shutter memory', () => {
            const storage = createMockStorage();
            storage.setItem('shutterFormMemory_v1', JSON.stringify({ shutterLaminateCode: 'SL' }));

            const result = readShutterFormMemory(storage);
            expect(result).toEqual({ shutterLaminateCode: 'SL' });
        });
    });

    describe('writeShutterFormMemory', () => {
        it('should serialize and store shutter values', () => {
            const storage = createMockStorage();
            const values = { shutterLaminateCode: 'SL' } as any;

            writeShutterFormMemory(values, storage);

            expect(storage.setItem).toHaveBeenCalledWith(
                'shutterFormMemory_v1',
                JSON.stringify(values)
            );
        });
    });

    describe('readLaminateTracking', () => {
        it('should return empty array when no tracking exists', () => {
            const storage = createMockStorage();
            const result = readLaminateTracking(storage);
            expect(result).toEqual([]);
        });

        it('should parse valid string array', () => {
            const storage = createMockStorage();
            storage.setItem('userSelectedLaminates_v1', JSON.stringify(['L1', 'L2']));

            const result = readLaminateTracking(storage);
            expect(result).toEqual(['L1', 'L2']);
        });

        it('should filter out non-string values', () => {
            const storage = createMockStorage();
            storage.setItem('userSelectedLaminates_v1', JSON.stringify(['L1', 123, null, 'L2']));

            const result = readLaminateTracking(storage);
            expect(result).toEqual(['L1', 'L2']);
        });

        it('should trim whitespace and filter empty strings', () => {
            const storage = createMockStorage();
            storage.setItem('userSelectedLaminates_v1', JSON.stringify(['  L1  ', '', '   ', 'L2']));

            const result = readLaminateTracking(storage);
            expect(result).toEqual(['L1', 'L2']);
        });
    });

    describe('writeLaminateTracking', () => {
        it('should serialize and store tracking array', () => {
            const storage = createMockStorage();

            writeLaminateTracking(['A', 'B'], storage);

            expect(storage.setItem).toHaveBeenCalledWith(
                'userSelectedLaminates_v1',
                JSON.stringify(['A', 'B'])
            );
        });
    });

    describe('clearLaminateTracking', () => {
        it('should remove tracking key', () => {
            const storage = createMockStorage();

            clearLaminateTracking(storage);

            expect(storage.removeItem).toHaveBeenCalledWith('userSelectedLaminates_v1');
        });
    });

    describe('readPromptedClients', () => {
        it('should parse client list', () => {
            const storage = createMockStorage();
            storage.setItem('promptedClients', JSON.stringify(['client1', 'client2']));

            const result = readPromptedClients(storage);
            expect(result).toEqual(['client1', 'client2']);
        });
    });

    describe('readSpreadsheetSnapshot', () => {
        it('should return empty snapshot when no data', () => {
            const storage = createMockStorage();
            const result = readSpreadsheetSnapshot(storage);
            expect(result).toEqual({ hasRows: false, rowCount: 0 });
        });

        it('should calculate row count from stored array', () => {
            const storage = createMockStorage();
            storage.setItem('cutlist_spreadsheet_v1', JSON.stringify([[1, 2], [3, 4], [5, 6]]));

            const result = readSpreadsheetSnapshot(storage);
            expect(result.hasRows).toBe(true);
            expect(result.rowCount).toBe(3);
        });

        it('should return empty snapshot for non-array data', () => {
            const storage = createMockStorage();
            storage.setItem('cutlist_spreadsheet_v1', JSON.stringify({ not: 'array' }));

            const result = readSpreadsheetSnapshot(storage);
            expect(result).toEqual({ hasRows: false, rowCount: 0 });
        });
    });
});
