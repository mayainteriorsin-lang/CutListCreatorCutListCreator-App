import { describe, it, expect, beforeEach } from 'vitest';
import { createHomePageService } from '../homePage.service';
import type { CabinetFormMemory, ShutterFormMemory } from '../homePage.contract';

describe('HomePageService', () => {
    describe('getCabinetFormMemory', () => {
        it('should return empty memory when no data exists', () => {
            const service = createHomePageService({});
            const result = service.getCabinetFormMemory();
            expect(result).toEqual({});
        });

        it('should return stored memory values', () => {
            const service = createHomePageService({
                cabinetFormMemory: {
                    topPanelLaminateCode: 'L1',
                    bottomPanelLaminateCode: 'L2'
                }
            });
            const result = service.getCabinetFormMemory();
            expect(result.topPanelLaminateCode).toBe('L1');
            expect(result.bottomPanelLaminateCode).toBe('L2');
        });

        it('should filter out invalid laminates', () => {
            const service = createHomePageService({
                cabinetFormMemory: {
                    topPanelLaminateCode: 'VALID',
                    bottomPanelLaminateCode: 'INVALID'
                }
            });
            // Pass valid laminates (lowercase comparison)
            const result = service.getCabinetFormMemory(['valid'], []);
            expect(result.topPanelLaminateCode).toBe('VALID');
            expect(result.bottomPanelLaminateCode).toBeUndefined();
        });

        it('should filter out invalid plywood brands', () => {
            const service = createHomePageService({
                cabinetFormMemory: {
                    topPanelPlywoodBrand: 'VALID_PLY',
                    bottomPanelPlywoodBrand: 'INVALID_PLY'
                }
            });
            const result = service.getCabinetFormMemory([], ['valid_ply']);
            expect(result.topPanelPlywoodBrand).toBe('VALID_PLY');
            expect(result.bottomPanelPlywoodBrand).toBeUndefined();
        });
    });

    describe('saveCabinetFormMemory', () => {
        it('should persist cabinet form memory', () => {
            const service = createHomePageService({});

            const values: CabinetFormMemory = {
                topPanelLaminateCode: 'NEW_L1',
                bottomPanelLaminateCode: 'NEW_L2'
            } as CabinetFormMemory;

            service.saveCabinetFormMemory(values);

            const result = service.getCabinetFormMemory();
            expect(result.topPanelLaminateCode).toBe('NEW_L1');
        });
    });

    describe('getShutterFormMemory', () => {
        it('should return stored shutter memory', () => {
            const service = createHomePageService({
                shutterFormMemory: {
                    shutterLaminateCode: 'SL1'
                }
            });
            const result = service.getShutterFormMemory();
            expect(result.shutterLaminateCode).toBe('SL1');
        });

        it('should filter invalid shutter laminates', () => {
            const service = createHomePageService({
                shutterFormMemory: {
                    shutterLaminateCode: 'INVALID'
                }
            });
            const result = service.getShutterFormMemory(['valid'], []);
            expect(result.shutterLaminateCode).toBeUndefined();
        });
    });

    describe('saveShutterFormMemory', () => {
        it('should persist shutter form memory', () => {
            const service = createHomePageService({});

            const values: ShutterFormMemory = {
                shutterLaminateCode: 'NEW_SL'
            } as ShutterFormMemory;

            service.saveShutterFormMemory(values);

            const result = service.getShutterFormMemory();
            expect(result.shutterLaminateCode).toBe('NEW_SL');
        });
    });

    describe('cleanOrphanedMaterials', () => {
        it('should remove orphaned laminates from both cabinet and shutter memory', () => {
            const service = createHomePageService({
                cabinetFormMemory: {
                    topPanelLaminateCode: 'ORPHAN_L1',
                    bottomPanelLaminateCode: 'VALID_L'
                },
                shutterFormMemory: {
                    shutterLaminateCode: 'ORPHAN_L2'
                }
            });

            const cleaned = service.cleanOrphanedMaterials(['valid_l'], ['valid_ply']);

            // Should have removed ORPHAN_L1 and ORPHAN_L2
            expect(cleaned).toBe(2);

            // Verify cabinet memory updated
            const cabinetMem = service.getCabinetFormMemory();
            expect(cabinetMem.topPanelLaminateCode).toBeUndefined();
            expect(cabinetMem.bottomPanelLaminateCode).toBe('VALID_L');

            // Verify shutter memory updated
            const shutterMem = service.getShutterFormMemory();
            expect(shutterMem.shutterLaminateCode).toBeUndefined();
        });

        it('should return 0 when no orphans exist', () => {
            const service = createHomePageService({
                cabinetFormMemory: {
                    topPanelLaminateCode: 'valid'
                }
            });

            const cleaned = service.cleanOrphanedMaterials(['valid'], ['valid']);
            expect(cleaned).toBe(0);
        });
    });

    describe('getLaminateTracking', () => {
        it('should return empty set when no tracking exists', () => {
            const service = createHomePageService({});
            const result = service.getLaminateTracking();
            expect(result.size).toBe(0);
        });

        it('should return stored tracking set', () => {
            const service = createHomePageService({
                laminateTracking: ['L1', 'L2']
            });
            const result = service.getLaminateTracking();
            expect(result.has('L1')).toBe(true);
            expect(result.has('L2')).toBe(true);
        });
    });

    describe('saveLaminateTracking', () => {
        it('should persist tracking set', () => {
            const service = createHomePageService({});

            service.saveLaminateTracking(new Set(['A', 'B']));

            const result = service.getLaminateTracking();
            expect(result.has('A')).toBe(true);
            expect(result.has('B')).toBe(true);
        });
    });

    describe('clearLaminateTracking', () => {
        it('should clear all tracking', () => {
            const service = createHomePageService({
                laminateTracking: ['L1', 'L2']
            });

            service.clearLaminateTracking();

            const result = service.getLaminateTracking();
            expect(result.size).toBe(0);
        });
    });

    describe('getPromptedClients', () => {
        it('should return stored prompted clients', () => {
            const service = createHomePageService({
                promptedClients: ['client1', 'client2']
            });
            const result = service.getPromptedClients();
            expect(result.has('client1')).toBe(true);
        });
    });

    describe('getSpreadsheetSnapshot', () => {
        it('should return stored snapshot', () => {
            const snapshot = { rows: [[1, 2]], columns: ['A', 'B'] };
            const service = createHomePageService({
                spreadsheet: snapshot as any
            });
            const result = service.getSpreadsheetSnapshot();
            expect(result).toEqual(snapshot);
        });
    });
});
