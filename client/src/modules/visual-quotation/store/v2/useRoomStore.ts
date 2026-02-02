import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QuotationRoom, UnitType } from '../../types';
import { logger } from '../../services/logger';

/**
 * Room Store (v2)
 *
 * Manages the list of rooms and active room index.
 * Does NOT manage the active drawing state (DesignCanvasStore does that).
 */

export interface RoomState {
    quotationRooms: QuotationRoom[];
    activeRoomIndex: number;

    // Actions
    addRoom: (room: QuotationRoom) => void;
    addQuotationRoom: (unitType: UnitType, name: string) => void; // V1 compatibility helper
    updateRoom: (index: number, updates: Partial<QuotationRoom>) => void;
    deleteRoom: (index: number) => void;
    setActiveRoomIndex: (index: number) => void;
    saveCurrentRoomState: () => void; // V1 compatibility helper (no-op in V2)
    reset: () => void;
}

const initialState = {
    quotationRooms: [],
    activeRoomIndex: -1,
};

export const useRoomStore = create<RoomState>()(
    persist(
        (set) => ({
            ...initialState,

            addRoom: (room) => set(state => ({
                quotationRooms: [...state.quotationRooms, room],
                activeRoomIndex: state.quotationRooms.length // Set new room as active
            })),

            addQuotationRoom: (unitType, name) => set(state => {
                const newRoom: QuotationRoom = {
                    id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name,
                    unitType,
                    drawnUnits: [],
                    roomPhoto: undefined,
                    activeUnitIndex: -1,
                    wardrobeBox: undefined,
                    loftBox: undefined,
                    shutterCount: 2,
                    shutterDividerXs: [0.5],
                    loftEnabled: false,
                    loftHeightRatio: 0.3,
                    loftShutterCount: 2,
                    loftDividerXs: [0.5],
                };
                return {
                    quotationRooms: [...state.quotationRooms, newRoom],
                    activeRoomIndex: state.quotationRooms.length
                };
            }),

            updateRoom: (index, updates) => set(state => ({
                quotationRooms: state.quotationRooms.map((r, i) =>
                    i === index ? { ...r, ...updates } : r
                )
            })),

            deleteRoom: (index) => set(state => {
                const newRooms = state.quotationRooms.filter((_, i) => i !== index);
                // Adjust active index if needed
                let newIndex = state.activeRoomIndex;
                if (index < state.activeRoomIndex) {
                    newIndex--;
                } else if (index === state.activeRoomIndex) {
                    newIndex = Math.max(0, newRooms.length - 1);
                }
                if (newRooms.length === 0) newIndex = -1;

                return {
                    quotationRooms: newRooms,
                    activeRoomIndex: newIndex
                };
            }),

            setActiveRoomIndex: (index) => set({ activeRoomIndex: index }),

            saveCurrentRoomState: () => {
                // V1 compatibility: In V2, room state is managed by DesignCanvasStore
                // This is a no-op for backward compatibility
                logger.debug('saveCurrentRoomState called (no-op in V2)', { context: 'room-store' });
            },

            reset: () => set(initialState),
        }),
        {
            name: 'room-storage-v2',
            version: 1,
        }
    )
);
