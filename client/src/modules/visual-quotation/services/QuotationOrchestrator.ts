import type { ClientInfo, QuoteMeta, DrawnUnit, QuotationRoom, RoomPhoto } from '../types';
import { generateQuotationPDF, generateQuotationExcel, copyQuotationToClipboard } from '../engine/exportEngine';
import { quotationService } from './quotationService';
import { logger } from './logger';

/**
 * Orchestration Service for complex multi-step quotation operations
 * 
 * Responsibilities:
 * - Coordinate PDF/Excel export workflows
 * - Manage canvas capture across multiple rooms
 * - Handle clipboard operations
 * - WhatsApp sharing integration
 * 
 * This service orchestrates high-level business operations that involve
 * multiple services and complex state management.
 */

export interface ExportContext {
    client: ClientInfo;
    meta: QuoteMeta;
    quotationRooms: QuotationRoom[];
    currentDrawnUnits: DrawnUnit[];
    activeRoomIndex: number;
    roomPhoto?: RoomPhoto | null;
    referencePhotos?: any[]; // ReferencePhoto type from store
}

export interface CanvasCapture {
    captureCurrentCanvas: () => string | null;
    saveRoomState: () => void;
    loadRoomState: (index: number) => void;
}

export class QuotationOrchestrator {
    /**
     * Wait for UI to render before capturing canvas
     */
    private async waitForRender(ms: number = 150): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Capture canvas images from all rooms in the quotation
     * 
     * @param context - Export context with room data
     * @param capture - Canvas capture functions
     * @returns Map of room index to canvas image data URL
     */
    async captureAllRoomCanvases(
        context: ExportContext,
        capture: CanvasCapture
    ): Promise<Map<number, string>> {
        const allCanvasImages = new Map<number, string>();
        const { quotationRooms, activeRoomIndex } = context;

        // Single room scenario - just capture current
        if (quotationRooms.length === 0) {
            const currentImage = capture.captureCurrentCanvas();
            if (currentImage) {
                allCanvasImages.set(0, currentImage);
            }
            return allCanvasImages;
        }

        // Multi-room scenario - iterate through all rooms
        capture.saveRoomState();
        const originalRoomIndex = activeRoomIndex;

        for (let i = 0; i < quotationRooms.length; i++) {
            // Load room state if not current
            if (i !== originalRoomIndex) {
                capture.loadRoomState(i);
                await this.waitForRender();
            }

            // Capture canvas for this room
            const canvasImage = capture.captureCurrentCanvas();
            if (canvasImage) {
                allCanvasImages.set(i, canvasImage);
            }
        }

        // Restore original room if needed
        if (originalRoomIndex !== quotationRooms.length - 1) {
            capture.loadRoomState(originalRoomIndex);
            await this.waitForRender();
        }

        return allCanvasImages;
    }

    /**
   * Export quotation as PDF
   * 
   * @param context - Export context with all quotation data
   * @param capture - Canvas capture functions
   * @throws Error if validation fails or export fails
   */
    async exportToPDF(
        context: ExportContext,
        capture: CanvasCapture
    ): Promise<void> {
        return logger.trackPerformance('PDF Export', async () => {
            // Validate quotation state
            const validation = quotationService.validateForExport();
            if (!validation.isValid) {
                logger.warn('PDF export validation failed', {
                    quoteNo: context.meta.quoteNo,
                    errors: validation.errors,
                });
                throw new Error(validation.errors.join('\n'));
            }

            logger.info('Starting PDF export', {
                quoteNo: context.meta.quoteNo,
                clientName: context.client.name,
                roomCount: context.quotationRooms.length,
            });

            // Capture all canvas images
            const allCanvasImages = await this.captureAllRoomCanvases(context, capture);
            const canvasImageData = capture.captureCurrentCanvas();

            // Generate PDF
            generateQuotationPDF({
                client: context.client,
                meta: context.meta,
                quotationRooms: context.quotationRooms,
                currentDrawnUnits: context.currentDrawnUnits,
                activeRoomIndex: context.activeRoomIndex,
                canvasImageData: canvasImageData || undefined,
                allCanvasImages: allCanvasImages.size > 0 ? allCanvasImages : undefined,
                currentRoomPhoto: context.roomPhoto || undefined,
                currentReferencePhotos: context.referencePhotos,
            });

            logger.info('PDF export successful', {
                quoteNo: context.meta.quoteNo,
                canvasCount: allCanvasImages.size,
            });
        }, { quoteNo: context.meta.quoteNo });
    }

    /**
   * Export quotation as Excel spreadsheet
   * 
   * @param context - Export context with all quotation data
   * @throws Error if validation fails or export fails
   */
    async exportToExcel(context: ExportContext): Promise<void> {
        return logger.trackPerformance('Excel Export', async () => {
            // Validate quotation state
            const validation = quotationService.validateForExport();
            if (!validation.isValid) {
                logger.warn('Excel export validation failed', {
                    quoteNo: context.meta.quoteNo,
                    errors: validation.errors,
                });
                throw new Error(validation.errors.join('\n'));
            }

            logger.info('Starting Excel export', {
                quoteNo: context.meta.quoteNo,
                clientName: context.client.name,
            });

            // Generate Excel
            generateQuotationExcel({
                client: context.client,
                meta: context.meta,
                quotationRooms: context.quotationRooms,
                currentDrawnUnits: context.currentDrawnUnits,
                activeRoomIndex: context.activeRoomIndex,
            });

            logger.info('Excel export successful', {
                quoteNo: context.meta.quoteNo,
            });
        }, { quoteNo: context.meta.quoteNo });
    }

    /**
   * Copy quotation to clipboard
   * 
   * @param context - Export context with all quotation data
   * @returns true if successful, false otherwise
   */
    async copyToClipboard(context: ExportContext): Promise<boolean> {
        return logger.trackPerformance('Clipboard Copy', async () => {
            // Validate quotation state
            const validation = quotationService.validateForExport();
            if (!validation.isValid) {
                logger.warn('Clipboard validation failed', {
                    quoteNo: context.meta.quoteNo,
                    errors: validation.errors,
                });
                throw new Error(validation.errors.join('\n'));
            }

            logger.debug('Copying quotation to clipboard', {
                quoteNo: context.meta.quoteNo,
            });

            // Copy to clipboard
            const success = await copyQuotationToClipboard({
                client: context.client,
                meta: context.meta,
                quotationRooms: context.quotationRooms,
                currentDrawnUnits: context.currentDrawnUnits,
                activeRoomIndex: context.activeRoomIndex,
            });

            if (success) {
                logger.info('Clipboard copy successful', {
                    quoteNo: context.meta.quoteNo,
                });
            } else {
                logger.warn('Clipboard copy failed', {
                    quoteNo: context.meta.quoteNo,
                });
            }

            return success;
        }, { quoteNo: context.meta.quoteNo });
    }

    /**
     * Share quotation via WhatsApp
     * 
     * First copies quotation to clipboard, then opens WhatsApp with phone number
     * 
     * @param context - Export context with all quotation data
     */
    async shareViaWhatsApp(context: ExportContext): Promise<void> {
        // Copy to clipboard first
        await copyQuotationToClipboard({
            client: context.client,
            meta: context.meta,
            quotationRooms: context.quotationRooms,
            currentDrawnUnits: context.currentDrawnUnits,
            activeRoomIndex: context.activeRoomIndex,
        });

        // Format phone number and open WhatsApp
        const phone = context.client.phone?.replace(/\D/g, '') || '';
        const whatsappUrl = phone
            ? `https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}`
            : 'https://wa.me/';

        window.open(whatsappUrl, '_blank');
    }
}

// Singleton instance export
export const quotationOrchestrator = new QuotationOrchestrator();
