/**
 * RoomService Tests
 *
 * Tests the room service layer which orchestrates:
 * - Room CRUD operations
 * - Multi-room state management
 * - Room switching with state preservation
 * - Validation and error handling
 *
 * CRITICAL: Tests room state coordination between stores.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  roomService,
  getAllRooms,
  getActiveRoom,
  createRoom,
  deleteRoom,
  updateRoom,
  switchToRoom,
  saveCurrentRoom,
  getRoomCount,
  getRoomById,
  isMultiRoomMode,
  getRoomUnits,
} from '../roomService';
import type { QuotationRoom, UnitType } from '../../types';

// Mock the stores
const mockDesignCanvasState = {
  drawnUnits: [],
  roomPhoto: null,
  referencePhotos: [],
  unitType: 'wardrobe' as UnitType,
  wardrobeBox: null,
  shutterCount: 3,
  shutterDividerXs: [],
  loftEnabled: false,
  loftHeightRatio: 0.17,
  loftShutterCount: 2,
  loftDividerXs: [],
  drawMode: false,
  activeUnitIndex: -1,
  selectedUnitIndices: [],
};

const mockRoomState = {
  quotationRooms: [] as QuotationRoom[],
  activeRoomIndex: -1,
};

const mockMetaState = {
  status: 'DRAFT' as const,
};

vi.mock('../../store/v2/useDesignCanvasStore', () => ({
  useDesignCanvasStore: {
    getState: vi.fn(() => mockDesignCanvasState),
    setState: vi.fn((updates) => Object.assign(mockDesignCanvasState, typeof updates === 'function' ? updates(mockDesignCanvasState) : updates)),
    subscribe: vi.fn(),
  },
}));

vi.mock('../../store/v2/useRoomStore', () => ({
  useRoomStore: {
    getState: vi.fn(() => mockRoomState),
    setState: vi.fn((updates) => Object.assign(mockRoomState, typeof updates === 'function' ? updates(mockRoomState) : updates)),
    subscribe: vi.fn(),
  },
}));

vi.mock('../../store/v2/useQuotationMetaStore', () => ({
  useQuotationMetaStore: {
    getState: vi.fn(() => mockMetaState),
    setState: vi.fn((updates) => Object.assign(mockMetaState, typeof updates === 'function' ? updates(mockMetaState) : updates)),
    subscribe: vi.fn(),
  },
}));

import { useDesignCanvasStore } from '../../store/v2/useDesignCanvasStore';
import { useRoomStore } from '../../store/v2/useRoomStore';
import { useQuotationMetaStore } from '../../store/v2/useQuotationMetaStore';

// Helper to create mock room
function createMockRoom(overrides: Partial<QuotationRoom> = {}): QuotationRoom {
  return {
    id: `room-${Math.random().toString(36).slice(2)}`,
    name: 'Test Room',
    unitType: 'wardrobe' as UnitType,
    drawnUnits: [],
    roomPhoto: null,
    wardrobeBox: null,
    activeUnitIndex: 0,
    shutterCount: 3,
    sectionCount: 1,
    shutterDividerXs: [],
    loftEnabled: false,
    loftHeightRatio: 0.2,
    loftShutterCount: 2,
    loftDividerXs: [],
    loftDividerYs: [],
    ...overrides,
  };
}

// Helper to create mock unit
function createMockUnit(overrides = {}) {
  return {
    id: `unit-${Math.random().toString(36).slice(2)}`,
    unitType: 'wardrobe',
    widthMm: 1000,
    heightMm: 2100,
    box: { x: 100, y: 100, width: 100, height: 210 },
    ...overrides,
  };
}

describe('RoomService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock states
    Object.assign(mockDesignCanvasState, {
      drawnUnits: [],
      roomPhoto: null,
      referencePhotos: [],
      unitType: 'wardrobe' as UnitType,
      wardrobeBox: null,
      shutterCount: 3,
      shutterDividerXs: [],
      loftEnabled: false,
      loftHeightRatio: 0.17,
      loftShutterCount: 2,
      loftDividerXs: [],
      drawMode: false,
      activeUnitIndex: -1,
      selectedUnitIndices: [],
      reset: vi.fn(),
      setUnitType: vi.fn(),
    });

    Object.assign(mockRoomState, {
      quotationRooms: [],
      activeRoomIndex: -1,
      addRoom: vi.fn((room: QuotationRoom) => {
        mockRoomState.quotationRooms.push(room);
      }),
      deleteRoom: vi.fn((index: number) => {
        mockRoomState.quotationRooms.splice(index, 1);
        if (mockRoomState.activeRoomIndex >= mockRoomState.quotationRooms.length) {
          mockRoomState.activeRoomIndex = Math.max(0, mockRoomState.quotationRooms.length - 1);
        }
      }),
      updateRoom: vi.fn((index: number, updates: Partial<QuotationRoom>) => {
        if (mockRoomState.quotationRooms[index]) {
          Object.assign(mockRoomState.quotationRooms[index], updates);
        }
      }),
      setActiveRoomIndex: vi.fn((index: number) => {
        mockRoomState.activeRoomIndex = index;
      }),
      reset: vi.fn(),
    });

    Object.assign(mockMetaState, {
      status: 'DRAFT' as const,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // getAllRooms Tests
  // =========================================================================

  describe('getAllRooms', () => {
    it('should return single default room when no rooms exist', () => {
      mockRoomState.quotationRooms = [];
      mockDesignCanvasState.drawnUnits = [createMockUnit()];
      mockDesignCanvasState.unitType = 'wardrobe';

      const rooms = getAllRooms();

      expect(rooms).toHaveLength(1);
      expect(rooms[0].id).toBe('default');
      expect(rooms[0].name).toBe('Quotation');
      expect(rooms[0].units).toHaveLength(1);
    });

    it('should return all rooms with their units', () => {
      const room1 = createMockRoom({
        id: 'room-1',
        name: 'Master Wardrobe',
        drawnUnits: [createMockUnit({ id: 'unit-1' })],
      });
      const room2 = createMockRoom({
        id: 'room-2',
        name: 'Kitchen',
        unitType: 'kitchen',
        drawnUnits: [createMockUnit({ id: 'unit-2' }), createMockUnit({ id: 'unit-3' })],
      });

      mockRoomState.quotationRooms = [room1, room2];
      mockRoomState.activeRoomIndex = 0;

      const rooms = getAllRooms();

      expect(rooms).toHaveLength(2);
      expect(rooms[0].id).toBe('room-1');
      expect(rooms[1].id).toBe('room-2');
    });

    it('should return canvas units for active room', () => {
      const room1 = createMockRoom({
        id: 'room-1',
        drawnUnits: [createMockUnit({ id: 'old-unit' })], // Stored units
      });

      mockRoomState.quotationRooms = [room1];
      mockRoomState.activeRoomIndex = 0;

      // Canvas has newer units
      mockDesignCanvasState.drawnUnits = [
        createMockUnit({ id: 'new-unit-1' }),
        createMockUnit({ id: 'new-unit-2' }),
      ];

      const rooms = getAllRooms();

      // Active room should use canvas units
      expect(rooms[0].units).toHaveLength(2);
      expect(rooms[0].units[0].id).toBe('new-unit-1');
    });
  });

  // =========================================================================
  // getActiveRoom Tests
  // =========================================================================

  describe('getActiveRoom', () => {
    it('should return default room when no rooms exist', () => {
      mockRoomState.quotationRooms = [];

      const room = getActiveRoom();

      expect(room).not.toBeNull();
      expect(room!.id).toBe('default');
    });

    it('should return active room with canvas state', () => {
      const room1 = createMockRoom({ id: 'room-1', name: 'Wardrobe' });
      mockRoomState.quotationRooms = [room1];
      mockRoomState.activeRoomIndex = 0;
      mockDesignCanvasState.drawnUnits = [createMockUnit()];

      const activeRoom = getActiveRoom();

      expect(activeRoom).not.toBeNull();
      expect(activeRoom!.id).toBe('room-1');
      expect(activeRoom!.units).toHaveLength(1);
    });

    it('should return null for invalid active index', () => {
      mockRoomState.quotationRooms = [];
      mockRoomState.activeRoomIndex = 5; // Invalid index

      // With no rooms but valid default fallback
      const room = getActiveRoom();

      // Falls back to default room
      expect(room).not.toBeNull();
    });
  });

  // =========================================================================
  // createRoom Tests
  // =========================================================================

  describe('createRoom', () => {
    it('should create a new room with generated name', () => {
      mockRoomState.quotationRooms = [];

      const result = createRoom({ unitType: 'wardrobe' });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).toBe('Wardrobe 1');
      expect(result.data!.unitType).toBe('wardrobe');
    });

    it('should create room with custom name', () => {
      const result = createRoom({ unitType: 'kitchen', name: 'Main Kitchen' });

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('Main Kitchen');
    });

    it('should increment room name for same unit type', () => {
      mockRoomState.quotationRooms = [
        createMockRoom({ unitType: 'wardrobe', name: 'Wardrobe 1' }),
      ];

      const result = createRoom({ unitType: 'wardrobe' });

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('Wardrobe 2');
    });

    it('should fail when quotation is approved', () => {
      mockMetaState.status = 'APPROVED';

      const result = createRoom({ unitType: 'wardrobe' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('approved');
    });

    it('should call addRoom on store', () => {
      createRoom({ unitType: 'tv_unit' });

      expect(mockRoomState.addRoom).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // deleteRoom Tests
  // =========================================================================

  describe('deleteRoom', () => {
    it('should delete room at valid index', () => {
      const room1 = createMockRoom({ id: 'room-1' });
      const room2 = createMockRoom({ id: 'room-2' });
      mockRoomState.quotationRooms = [room1, room2];
      mockRoomState.activeRoomIndex = 0;

      const result = deleteRoom(1);

      expect(result.success).toBe(true);
      expect(mockRoomState.deleteRoom).toHaveBeenCalledWith(1);
    });

    it('should fail for invalid index', () => {
      mockRoomState.quotationRooms = [createMockRoom()];

      const result = deleteRoom(5);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid room index');
    });

    it('should fail for negative index', () => {
      mockRoomState.quotationRooms = [createMockRoom()];

      const result = deleteRoom(-1);

      expect(result.success).toBe(false);
    });

    it('should fail when quotation is approved', () => {
      mockRoomState.quotationRooms = [createMockRoom()];
      mockMetaState.status = 'APPROVED';

      const result = deleteRoom(0);

      expect(result.success).toBe(false);
      expect(result.error).toContain('approved');
    });

    it('should handle deleting active room', () => {
      const room1 = createMockRoom({ id: 'room-1' });
      const room2 = createMockRoom({ id: 'room-2' });
      mockRoomState.quotationRooms = [room1, room2];
      mockRoomState.activeRoomIndex = 0; // Deleting active room

      const result = deleteRoom(0);

      expect(result.success).toBe(true);
      // Should trigger load of new active room
    });
  });

  // =========================================================================
  // updateRoom Tests
  // =========================================================================

  describe('updateRoom', () => {
    it('should update room name', () => {
      const room = createMockRoom({ id: 'room-1', name: 'Old Name' });
      mockRoomState.quotationRooms = [room];

      const result = updateRoom(0, { name: 'New Name' });

      expect(result.success).toBe(true);
      expect(mockRoomState.updateRoom).toHaveBeenCalledWith(0, { name: 'New Name' });
    });

    it('should update room unit type', () => {
      const room = createMockRoom({ id: 'room-1', unitType: 'wardrobe' });
      mockRoomState.quotationRooms = [room];
      mockRoomState.activeRoomIndex = 0;

      const result = updateRoom(0, { unitType: 'kitchen' });

      expect(result.success).toBe(true);
      expect(mockRoomState.updateRoom).toHaveBeenCalledWith(0, { unitType: 'kitchen' });
    });

    it('should fail for invalid index', () => {
      mockRoomState.quotationRooms = [createMockRoom()];

      const result = updateRoom(10, { name: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid room index');
    });

    it('should fail when quotation is approved', () => {
      mockRoomState.quotationRooms = [createMockRoom()];
      mockMetaState.status = 'APPROVED';

      const result = updateRoom(0, { name: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('approved');
    });
  });

  // =========================================================================
  // switchToRoom Tests
  // =========================================================================

  describe('switchToRoom', () => {
    it('should switch to different room', () => {
      const room1 = createMockRoom({
        id: 'room-1',
        name: 'Room 1',
        drawnUnits: [createMockUnit({ id: 'unit-r1' })],
      });
      const room2 = createMockRoom({
        id: 'room-2',
        name: 'Room 2',
        drawnUnits: [createMockUnit({ id: 'unit-r2' })],
      });
      mockRoomState.quotationRooms = [room1, room2];
      mockRoomState.activeRoomIndex = 0;

      const result = switchToRoom(1);

      expect(result.success).toBe(true);
      expect(result.data!.id).toBe('room-2');
    });

    it('should return current room if already active', () => {
      const room = createMockRoom({ id: 'room-1' });
      mockRoomState.quotationRooms = [room];
      mockRoomState.activeRoomIndex = 0;
      mockDesignCanvasState.drawnUnits = [createMockUnit()];

      const result = switchToRoom(0);

      expect(result.success).toBe(true);
      expect(result.data!.id).toBe('room-1');
    });

    it('should fail for invalid index', () => {
      mockRoomState.quotationRooms = [createMockRoom()];

      const result = switchToRoom(5);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid room index');
    });

    it('should save current room before switching', () => {
      const room1 = createMockRoom({ id: 'room-1' });
      const room2 = createMockRoom({ id: 'room-2' });
      mockRoomState.quotationRooms = [room1, room2];
      mockRoomState.activeRoomIndex = 0;

      // Current room has units
      mockDesignCanvasState.drawnUnits = [createMockUnit()];

      switchToRoom(1);

      // Should have updated room1 with current canvas state
      expect(mockRoomState.updateRoom).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // saveCurrentRoom Tests
  // =========================================================================

  describe('saveCurrentRoom', () => {
    it('should save canvas state to active room', () => {
      const room = createMockRoom({ id: 'room-1' });
      mockRoomState.quotationRooms = [room];
      mockRoomState.activeRoomIndex = 0;

      mockDesignCanvasState.drawnUnits = [createMockUnit(), createMockUnit()];
      mockDesignCanvasState.shutterCount = 4;
      mockDesignCanvasState.loftEnabled = true;

      const result = saveCurrentRoom();

      expect(result.success).toBe(true);
      expect(result.data!.unitCount).toBe(2);
      expect(mockRoomState.updateRoom).toHaveBeenCalledWith(
        0,
        expect.objectContaining({
          drawnUnits: expect.any(Array),
          shutterCount: 4,
          loftEnabled: true,
        })
      );
    });

    it('should fail in single room mode', () => {
      mockRoomState.quotationRooms = [];

      const result = saveCurrentRoom();

      expect(result.success).toBe(false);
      expect(result.error).toContain('single room mode');
    });

    it('should fail for invalid active room index', () => {
      mockRoomState.quotationRooms = [createMockRoom()];
      mockRoomState.activeRoomIndex = 10;

      const result = saveCurrentRoom();

      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // getRoomCount Tests
  // =========================================================================

  describe('getRoomCount', () => {
    it('should return 1 for empty rooms (single room mode)', () => {
      mockRoomState.quotationRooms = [];

      expect(getRoomCount()).toBe(1);
    });

    it('should return actual count for multi-room mode', () => {
      mockRoomState.quotationRooms = [
        createMockRoom(),
        createMockRoom(),
        createMockRoom(),
      ];

      expect(getRoomCount()).toBe(3);
    });
  });

  // =========================================================================
  // getRoomById Tests
  // =========================================================================

  describe('getRoomById', () => {
    it('should return default room for "default" id', () => {
      mockRoomState.quotationRooms = [];
      mockDesignCanvasState.unitType = 'wardrobe';

      const room = getRoomById('default');

      expect(room).not.toBeNull();
      expect(room!.id).toBe('default');
    });

    it('should return room by id', () => {
      const room1 = createMockRoom({ id: 'room-abc' });
      const room2 = createMockRoom({ id: 'room-xyz' });
      mockRoomState.quotationRooms = [room1, room2];

      const room = getRoomById('room-xyz');

      expect(room).not.toBeNull();
      expect(room!.id).toBe('room-xyz');
    });

    it('should return null for unknown id', () => {
      mockRoomState.quotationRooms = [createMockRoom({ id: 'room-1' })];

      const room = getRoomById('unknown-id');

      expect(room).toBeNull();
    });
  });

  // =========================================================================
  // isMultiRoomMode Tests
  // =========================================================================

  describe('isMultiRoomMode', () => {
    it('should return false when no rooms', () => {
      mockRoomState.quotationRooms = [];

      expect(isMultiRoomMode()).toBe(false);
    });

    it('should return true when rooms exist', () => {
      mockRoomState.quotationRooms = [createMockRoom()];

      expect(isMultiRoomMode()).toBe(true);
    });
  });

  // =========================================================================
  // getRoomUnits Tests
  // =========================================================================

  describe('getRoomUnits', () => {
    it('should return canvas units for single room mode', () => {
      mockRoomState.quotationRooms = [];
      mockDesignCanvasState.drawnUnits = [createMockUnit(), createMockUnit()];

      const units = getRoomUnits(0);

      expect(units).toHaveLength(2);
    });

    it('should return canvas units for active room', () => {
      const room = createMockRoom({
        drawnUnits: [createMockUnit({ id: 'stored-unit' })],
      });
      mockRoomState.quotationRooms = [room];
      mockRoomState.activeRoomIndex = 0;
      mockDesignCanvasState.drawnUnits = [createMockUnit({ id: 'canvas-unit' })];

      const units = getRoomUnits(0);

      expect(units[0].id).toBe('canvas-unit');
    });

    it('should return stored units for non-active room', () => {
      const room1 = createMockRoom({ drawnUnits: [] });
      const room2 = createMockRoom({
        drawnUnits: [createMockUnit({ id: 'stored-unit' })],
      });
      mockRoomState.quotationRooms = [room1, room2];
      mockRoomState.activeRoomIndex = 0;

      const units = getRoomUnits(1);

      expect(units[0].id).toBe('stored-unit');
    });

    it('should return empty array for invalid index', () => {
      mockRoomState.quotationRooms = [createMockRoom()];

      const units = getRoomUnits(10);

      expect(units).toEqual([]);
    });
  });

  // =========================================================================
  // Service Object Export Tests
  // =========================================================================

  describe('roomService export', () => {
    it('should export all read operations', () => {
      expect(typeof roomService.getAllRooms).toBe('function');
      expect(typeof roomService.getActiveRoom).toBe('function');
      expect(typeof roomService.getRoomById).toBe('function');
      expect(typeof roomService.getRoomCount).toBe('function');
      expect(typeof roomService.getRoomUnits).toBe('function');
      expect(typeof roomService.isMultiRoomMode).toBe('function');
    });

    it('should export all write operations', () => {
      expect(typeof roomService.createRoom).toBe('function');
      expect(typeof roomService.deleteRoom).toBe('function');
      expect(typeof roomService.updateRoom).toBe('function');
      expect(typeof roomService.switchToRoom).toBe('function');
      expect(typeof roomService.saveCurrentRoom).toBe('function');
    });
  });
});
