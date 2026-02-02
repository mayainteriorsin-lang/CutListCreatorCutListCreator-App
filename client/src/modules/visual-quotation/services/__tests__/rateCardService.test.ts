/**
 * RateCardService Tests
 *
 * Tests the rate card service layer which handles:
 * - CRUD operations (create, read, update, delete)
 * - Default rate card management
 * - Duplicate functionality
 * - Search and filter operations
 * - Rate calculations and previews
 * - Import/Export functionality
 * - Validation
 *
 * CRITICAL: Tests the business logic layer for Rate Card management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getAllRateCards,
    getRateCardById,
    createRateCard,
    updateRateCard,
    deleteRateCard,
    duplicateRateCard,
    getDefaultRateCard,
    setDefaultRateCard,
    clearDefaultRateCard,
    searchRateCards,
    filterByUnitType,
    getFilteredRateCards,
    getRateCardPreview,
    getConfigRatePreview,
    exportRateCard,
    importRateCard,
    exportAllRateCards,
    rateCardService,
} from '../rateCardService';
import { useRateCardStore } from '../../store/rateCardStore';
import type { RateCard, CreateRateCardParams, UpdateRateCardParams } from '../../types/rateCard';
import type { WardrobeConfig } from '../../types/pricing';

// Helper to create mock WardrobeConfig
function createMockConfig(): WardrobeConfig {
    return {
        carcass: {
            material: 'plywood',
            thickness: '18mm',
            edgeBand: 'pvc_2mm',
            materialPrice: 100,
            thicknessPrice: 50,
            edgeBandPrice: 30,
        },
        shutter: {
            material: 'plywood',
            finish: 'laminate',
            handleType: 'profile',
            materialPrice: 200,
            finishPrice: 150,
            handlePrice: 50,
        },
        addOnPricing: [],
    } as WardrobeConfig;
}

describe('RateCardService', () => {
    beforeEach(() => {
        // Reset store to initial state
        useRateCardStore.setState({
            cards: [],
            defaultCardId: null,
            isLoaded: true,
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // =========================================================================
    // getAllRateCards Tests
    // =========================================================================

    describe('getAllRateCards', () => {
        it('should return all rate cards', () => {
            const mockCards: RateCard[] = [
                {
                    id: 'rc1',
                    name: 'Standard Wardrobe',
                    unitType: 'wardrobe',
                    config: createMockConfig(),
                    isDefault: false,
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-01T00:00:00Z',
                },
                {
                    id: 'rc2',
                    name: 'Premium Kitchen',
                    unitType: 'kitchen',
                    config: createMockConfig(),
                    isDefault: true,
                    createdAt: '2024-01-02T00:00:00Z',
                    updatedAt: '2024-01-02T00:00:00Z',
                },
            ];

            useRateCardStore.setState({ cards: mockCards });

            const result = getAllRateCards();

            expect(result).toHaveLength(2);
            expect(result).toEqual(mockCards);
        });

        it('should return empty array when no cards exist', () => {
            const result = getAllRateCards();

            expect(result).toEqual([]);
        });
    });

    // =========================================================================
    // getRateCardById Tests
    // =========================================================================

    describe('getRateCardById', () => {
        it('should return rate card by id', () => {
            const mockCard: RateCard = {
                id: 'rc1',
                name: 'Standard Wardrobe',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            useRateCardStore.setState({ cards: [mockCard] });

            const result = getRateCardById('rc1');

            expect(result).toEqual(mockCard);
        });

        it('should return null for non-existent id', () => {
            const result = getRateCardById('non-existent');

            expect(result).toBeNull();
        });
    });

    // =========================================================================
    // createRateCard Tests
    // =========================================================================

    describe('createRateCard', () => {
        it('should create a new rate card', () => {
            const params: CreateRateCardParams = {
                name: 'Test Card',
                description: 'Test description',
                unitType: 'wardrobe',
                config: createMockConfig(),
            };

            const result = createRateCard(params);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data!.name).toBe('Test Card');
            expect(result.data!.description).toBe('Test description');
            expect(result.data!.unitType).toBe('wardrobe');
            expect(result.data!.id).toBeDefined();
            expect(result.data!.createdAt).toBeDefined();
            expect(result.data!.updatedAt).toBeDefined();
        });

        it('should fail with empty name', () => {
            const params: CreateRateCardParams = {
                name: '',
                unitType: 'wardrobe',
                config: createMockConfig(),
            };

            const result = createRateCard(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('required');
        });

        it('should fail with name less than 2 characters', () => {
            const params: CreateRateCardParams = {
                name: 'A',
                unitType: 'wardrobe',
                config: createMockConfig(),
            };

            const result = createRateCard(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('at least 2 characters');
        });

        it('should fail with name more than 50 characters', () => {
            const params: CreateRateCardParams = {
                name: 'A'.repeat(51),
                unitType: 'wardrobe',
                config: createMockConfig(),
            };

            const result = createRateCard(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('less than 50 characters');
        });

        it('should fail with duplicate name', () => {
            const existingCard: RateCard = {
                id: 'rc1',
                name: 'Existing Card',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            useRateCardStore.setState({ cards: [existingCard] });

            const params: CreateRateCardParams = {
                name: 'Existing Card',
                unitType: 'kitchen',
                config: createMockConfig(),
            };

            const result = createRateCard(params);

            expect(result.success).toBe(false);
            expect(result.error).toContain('already exists');
        });

        it('should set as default when requested', () => {
            const params: CreateRateCardParams = {
                name: 'Default Card',
                unitType: 'wardrobe',
                config: createMockConfig(),
                setAsDefault: true,
            };

            const result = createRateCard(params);

            expect(result.success).toBe(true);
            expect(result.data!.isDefault).toBe(true);
            expect(useRateCardStore.getState().defaultCardId).toBe(result.data!.id);
        });

        it('should trim whitespace from name', () => {
            const params: CreateRateCardParams = {
                name: '  Test Card  ',
                unitType: 'wardrobe',
                config: createMockConfig(),
            };

            const result = createRateCard(params);

            expect(result.success).toBe(true);
            expect(result.data!.name).toBe('Test Card');
        });

        it('should add card to store', () => {
            const params: CreateRateCardParams = {
                name: 'New Card',
                unitType: 'wardrobe',
                config: createMockConfig(),
            };

            createRateCard(params);

            const cards = useRateCardStore.getState().cards;
            expect(cards).toHaveLength(1);
            expect(cards[0].name).toBe('New Card');
        });
    });

    // =========================================================================
    // updateRateCard Tests
    // =========================================================================

    describe('updateRateCard', () => {
        it('should update rate card name', () => {
            const existingCard: RateCard = {
                id: 'rc1',
                name: 'Old Name',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            useRateCardStore.setState({ cards: [existingCard] });

            const result = updateRateCard('rc1', { name: 'New Name' });

            expect(result.success).toBe(true);
            expect(result.data!.name).toBe('New Name');
        });

        it('should update rate card description', () => {
            const existingCard: RateCard = {
                id: 'rc1',
                name: 'Test Card',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            useRateCardStore.setState({ cards: [existingCard] });

            const result = updateRateCard('rc1', { description: 'New description' });

            expect(result.success).toBe(true);
            expect(result.data!.description).toBe('New description');
        });

        it('should update rate card unit type', () => {
            const existingCard: RateCard = {
                id: 'rc1',
                name: 'Test Card',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            useRateCardStore.setState({ cards: [existingCard] });

            const result = updateRateCard('rc1', { unitType: 'kitchen' });

            expect(result.success).toBe(true);
            expect(result.data!.unitType).toBe('kitchen');
        });

        it('should update rate card config', () => {
            const existingCard: RateCard = {
                id: 'rc1',
                name: 'Test Card',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            useRateCardStore.setState({ cards: [existingCard] });

            const configUpdate = {
                carcass: {
                    material: 'mdf' as const,
                },
            };

            const result = updateRateCard('rc1', { config: configUpdate });

            expect(result.success).toBe(true);
            expect(result.data!.config.carcass.material).toBe('mdf');
        });

        it('should fail for non-existent card', () => {
            const result = updateRateCard('non-existent', { name: 'New Name' });

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });

        it('should fail with duplicate name', () => {
            const card1: RateCard = {
                id: 'rc1',
                name: 'Card 1',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            const card2: RateCard = {
                id: 'rc2',
                name: 'Card 2',
                unitType: 'kitchen',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-02T00:00:00Z',
                updatedAt: '2024-01-02T00:00:00Z',
            };

            useRateCardStore.setState({ cards: [card1, card2] });

            const result = updateRateCard('rc2', { name: 'Card 1' });

            expect(result.success).toBe(false);
            expect(result.error).toContain('already exists');
        });

        it('should set as default', () => {
            const existingCard: RateCard = {
                id: 'rc1',
                name: 'Test Card',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            useRateCardStore.setState({ cards: [existingCard] });

            const result = updateRateCard('rc1', { isDefault: true });

            expect(result.success).toBe(true);
            expect(useRateCardStore.getState().defaultCardId).toBe('rc1');
        });

        it('should clear default status', () => {
            const existingCard: RateCard = {
                id: 'rc1',
                name: 'Test Card',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: true,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            useRateCardStore.setState({ cards: [existingCard], defaultCardId: 'rc1' });

            const result = updateRateCard('rc1', { isDefault: false });

            expect(result.success).toBe(true);
            expect(useRateCardStore.getState().defaultCardId).toBeNull();
        });
    });

    // =========================================================================
    // deleteRateCard Tests
    // =========================================================================

    describe('deleteRateCard', () => {
        it('should delete rate card', () => {
            const card: RateCard = {
                id: 'rc1',
                name: 'Test Card',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            const card2: RateCard = {
                id: 'rc2',
                name: 'Test Card 2',
                unitType: 'kitchen',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-02T00:00:00Z',
                updatedAt: '2024-01-02T00:00:00Z',
            };

            useRateCardStore.setState({ cards: [card, card2] });

            const result = deleteRateCard('rc1');

            expect(result.success).toBe(true);
            expect(useRateCardStore.getState().cards).toHaveLength(1);
            expect(useRateCardStore.getState().cards[0].id).toBe('rc2');
        });

        it('should fail for non-existent card', () => {
            const result = deleteRateCard('non-existent');

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });

        it('should fail when deleting last card', () => {
            const card: RateCard = {
                id: 'rc1',
                name: 'Last Card',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            useRateCardStore.setState({ cards: [card] });

            const result = deleteRateCard('rc1');

            expect(result.success).toBe(false);
            expect(result.error).toContain('last rate card');
        });
    });

    // =========================================================================
    // duplicateRateCard Tests
    // =========================================================================

    describe('duplicateRateCard', () => {
        it('should duplicate rate card with default name', () => {
            const sourceCard: RateCard = {
                id: 'rc1',
                name: 'Original Card',
                description: 'Original description',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            useRateCardStore.setState({ cards: [sourceCard] });

            const result = duplicateRateCard('rc1');

            expect(result.success).toBe(true);
            expect(result.data!.name).toBe('Original Card (Copy)');
            expect(result.data!.description).toBe('Original description');
            expect(result.data!.unitType).toBe('wardrobe');
            expect(result.data!.id).not.toBe('rc1');
            expect(result.data!.isDefault).toBe(false);
        });

        it('should duplicate with custom name', () => {
            const sourceCard: RateCard = {
                id: 'rc1',
                name: 'Original Card',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            useRateCardStore.setState({ cards: [sourceCard] });

            const result = duplicateRateCard('rc1', 'Custom Name');

            expect(result.success).toBe(true);
            expect(result.data!.name).toBe('Custom Name');
        });

        it('should handle duplicate copy names', () => {
            const sourceCard: RateCard = {
                id: 'rc1',
                name: 'Original Card',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            const existingCopy: RateCard = {
                id: 'rc2',
                name: 'Original Card (Copy)',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-02T00:00:00Z',
                updatedAt: '2024-01-02T00:00:00Z',
            };

            useRateCardStore.setState({ cards: [sourceCard, existingCopy] });

            const result = duplicateRateCard('rc1');

            expect(result.success).toBe(true);
            expect(result.data!.name).toBe('Original Card (Copy 2)');
        });

        it('should fail for non-existent card', () => {
            const result = duplicateRateCard('non-existent');

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });

    // =========================================================================
    // Default Management Tests
    // =========================================================================

    describe('getDefaultRateCard', () => {
        it('should return default rate card', () => {
            const defaultCard: RateCard = {
                id: 'rc1',
                name: 'Default Card',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: true,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            useRateCardStore.setState({ cards: [defaultCard], defaultCardId: 'rc1' });

            const result = getDefaultRateCard();

            expect(result).toEqual(defaultCard);
        });

        it('should return null when no default set', () => {
            const result = getDefaultRateCard();

            expect(result).toBeNull();
        });
    });

    describe('setDefaultRateCard', () => {
        it('should set default rate card', () => {
            const card: RateCard = {
                id: 'rc1',
                name: 'Test Card',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            useRateCardStore.setState({ cards: [card] });

            const result = setDefaultRateCard('rc1');

            expect(result.success).toBe(true);
            expect(useRateCardStore.getState().defaultCardId).toBe('rc1');
        });

        it('should fail for non-existent card', () => {
            const result = setDefaultRateCard('non-existent');

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });

    describe('clearDefaultRateCard', () => {
        it('should clear default rate card', () => {
            useRateCardStore.setState({ defaultCardId: 'rc1' });

            const result = clearDefaultRateCard();

            expect(result.success).toBe(true);
            expect(useRateCardStore.getState().defaultCardId).toBeNull();
        });
    });

    // =========================================================================
    // Search & Filter Tests
    // =========================================================================

    describe('searchRateCards', () => {
        beforeEach(() => {
            const cards: RateCard[] = [
                {
                    id: 'rc1',
                    name: 'Standard Wardrobe',
                    description: 'Basic plywood wardrobe',
                    unitType: 'wardrobe',
                    config: createMockConfig(),
                    isDefault: false,
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-01T00:00:00Z',
                },
                {
                    id: 'rc2',
                    name: 'Premium Kitchen',
                    description: 'High-end kitchen cabinets',
                    unitType: 'kitchen',
                    config: createMockConfig(),
                    isDefault: false,
                    createdAt: '2024-01-02T00:00:00Z',
                    updatedAt: '2024-01-02T00:00:00Z',
                },
                {
                    id: 'rc3',
                    name: 'Budget Wardrobe',
                    description: 'Particle board wardrobe',
                    unitType: 'wardrobe',
                    config: createMockConfig(),
                    isDefault: false,
                    createdAt: '2024-01-03T00:00:00Z',
                    updatedAt: '2024-01-03T00:00:00Z',
                },
            ];

            useRateCardStore.setState({ cards });
        });

        it('should search by name', () => {
            const result = searchRateCards('wardrobe');

            expect(result).toHaveLength(2);
            expect(result.map(c => c.id)).toEqual(['rc1', 'rc3']);
        });

        it('should search by description', () => {
            const result = searchRateCards('plywood');

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('rc1');
        });

        it('should be case insensitive', () => {
            const result = searchRateCards('KITCHEN');

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('rc2');
        });

        it('should return all cards for empty query', () => {
            const result = searchRateCards('');

            expect(result).toHaveLength(3);
        });
    });

    describe('filterByUnitType', () => {
        beforeEach(() => {
            const cards: RateCard[] = [
                {
                    id: 'rc1',
                    name: 'Wardrobe 1',
                    unitType: 'wardrobe',
                    config: createMockConfig(),
                    isDefault: false,
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-01T00:00:00Z',
                },
                {
                    id: 'rc2',
                    name: 'Kitchen 1',
                    unitType: 'kitchen',
                    config: createMockConfig(),
                    isDefault: false,
                    createdAt: '2024-01-02T00:00:00Z',
                    updatedAt: '2024-01-02T00:00:00Z',
                },
                {
                    id: 'rc3',
                    name: 'Universal',
                    unitType: 'all',
                    config: createMockConfig(),
                    isDefault: false,
                    createdAt: '2024-01-03T00:00:00Z',
                    updatedAt: '2024-01-03T00:00:00Z',
                },
            ];

            useRateCardStore.setState({ cards });
        });

        it('should filter by unit type', () => {
            const result = filterByUnitType('wardrobe');

            expect(result).toHaveLength(2); // wardrobe + all
            expect(result.map(c => c.id)).toContain('rc1');
            expect(result.map(c => c.id)).toContain('rc3');
        });

        it('should include "all" type in results', () => {
            const result = filterByUnitType('kitchen');

            expect(result).toHaveLength(2); // kitchen + all
            expect(result.map(c => c.id)).toContain('rc2');
            expect(result.map(c => c.id)).toContain('rc3');
        });

        it('should return all cards for null type', () => {
            const result = filterByUnitType(null);

            expect(result).toHaveLength(3);
        });
    });

    // =========================================================================
    // Rate Calculations Tests
    // =========================================================================

    describe('getRateCardPreview', () => {
        it('should calculate rate preview', () => {
            const card: RateCard = {
                id: 'rc1',
                name: 'Test Card',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            const preview = getRateCardPreview(card);

            expect(preview.cardId).toBe('rc1');
            expect(preview.cardName).toBe('Test Card');
            expect(preview.carcassRate).toBeDefined();
            expect(preview.shutterRate).toBeDefined();
            expect(preview.loftRate).toBe(preview.carcassRate + preview.shutterRate);
            expect(preview.combinedRate).toBe(preview.loftRate);
        });
    });

    describe('getConfigRatePreview', () => {
        it('should calculate rate preview from config', () => {
            const config = createMockConfig();

            const preview = getConfigRatePreview(config);

            expect(preview.carcassRate).toBeDefined();
            expect(preview.shutterRate).toBeDefined();
            expect(preview.loftRate).toBe(preview.carcassRate + preview.shutterRate);
        });
    });

    // =========================================================================
    // Import/Export Tests
    // =========================================================================

    describe('exportRateCard', () => {
        it('should export rate card as JSON', () => {
            const card: RateCard = {
                id: 'rc1',
                name: 'Test Card',
                description: 'Test description',
                unitType: 'wardrobe',
                config: createMockConfig(),
                isDefault: false,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            useRateCardStore.setState({ cards: [card] });

            const result = exportRateCard('rc1');

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();

            const exported = JSON.parse(result.data!);
            expect(exported.name).toBe('Test Card');
            expect(exported.description).toBe('Test description');
            expect(exported.unitType).toBe('wardrobe');
            expect(exported.config).toBeDefined();
            expect(exported.id).toBeUndefined(); // Should not include ID
            expect(exported.createdAt).toBeUndefined(); // Should not include timestamps
        });

        it('should fail for non-existent card', () => {
            const result = exportRateCard('non-existent');

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });

    describe('importRateCard', () => {
        it('should import rate card from JSON', () => {
            const exportData = {
                name: 'Imported Card',
                description: 'Imported description',
                unitType: 'wardrobe',
                config: createMockConfig(),
            };

            const result = importRateCard(JSON.stringify(exportData));

            expect(result.success).toBe(true);
            expect(result.data!.name).toBe('Imported Card');
            expect(result.data!.description).toBe('Imported description');
            expect(result.data!.unitType).toBe('wardrobe');
        });

        it('should fail with invalid JSON', () => {
            const result = importRateCard('invalid-json{');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid JSON');
        });

        it('should fail with missing required fields', () => {
            const invalidData = {
                description: 'Missing name and config',
            };

            const result = importRateCard(JSON.stringify(invalidData));

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid rate card data');
        });

        it('should use default unit type if missing', () => {
            const exportData = {
                name: 'Imported Card',
                config: createMockConfig(),
            };

            const result = importRateCard(JSON.stringify(exportData));

            expect(result.success).toBe(true);
            expect(result.data!.unitType).toBe('all');
        });
    });

    describe('exportAllRateCards', () => {
        it('should export all rate cards', () => {
            const cards: RateCard[] = [
                {
                    id: 'rc1',
                    name: 'Card 1',
                    unitType: 'wardrobe',
                    config: createMockConfig(),
                    isDefault: false,
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-01T00:00:00Z',
                },
                {
                    id: 'rc2',
                    name: 'Card 2',
                    unitType: 'kitchen',
                    config: createMockConfig(),
                    isDefault: false,
                    createdAt: '2024-01-02T00:00:00Z',
                    updatedAt: '2024-01-02T00:00:00Z',
                },
            ];

            useRateCardStore.setState({ cards });

            const result = exportAllRateCards();
            const exported = JSON.parse(result);

            expect(exported).toHaveLength(2);
            expect(exported[0].name).toBe('Card 1');
            expect(exported[1].name).toBe('Card 2');
        });
    });

    // =========================================================================
    // Service Object Export Tests
    // =========================================================================

    describe('rateCardService export', () => {
        it('should export all CRUD methods', () => {
            expect(typeof rateCardService.getAllRateCards).toBe('function');
            expect(typeof rateCardService.getRateCardById).toBe('function');
            expect(typeof rateCardService.createRateCard).toBe('function');
            expect(typeof rateCardService.updateRateCard).toBe('function');
            expect(typeof rateCardService.deleteRateCard).toBe('function');
            expect(typeof rateCardService.duplicateRateCard).toBe('function');
        });

        it('should export all default management methods', () => {
            expect(typeof rateCardService.getDefaultRateCard).toBe('function');
            expect(typeof rateCardService.setDefaultRateCard).toBe('function');
            expect(typeof rateCardService.clearDefaultRateCard).toBe('function');
        });

        it('should export all search & filter methods', () => {
            expect(typeof rateCardService.searchRateCards).toBe('function');
            expect(typeof rateCardService.filterByUnitType).toBe('function');
            expect(typeof rateCardService.getFilteredRateCards).toBe('function');
        });

        it('should export all rate calculation methods', () => {
            expect(typeof rateCardService.getRateCardPreview).toBe('function');
            expect(typeof rateCardService.getConfigRatePreview).toBe('function');
        });

        it('should export all import/export methods', () => {
            expect(typeof rateCardService.exportRateCard).toBe('function');
            expect(typeof rateCardService.importRateCard).toBe('function');
            expect(typeof rateCardService.exportAllRateCards).toBe('function');
        });
    });
});
