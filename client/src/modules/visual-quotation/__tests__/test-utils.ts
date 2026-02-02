/**
 * Visual Quotation Test Utilities
 *
 * Shared mock factories, fixtures, and test helpers.
 * Import from this file to ensure consistent test data across all test files.
 */

import { vi } from 'vitest';
import type { DrawnUnit, QuotationRoom, ClientInfo, QuoteMeta, WardrobeConfig, UnitType, RoomPhoto } from '../types';
import type { ServiceResult, RoomData, PricingSummary } from '../services/types';
import type { PricingResult, UnitPricing } from '../engine/pricingEngine';
import { DEFAULT_WARDROBE_CONFIG } from '../types';

// ============================================================================
// ID Generators
// ============================================================================

let idCounter = 0;

export function resetIdCounter(): void {
  idCounter = 0;
}

export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${++idCounter}`;
}

// ============================================================================
// Unit Fixtures
// ============================================================================

/**
 * Create a mock DrawnUnit with sensible defaults
 */
export function createMockUnit(overrides: Partial<DrawnUnit> = {}): DrawnUnit {
  return {
    id: generateTestId('unit'),
    unitType: 'wardrobe' as UnitType,
    widthMm: 1000,
    heightMm: 2100,
    box: { x: 100, y: 100, width: 100, height: 210 },
    loftEnabled: false,
    loftOnly: false,
    loftWidthMm: 0,
    loftHeightMm: 0,
    shutterCount: 3,
    shutterDividerXs: [],
    loftShutterCount: 2,
    loftDividerXs: [],
    loftBox: null,
    addOns: [],
    ...overrides,
  } as DrawnUnit;
}

/**
 * Create a mock unit with loft enabled
 */
export function createMockUnitWithLoft(overrides: Partial<DrawnUnit> = {}): DrawnUnit {
  return createMockUnit({
    loftEnabled: true,
    loftWidthMm: 1000,
    loftHeightMm: 400,
    loftShutterCount: 2,
    ...overrides,
  });
}

/**
 * Create a loft-only unit
 */
export function createMockLoftOnlyUnit(overrides: Partial<DrawnUnit> = {}): DrawnUnit {
  return createMockUnit({
    loftOnly: true,
    loftEnabled: true,
    loftWidthMm: 2000,
    loftHeightMm: 400,
    widthMm: 0,
    heightMm: 0,
    ...overrides,
  });
}

// ============================================================================
// Room Fixtures
// ============================================================================

/**
 * Create a mock QuotationRoom
 */
export function createMockRoom(overrides: Partial<QuotationRoom> = {}): QuotationRoom {
  return {
    id: generateTestId('room'),
    name: 'Test Room',
    unitType: 'wardrobe' as UnitType,
    drawnUnits: [],
    roomPhoto: null,
    wardrobeBox: null,
    activeUnitIndex: 0,
    shutterCount: 3,
    shutterDividerXs: [],
    loftEnabled: false,
    loftHeightRatio: 0.17,
    loftShutterCount: 2,
    loftDividerXs: [],
    sectionCount: 1,
    loftDividerYs: [],
    ...overrides,
  } as QuotationRoom;
}

/**
 * Create a room with units
 */
export function createMockRoomWithUnits(
  unitCount: number,
  roomOverrides: Partial<QuotationRoom> = {}
): QuotationRoom {
  const units = Array.from({ length: unitCount }, (_, i) =>
    createMockUnit({ id: generateTestId(`unit-${i}`) })
  );
  return createMockRoom({
    drawnUnits: units,
    ...roomOverrides,
  });
}

// ============================================================================
// Client & Meta Fixtures
// ============================================================================

/**
 * Create mock ClientInfo
 */
export function createMockClient(overrides: Partial<ClientInfo> = {}): ClientInfo {
  return {
    name: 'Test Customer',
    phone: '9876543210',
    email: 'test@example.com',
    location: 'Test Location',
    ...overrides,
  };
}

/**
 * Create mock QuoteMeta
 */
export function createMockMeta(overrides: Partial<QuoteMeta> = {}): QuoteMeta {
  return {
    quoteNo: `Q-${generateTestId()}`,
    dateISO: '2024-01-15',
    validTillISO: '2024-02-15',
    notes: '',
    terms: '',
    ...overrides,
  };
}

// ============================================================================
// Pricing Fixtures
// ============================================================================

/**
 * Create mock WardrobeConfig
 */
export function createMockWardrobeConfig(overrides: Partial<WardrobeConfig> = {}): WardrobeConfig {
  return {
    ...DEFAULT_WARDROBE_CONFIG,
    ...overrides,
  };
}

/**
 * Create mock unit pricing result
 */
export function createMockUnitPricing(overrides: Partial<UnitPricing> = {}): UnitPricing {
  return {
    unitIndex: 1,
    unitType: 'wardrobe',
    carcassSqft: 10.76,
    carcassRate: 150,
    carcassPrice: 1614,
    shutterSqft: 10.76,
    shutterRate: 200,
    shutterPrice: 2152,
    loftSqft: 0,
    loftPrice: 0,
    addOnsPrice: 0,
    unitTotal: 3766,
    ...overrides,
  };
}

/**
 * Create mock PricingResult
 */
export function createMockPricingResult(overrides: Partial<PricingResult> = {}): PricingResult {
  return {
    units: [createMockUnitPricing()],
    totalCarcassSqft: 10.76,
    totalShutterSqft: 10.76,
    totalLoftSqft: 0,
    totalSqft: 21.52,
    carcassRate: 150,
    shutterRate: 200,
    subtotal: 3766,
    addOnsTotal: 0,
    gst: 678,
    total: 4444,
    ...overrides,
  };
}

// ============================================================================
// Store Mock Factories
// ============================================================================

/**
 * Create mock usePricingStore state
 */
export function createMockPricingStoreState(overrides = {}) {
  return {
    pricingLocked: false,
    finalPrice: null,
    pricingControl: {
      sqftRate: 850,
      loftSqftRate: 750,
      shutterLoftShutterRate: 800,
      shutterLoftLoftRate: 700,
    },
    wardrobeConfig: DEFAULT_WARDROBE_CONFIG,
    materialPricing: null,
    ...overrides,
  };
}

/**
 * Create mock useDesignCanvasStore state
 */
export function createMockDesignCanvasStoreState(overrides = {}) {
  return {
    drawnUnits: [],
    wardrobeBox: null,
    loftBox: null,
    roomPhoto: null,
    referencePhotos: [],
    scale: null,
    unitType: 'wardrobe' as UnitType,
    customUnitTypes: [],
    activeUnitIndex: -1,
    selectedUnitIndices: [],
    drawMode: false,
    editMode: 'shutter',
    activePhotoId: null,
    floorPlanEnabled: true,
    canvas3DViewEnabled: false,
    shutterCount: 3,
    shutterDividerXs: [],
    loftEnabled: false,
    loftHeightRatio: 0.17,
    loftShutterCount: 2,
    loftDividerXs: [],
    ...overrides,
    reset: vi.fn(),
    setUnitType: vi.fn(),
    addUnit: vi.fn(),
    updateUnit: vi.fn(),
    deleteUnit: vi.fn(),
  };
}

/**
 * Create mock useRoomStore state
 */
export function createMockRoomStoreState(overrides = {}) {
  return {
    quotationRooms: [],
    activeRoomIndex: -1,
    ...overrides,
    addRoom: vi.fn(),
    deleteRoom: vi.fn(),
    updateRoom: vi.fn(),
    setActiveRoomIndex: vi.fn(),
    reset: vi.fn(),
  };
}

/**
 * Create mock useQuotationMetaStore state
 */
export function createMockQuotationMetaStoreState(overrides = {}) {
  return {
    leadId: null,
    quoteId: null,
    client: createMockClient(),
    meta: createMockMeta(),
    status: 'DRAFT' as const,
    version: 1,
    ...overrides,
    reset: vi.fn(),
    setClientField: vi.fn(),
    setMetaField: vi.fn(),
    setStatus: vi.fn(),
  };
}

// ============================================================================
// Store Mock Setup Helpers
// ============================================================================

/**
 * Setup pricing store mock with given state
 */
export function setupPricingStoreMock(state = {}) {
  const mockState = createMockPricingStoreState(state);
  return {
    getState: vi.fn(() => mockState),
    setState: vi.fn(),
    subscribe: vi.fn(),
    ...mockState,
  };
}

/**
 * Setup design canvas store mock with given state
 */
export function setupDesignCanvasStoreMock(state = {}) {
  const mockState = createMockDesignCanvasStoreState(state);
  return {
    getState: vi.fn(() => mockState),
    setState: vi.fn(),
    subscribe: vi.fn(),
    ...mockState,
  };
}

/**
 * Setup room store mock with given state
 */
export function setupRoomStoreMock(state = {}) {
  const mockState = createMockRoomStoreState(state);
  return {
    getState: vi.fn(() => mockState),
    setState: vi.fn(),
    subscribe: vi.fn(),
    ...mockState,
  };
}

/**
 * Setup quotation meta store mock with given state
 */
export function setupQuotationMetaStoreMock(state = {}) {
  const mockState = createMockQuotationMetaStoreState(state);
  return {
    getState: vi.fn(() => mockState),
    setState: vi.fn(),
    subscribe: vi.fn(),
    ...mockState,
  };
}

// ============================================================================
// Service Result Helpers
// ============================================================================

/**
 * Create a successful service result
 */
export function createSuccessResult<T>(data?: T): ServiceResult<T> {
  return { success: true, data };
}

/**
 * Create a failed service result
 */
export function createFailureResult(error: string): ServiceResult<never> {
  return { success: false, error };
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a service result is successful
 */
export function expectSuccess<T>(result: ServiceResult<T>): asserts result is { success: true; data: T } {
  if (!result.success) {
    throw new Error(`Expected success but got error: ${result.error}`);
  }
}

/**
 * Assert that a service result is a failure
 */
export function expectFailure(result: ServiceResult<unknown>): asserts result is { success: false; error: string } {
  if (result.success) {
    throw new Error('Expected failure but got success');
  }
}

// ============================================================================
// LocalStorage Mock
// ============================================================================

/**
 * Create a mock localStorage with optional initial data
 */
export function createMockLocalStorage(initialData: Record<string, string> = {}) {
  let store: Record<string, string> = { ...initialData };

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    // Test helpers
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore;
    },
  };
}

// ============================================================================
// Fetch Mock Helpers
// ============================================================================

/**
 * Create a mock fetch response
 */
export function createMockFetchResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

/**
 * Setup global fetch mock
 */
export function setupFetchMock(response: unknown, ok = true, status = 200) {
  const mockResponse = createMockFetchResponse(response, ok, status);
  global.fetch = vi.fn().mockResolvedValue(mockResponse);
  return global.fetch as ReturnType<typeof vi.fn>;
}

// ============================================================================
// Math Constants for Tests
// ============================================================================

export const MM2_TO_SQFT = 92903.04; // 1 sqft = 92903.04 mm²
export const MM_PER_INCH = 25.4;
export const SQIN_PER_SQFT = 144;

/**
 * Convert mm dimensions to sqft
 */
export function mmToSqft(widthMm: number, heightMm: number): number {
  return Number(((widthMm * heightMm) / MM2_TO_SQFT).toFixed(2));
}

/**
 * Calculate expected price given dimensions and rate
 */
export function calculateExpectedPrice(widthMm: number, heightMm: number, ratePerSqft: number): number {
  const sqft = mmToSqft(widthMm, heightMm);
  return Math.round(sqft * ratePerSqft);
}

// ============================================================================
// Cleanup Helpers
// ============================================================================

/**
 * Reset all mocks and counters
 */
export function resetAllMocks(): void {
  vi.clearAllMocks();
  resetIdCounter();
}
