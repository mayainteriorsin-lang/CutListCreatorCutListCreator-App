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
import { usePricingStore } from "../store/v2/usePricingStore";
import { useQuotationMetaStore } from "../store/v2/useQuotationMetaStore";
import { useRoomStore } from "../store/v2/useRoomStore";
import {
  generateQuotationPDF,
  generateQuotationExcel,
  copyQuotationToClipboard,
  generateShareData,
} from "../engine/exportEngine";
import type { ServiceResult, ExportFormat, ExportParams, ExportResult } from "./types";

// ============================================================================
// Types
// ============================================================================

interface ExportData {
  client: ReturnType<typeof useQuotationMetaStore.getState>["client"];
  meta: ReturnType<typeof useQuotationMetaStore.getState>["meta"];
  quotationRooms: ReturnType<typeof useRoomStore.getState>["quotationRooms"];
  currentDrawnUnits: ReturnType<typeof useDesignCanvasStore.getState>["drawnUnits"];
  activeRoomIndex: number;
  roomPhoto?: ReturnType<typeof useDesignCanvasStore.getState>["roomPhoto"];
  referencePhotos?: ReturnType<typeof useDesignCanvasStore.getState>["referencePhotos"];
}

// ============================================================================
// Pure Helper Functions
// ============================================================================

/**
 * Gather export data from store
 */
function gatherExportData(): ExportData {
  const metaState = useQuotationMetaStore.getState();
  const canvasState = useDesignCanvasStore.getState();
  const roomState = useRoomStore.getState();
  return {
    client: metaState.client,
    meta: metaState.meta,
    quotationRooms: roomState.quotationRooms,
    currentDrawnUnits: canvasState.drawnUnits,
    activeRoomIndex: roomState.activeRoomIndex,
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
    case "whatsapp":
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
    default:
      return {
        success: false,
        error: `Unsupported export format: ${params.format}`,
      };
  }
}

/**
 * Check if export is available (has content to export)
 */
export function canExport(): boolean {
  const canvasState = useDesignCanvasStore.getState();
  const roomState = useRoomStore.getState();
  const { quotationRooms, activeRoomIndex } = roomState;
  const { drawnUnits } = canvasState;

  if (quotationRooms.length === 0) {
    return drawnUnits.length > 0;
  }

  return quotationRooms.some((room, index) => {
    const units = index === activeRoomIndex ? drawnUnits : room.drawnUnits;
    return units.length > 0;
  });
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
