/**
 * Export Service
 *
 * Orchestrates export operations (PDF, Excel, clipboard, WhatsApp).
 * Coordinates with exportEngine (pure) and store for data gathering.
 *
 * Responsibilities:
 * - Gather data from store for export
 * - Delegate to exportEngine for file generation
 * - Handle export errors gracefully
 * - Provide export status and progress
 */

import { useDesignCanvasStore } from "../store/v2/useDesignCanvasStore";
import { useQuotationMetaStore } from "../store/v2/useQuotationMetaStore";
import {
  generateQuotationPDF,
  generateQuotationExcel,
  copyQuotationToClipboard,
  generateShareData,
} from "../engine/exportEngine";
import { FLOOR_OPTIONS, ROOM_OPTIONS } from "../constants";
import type { ServiceResult, ExportFormat, ExportParams, ExportResult } from "./types";
import type { QuotationRoom, DrawnUnit } from "../types";

// ============================================================================
// Types
// ============================================================================

interface ExportData {
  client: ReturnType<typeof useQuotationMetaStore.getState>["client"];
  meta: ReturnType<typeof useQuotationMetaStore.getState>["meta"];
  quotationRooms: QuotationRoom[];
  currentDrawnUnits: ReturnType<typeof useDesignCanvasStore.getState>["drawnUnits"];
  activeRoomIndex: number;
  roomPhoto?: ReturnType<typeof useDesignCanvasStore.getState>["roomPhoto"];
  referencePhotos?: ReturnType<typeof useDesignCanvasStore.getState>["referencePhotos"];
}

// ============================================================================
// Pure Helper Functions
// ============================================================================

/**
 * Get floor label from floor ID
 * Supports both standard and custom floors
 */
function getFloorLabel(floorId: string): string {
  // First check standard floors
  const floor = FLOOR_OPTIONS.find(f => f.value === floorId);
  if (floor) return floor.label;

  // Check custom floors from store
  const allFloors = useDesignCanvasStore.getState().getAllFloors();
  const customFloor = allFloors.find(f => f.value === floorId);
  if (customFloor) return customFloor.label;

  // Fallback: format the ID nicely
  return floorId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Get room label from room ID
 * Supports both standard and custom rooms
 */
function getRoomLabel(roomId: string): string {
  // First check standard rooms
  const room = ROOM_OPTIONS.find(r => r.value === roomId);
  if (room) return room.label;

  // Check custom rooms from store
  const allRooms = useDesignCanvasStore.getState().getAllRooms();
  const customRoom = allRooms.find(r => r.value === roomId);
  if (customRoom) return customRoom.label;

  // Fallback: format the ID nicely
  return roomId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Parse room key into floorId, roomId, and canvasIndex
 * Key format: "floorId_roomId_canvasIndex" where both floorId and roomId can contain underscores
 * e.g., "ground_master_bedroom_0" -> { floorId: "ground", roomId: "master_bedroom", canvasIndex: 0 }
 * e.g., "ground_2_master_bedroom_0" -> { floorId: "ground_2", roomId: "master_bedroom", canvasIndex: 0 }
 * e.g., "first_kids_room_2_1" -> { floorId: "first", roomId: "kids_room_2", canvasIndex: 1 }
 */
function parseRoomKey(key: string): { floorId: string; roomId: string; canvasIndex: number } {
  // Get all known floor IDs (standard + custom) sorted by length descending to match longest first
  const allFloors = useDesignCanvasStore.getState().getAllFloors();
  const floorIds = allFloors.map(f => f.value).sort((a, b) => b.length - a.length);

  // Get all known room IDs (standard + custom) sorted by length descending
  const allRooms = useDesignCanvasStore.getState().getAllRooms();
  const roomIds = allRooms.map(r => r.value).sort((a, b) => b.length - a.length);

  // Find the last underscore followed by a number (canvas index)
  const lastUnderscoreIndex = key.lastIndexOf('_');
  const possibleIndex = key.substring(lastUnderscoreIndex + 1);
  const canvasIndex = parseInt(possibleIndex, 10);

  let remainder = key;
  let finalCanvasIndex = 0;

  // If last part is a valid number, it's the canvas index
  if (!isNaN(canvasIndex) && lastUnderscoreIndex > 0) {
    remainder = key.substring(0, lastUnderscoreIndex);
    finalCanvasIndex = canvasIndex;
  }

  // Try to match floor ID from known floors (longest match first)
  for (const floorId of floorIds) {
    if (remainder.startsWith(floorId + '_')) {
      const afterFloor = remainder.substring(floorId.length + 1);
      // Try to match room ID from known rooms
      for (const roomId of roomIds) {
        if (afterFloor === roomId) {
          return { floorId, roomId, canvasIndex: finalCanvasIndex };
        }
      }
      // If no exact room match, use the remainder as roomId
      return { floorId, roomId: afterFloor, canvasIndex: finalCanvasIndex };
    }
  }

  // Fallback: split at first underscore (legacy behavior)
  const firstUnderscoreIndex = remainder.indexOf('_');
  if (firstUnderscoreIndex === -1) {
    return { floorId: remainder, roomId: '', canvasIndex: finalCanvasIndex };
  }
  return {
    floorId: remainder.substring(0, firstUnderscoreIndex),
    roomId: remainder.substring(firstUnderscoreIndex + 1),
    canvasIndex: finalCanvasIndex,
  };
}

/**
 * Convert roomUnits Record to QuotationRoom[] format for export
 * Organizes by floor, then room, combining all canvases per room
 */
function convertRoomUnitsToQuotationRooms(
  roomUnits: Record<string, DrawnUnit[]>,
  currentFloorId: string,
  currentRoomId: string,
  currentDrawnUnits: DrawnUnit[],
  currentCanvasIndex: number = 0
): QuotationRoom[] {
  // Merge current canvas's units into roomUnits
  const currentKey = `${currentFloorId}_${currentRoomId}_${currentCanvasIndex}`;
  const allRoomUnits = {
    ...roomUnits,
    [currentKey]: currentDrawnUnits,
  };

  // Group all canvases by floor+room (combine units from all canvases)
  const roomGroups: Record<string, DrawnUnit[]> = {};

  for (const [key, units] of Object.entries(allRoomUnits)) {
    if (!units || units.length === 0) continue;

    const { floorId, roomId } = parseRoomKey(key);
    const baseKey = `${floorId}_${roomId}`;

    if (!roomGroups[baseKey]) {
      roomGroups[baseKey] = [];
    }
    roomGroups[baseKey].push(...units);
  }

  // Sort keys by floor order, then room order
  const floorOrder = FLOOR_OPTIONS.map(f => f.value);
  const roomOrder = ROOM_OPTIONS.map(r => r.value);

  const sortedKeys = Object.keys(roomGroups)
    .filter(key => roomGroups[key]?.length > 0) // Only rooms with units
    .sort((a, b) => {
      const { floorId: floorA, roomId: roomA } = parseRoomKey(a);
      const { floorId: floorB, roomId: roomB } = parseRoomKey(b);

      const floorIndexA = floorOrder.indexOf(floorA);
      const floorIndexB = floorOrder.indexOf(floorB);

      if (floorIndexA !== floorIndexB) {
        return floorIndexA - floorIndexB;
      }

      const roomIndexA = roomOrder.indexOf(roomA);
      const roomIndexB = roomOrder.indexOf(roomB);
      return roomIndexA - roomIndexB;
    });

  // Convert to QuotationRoom[]
  return sortedKeys.map(key => {
    const { floorId, roomId } = parseRoomKey(key);
    const units = roomGroups[key];
    const floorLabel = getFloorLabel(floorId);
    const roomLabel = getRoomLabel(roomId);

    // Include floor in room name (except for Ground floor)
    const roomName = floorId === 'ground'
      ? roomLabel
      : `${roomLabel} (${floorLabel})`;

    // Get predominant unit type from drawn units
    const unitType = units[0]?.unitType || 'wardrobe';

    return {
      id: key,
      name: roomName,
      unitType,
      drawnUnits: units,
      activeUnitIndex: 0,
      shutterCount: 3,
      shutterDividerXs: [],
      loftEnabled: false,
      loftHeightRatio: 0.17,
      loftShutterCount: 2,
      loftDividerXs: [],
    };
  });
}

/**
 * Gather export data from store
 * Now uses the new multi-room system (roomUnits in useDesignCanvasStore)
 */
function gatherExportData(): ExportData {
  const metaState = useQuotationMetaStore.getState();
  const canvasState = useDesignCanvasStore.getState();

  // Convert new roomUnits format to QuotationRoom[] for export engine
  // Note: This combines all canvases per room into single QuotationRoom entries
  const quotationRooms = convertRoomUnitsToQuotationRooms(
    canvasState.roomUnits,
    canvasState.activeFloorId,
    canvasState.activeRoomId,
    canvasState.drawnUnits,
    canvasState.activeCanvasIndex
  );

  // Find active room index in the converted array (uses base key without canvas index)
  const currentKey = `${canvasState.activeFloorId}_${canvasState.activeRoomId}`;
  const activeRoomIndex = quotationRooms.findIndex(r => r.id === currentKey);

  return {
    client: metaState.client,
    meta: metaState.meta,
    quotationRooms,
    currentDrawnUnits: canvasState.drawnUnits,
    activeRoomIndex: activeRoomIndex >= 0 ? activeRoomIndex : 0,
    roomPhoto: canvasState.roomPhoto || undefined,
    referencePhotos: canvasState.referencePhotos,
  };
}

/**
 * Generate filename for export
 */
function generateFilename(format: ExportFormat, quoteNo: string, clientName: string): string {
  const safeName = clientName.replace(/[^a-zA-Z0-9]/g, "_") || "Customer";
  const safeQuoteNo = quoteNo.replace(/[^a-zA-Z0-9-]/g, "_");
  const extension = format === "excel" ? "xlsx" : format === "pdf" ? "pdf" : "";
  return extension ? `Quotation_${safeQuoteNo}_${safeName}.${extension}` : `Quotation_${safeQuoteNo}_${safeName}`;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Export quotation to PDF
 */
export function exportToPDF(params?: {
  canvasImageData?: string;
  allCanvasImages?: Map<number, string>;
}): ServiceResult<ExportResult> {
  try {
    const data = gatherExportData();
    const filename = generateFilename("pdf", data.meta.quoteNo, data.client.name);

    generateQuotationPDF({
      client: data.client,
      meta: data.meta,
      quotationRooms: data.quotationRooms,
      currentDrawnUnits: data.currentDrawnUnits,
      activeRoomIndex: data.activeRoomIndex,
      canvasImageData: params?.canvasImageData,
      allCanvasImages: params?.allCanvasImages,
      currentRoomPhoto: data.roomPhoto,
      currentReferencePhotos: data.referencePhotos,
    });

    return {
      success: true,
      data: {
        success: true,
        format: "pdf",
        filename,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF export failed";
    return {
      success: false,
      error: message,
      data: {
        success: false,
        format: "pdf",
        error: message,
      },
    };
  }
}

/**
 * Export quotation to Excel
 */
export function exportToExcel(): ServiceResult<ExportResult> {
  try {
    const data = gatherExportData();
    const filename = generateFilename("excel", data.meta.quoteNo, data.client.name);

    generateQuotationExcel({
      client: data.client,
      meta: data.meta,
      quotationRooms: data.quotationRooms,
      currentDrawnUnits: data.currentDrawnUnits,
      activeRoomIndex: data.activeRoomIndex,
    });

    return {
      success: true,
      data: {
        success: true,
        format: "excel",
        filename,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Excel export failed";
    return {
      success: false,
      error: message,
      data: {
        success: false,
        format: "excel",
        error: message,
      },
    };
  }
}

/**
 * Copy quotation to clipboard (for WhatsApp/SMS)
 */
export async function copyToClipboard(): Promise<ServiceResult<ExportResult>> {
  try {
    const data = gatherExportData();

    const success = await copyQuotationToClipboard({
      client: data.client,
      meta: data.meta,
      quotationRooms: data.quotationRooms,
      currentDrawnUnits: data.currentDrawnUnits,
      activeRoomIndex: data.activeRoomIndex,
    });

    if (!success) {
      return {
        success: false,
        error: "Failed to copy to clipboard",
        data: {
          success: false,
          format: "clipboard",
          error: "Clipboard API failed",
        },
      };
    }

    return {
      success: true,
      data: {
        success: true,
        format: "clipboard",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Clipboard copy failed";
    return {
      success: false,
      error: message,
      data: {
        success: false,
        format: "clipboard",
        error: message,
      },
    };
  }
}

/**
 * Generate shareable link data
 */
export function generateShareLink(): ServiceResult<string> {
  try {
    const data = gatherExportData();

    const shareData = generateShareData({
      client: data.client,
      meta: data.meta,
      quotationRooms: data.quotationRooms,
      currentDrawnUnits: data.currentDrawnUnits,
      activeRoomIndex: data.activeRoomIndex,
    });

    return {
      success: true,
      data: shareData,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Share link generation failed";
    return { success: false, error: message };
  }
}

/**
 * Open WhatsApp with quotation text
 */
export async function shareToWhatsApp(phoneNumber?: string): Promise<ServiceResult<void>> {
  try {
    const data = gatherExportData();

    // First copy to clipboard
    const copySuccess = await copyQuotationToClipboard({
      client: data.client,
      meta: data.meta,
      quotationRooms: data.quotationRooms,
      currentDrawnUnits: data.currentDrawnUnits,
      activeRoomIndex: data.activeRoomIndex,
    });

    if (!copySuccess) {
      return { success: false, error: "Failed to copy quotation text" };
    }

    // Build WhatsApp URL
    const phone = phoneNumber || data.client.phone?.replace(/[^0-9]/g, "");
    const baseUrl = "https://wa.me/";
    const url = phone ? `${baseUrl}${phone}` : `${baseUrl}`;

    // Open WhatsApp in new tab
    window.open(url, "_blank");

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "WhatsApp share failed";
    return { success: false, error: message };
  }
}

/**
 * Export using specified format
 */
export async function exportQuotation(params: ExportParams): Promise<ServiceResult<ExportResult>> {
  switch (params.format) {
    case "pdf":
      return exportToPDF({
        canvasImageData: params.canvasImageData,
      });
    case "excel":
      return exportToExcel();
    case "clipboard":
      return copyToClipboard();
    case "whatsapp": {
      const result = await shareToWhatsApp();
      return {
        success: result.success,
        error: result.error,
        data: {
          success: result.success,
          format: "whatsapp",
          error: result.error,
        },
      };
    }
    default:
      return {
        success: false,
        error: `Unsupported export format: ${params.format}`,
      };
  }
}

/**
 * Check if export is available (has content to export)
 * Uses the new multi-room system (roomUnits in useDesignCanvasStore)
 */
export function canExport(): boolean {
  const canvasState = useDesignCanvasStore.getState();
  const { drawnUnits, roomUnits } = canvasState;

  // Check current room's drawn units
  if (drawnUnits.length > 0) {
    return true;
  }

  // Check all saved rooms for units
  return Object.values(roomUnits).some(units => units.length > 0);
}

/**
 * Get available export formats
 */
export function getAvailableFormats(): ExportFormat[] {
  return ["pdf", "excel", "clipboard", "whatsapp"];
}

// ============================================================================
// Export Service Object
// ============================================================================

export const exportService = {
  // Export operations
  exportToPDF,
  exportToExcel,
  copyToClipboard,
  shareToWhatsApp,
  exportQuotation,

  // Share operations
  generateShareLink,

  // Utility
  canExport,
  getAvailableFormats,
};

export default exportService;
