
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    exportService,
    canExport,
    getAvailableFormats,
    exportToPDF,
    exportToExcel,
    copyToClipboard,
    shareToWhatsApp,
    exportQuotation
} from '../exportService';
import { generateQuotationPDF, generateQuotationExcel, copyQuotationToClipboard } from '../../engine/exportEngine';
import { useDesignCanvasStore } from '../../store/v2/useDesignCanvasStore';
import { useRoomStore } from '../../store/v2/useRoomStore';
import { useQuotationMetaStore } from '../../store/v2/useQuotationMetaStore';
import { usePricingStore } from '../../store/v2/usePricingStore';

// Mock engine
vi.mock('../../engine/exportEngine', () => ({
    generateQuotationPDF: vi.fn(),
    generateQuotationExcel: vi.fn(),
    copyQuotationToClipboard: vi.fn().mockResolvedValue(true),
    generateShareData: vi.fn(() => "mock-share-data"),
}));

// Mock stores
const mockDesignCanvasState = {
    drawnUnits: [],
    roomPhoto: null,
    referencePhotos: [],
    unitType: 'wardrobe',
};

const mockRoomState = {
    quotationRooms: [],
    activeRoomIndex: -1,
};

const mockMetaState = {
    client: { name: 'Test Client', phone: '123' },
    meta: { quoteNo: 'Q-001' },
};

const mockPricingState = {
    pricingControl: { sqftRate: 100 },
};

vi.mock('../../store/v2/useDesignCanvasStore', () => ({
    useDesignCanvasStore: {
        getState: vi.fn(() => mockDesignCanvasState),
        setState: vi.fn(),
    },
}));

vi.mock('../../store/v2/useRoomStore', () => ({
    useRoomStore: {
        getState: vi.fn(() => mockRoomState),
        setState: vi.fn(),
    },
}));

vi.mock('../../store/v2/useQuotationMetaStore', () => ({
    useQuotationMetaStore: {
        getState: vi.fn(() => mockMetaState),
    },
}));

vi.mock('../../store/v2/usePricingStore', () => ({
    usePricingStore: {
        getState: vi.fn(() => mockPricingState),
    },
}));

// Mock window
const mockOpen = vi.fn();
Object.defineProperty(window, 'open', { value: mockOpen });

describe('ExportService', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock states
        mockDesignCanvasState.drawnUnits = [];
        mockRoomState.quotationRooms = [];
        mockRoomState.activeRoomIndex = -1;
        mockMetaState.client = { name: 'Test Client', phone: '123' };
        mockMetaState.meta = { quoteNo: 'Q-001' };
    });

    // =========================================================================
    // canExport Tests
    // =========================================================================

    describe('canExport', () => {
        it('should return false if no units', () => {
            expect(canExport()).toBe(false);
        });

        it('should return true if active room has units (single room)', () => {
            mockDesignCanvasState.drawnUnits = [{ id: 'u1' } as any];
            expect(canExport()).toBe(true);
        });

        it('should return true if any room has units', () => {
            mockRoomState.quotationRooms = [{ drawnUnits: [{ id: 'u1' }] }] as any;
            expect(canExport()).toBe(true);
        });

        it('should return false if rooms exist but have no units', () => {
            mockRoomState.quotationRooms = [{ drawnUnits: [] }, { drawnUnits: [] }] as any;
            expect(canExport()).toBe(false);
        });
    });

    // =========================================================================
    // exportToPDF Tests
    // =========================================================================

    describe('exportToPDF', () => {
        it('should call generateQuotationPDF successfully', () => {
            const result = exportToPDF();

            expect(result.success).toBe(true);
            expect(generateQuotationPDF).toHaveBeenCalled();
            expect(result.data?.filename).toContain('Q-001');
        });

        it('should generate filename using client name if available', () => {
            mockMetaState.client.name = 'John Doe';
            const result = exportToPDF();

            expect(result.success).toBe(true);
            expect(result.data?.filename).toMatch(/John_Doe/); // Regex for safe name
        });

        it('should handle large dataset', () => {
            // Simulate 50 units
            const largeUnits = Array.from({ length: 50 }, (_, i) => ({ id: `u${i}` }));
            mockDesignCanvasState.drawnUnits = largeUnits as any;

            const result = exportToPDF();

            expect(result.success).toBe(true);
            expect(generateQuotationPDF).toHaveBeenCalledWith(
                expect.objectContaining({
                    currentDrawnUnits: largeUnits
                })
            );
        });

        it('should handle errors gracefully', () => {
            (generateQuotationPDF as any).mockImplementationOnce(() => { throw new Error('PDF Generation Failed'); });

            const result = exportToPDF();

            expect(result.success).toBe(false);
            expect(result.error).toBe('PDF Generation Failed');
        });
    });

    // =========================================================================
    // exportToExcel Tests
    // =========================================================================

    describe('exportToExcel', () => {
        it('should call generateQuotationExcel successfully', () => {
            const result = exportToExcel();

            expect(result.success).toBe(true);
            expect(generateQuotationExcel).toHaveBeenCalled();
            expect(result.data?.format).toBe('excel');
        });

        it('should propagate errors from engine', () => {
            (generateQuotationExcel as any).mockImplementationOnce(() => { throw new Error('Excel Error'); });

            const result = exportToExcel();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Excel Error');
        });
    });

    // =========================================================================
    // copyToClipboard Tests
    // =========================================================================

    describe('copyToClipboard', () => {
        it('should call engine function', async () => {
            const result = await copyToClipboard();
            expect(result.success).toBe(true);
            expect(copyQuotationToClipboard).toHaveBeenCalled();
        });

        it('should fail if engine returns false', async () => {
            (copyQuotationToClipboard as any).mockResolvedValueOnce(false);
            const result = await copyToClipboard();
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle exceptions during copy', async () => {
            (copyQuotationToClipboard as any).mockRejectedValueOnce(new Error('Clipboard Access Denied'));
            const result = await copyToClipboard();
            expect(result.success).toBe(false);
            expect(result.error).toContain('Clipboard Access Denied');
        });
    });

    // =========================================================================
    // shareToWhatsApp Tests
    // =========================================================================

    describe('shareToWhatsApp', () => {
        it('should open whatsapp url with copied text', async () => {
            const result = await shareToWhatsApp();

            expect(result.success).toBe(true);
            expect(copyQuotationToClipboard).toHaveBeenCalled();
            expect(mockOpen).toHaveBeenCalledWith(
                expect.stringContaining('https://wa.me/'),
                '_blank'
            );
        });

        it('should include phone number if present', async () => {
            mockMetaState.client.phone = '9876543210';
            await shareToWhatsApp();

            expect(mockOpen).toHaveBeenCalledWith(
                expect.stringContaining('9876543210'),
                '_blank'
            );
        });

        it('should fail if clipboard copy fails', async () => {
            (copyQuotationToClipboard as any).mockResolvedValueOnce(false);
            const result = await shareToWhatsApp();

            expect(result.success).toBe(false);
            expect(mockOpen).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // exportQuotation (Router) Tests
    // =========================================================================

    describe('exportQuotation', () => {
        it('should route to pdf export', async () => {
            const result = await exportQuotation({ format: 'pdf' });
            expect(generateQuotationPDF).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        it('should route to excel export', async () => {
            const result = await exportQuotation({ format: 'excel' });
            expect(generateQuotationExcel).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        it('should route to clipboard export', async () => {
            const result = await exportQuotation({ format: 'clipboard' });
            expect(copyQuotationToClipboard).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        it('should route to whatsapp export', async () => {
            const result = await exportQuotation({ format: 'whatsapp' });
            expect(mockOpen).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        it('should fail for unsupported format', async () => {
            const result = await exportQuotation({ format: 'unknown' as any });
            expect(result.success).toBe(false);
            expect(result.error).toContain('Unsupported');
        });
    });

    // =========================================================================
    // Utilities Tests
    // =========================================================================

    describe('getAvailableFormats', () => {
        it('should return compatible formats', () => {
            const formats = getAvailableFormats();
            expect(formats).toContain('pdf');
            expect(formats).toContain('excel');
            expect(formats).toContain('clipboard');
            expect(formats).toContain('whatsapp');
        });
    });
});
