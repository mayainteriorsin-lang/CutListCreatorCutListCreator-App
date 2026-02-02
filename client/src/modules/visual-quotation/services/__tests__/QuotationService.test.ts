/**
 * QuotationService Tests
 *
 * Tests the quotation service layer which orchestrates:
 * - Quotation lifecycle (create, save, load, delete)
 * - Validation for export
 * - Finalization with pricing lock
 * - Multi-store coordination
 *
 * CRITICAL: Tests the finalize operation which locks pricing permanently.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuotationService, quotationService, isEditable } from '../quotationService';
import { QuotationRepository } from '../../persistence/QuotationRepository';
import { useDesignCanvasStore } from '../../store/v2/useDesignCanvasStore';
import { useQuotationMetaStore } from '../../store/v2/useQuotationMetaStore';
import { usePricingStore } from '../../store/v2/usePricingStore';
import { useRoomStore } from '../../store/v2/useRoomStore';

// Helper to create mock unit
function createMockUnit(overrides = {}) {
  return {
    id: `unit-${Math.random().toString(36).slice(2)}`,
    unitType: 'wardrobe',
    widthMm: 1000,
    heightMm: 2100,
    box: { x: 100, y: 100, width: 100, height: 210 },
    loftEnabled: false,
    loftOnly: false,
    loftWidthMm: 0,
    loftHeightMm: 0,
    ...overrides,
  };
}

describe('QuotationService', () => {
  let service: QuotationService;
  let saveSpy: ReturnType<typeof vi.spyOn>;
  let findByIdSpy: ReturnType<typeof vi.spyOn>;
  let findByLeadIdSpy: ReturnType<typeof vi.spyOn>;
  let deleteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Spy on repository methods
    saveSpy = vi.spyOn(QuotationRepository.prototype, 'save').mockImplementation(async () => {});
    findByIdSpy = vi.spyOn(QuotationRepository.prototype, 'findById').mockImplementation(async () => null);
    findByLeadIdSpy = vi.spyOn(QuotationRepository.prototype, 'findByLeadId').mockImplementation(async () => []);
    deleteSpy = vi.spyOn(QuotationRepository.prototype, 'delete').mockImplementation(async () => true);

    service = new QuotationService();

    // Reset all stores
    useDesignCanvasStore.getState().reset();
    useQuotationMetaStore.getState().reset();
    usePricingStore.getState().reset();
    useRoomStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // create Tests
  // =========================================================================

  describe('create', () => {
    it('should create a new quotation with default state', () => {
      service.create();

      const state = useQuotationMetaStore.getState();
      expect(state.status).toBe('DRAFT');
    });

    it('should reset all stores', () => {
      // First set some state
      useDesignCanvasStore.setState({
        drawnUnits: [createMockUnit()],
      });
      useQuotationMetaStore.setState({
        client: { name: 'Old Client' },
      });

      service.create();

      // Should be reset
      expect(useDesignCanvasStore.getState().drawnUnits).toHaveLength(0);
    });

    it('should set current date', () => {
      service.create();

      const state = useQuotationMetaStore.getState();
      const today = new Date().toISOString().split('T')[0];
      expect(state.meta.dateISO).toBe(today);
    });
  });

  // =========================================================================
  // save Tests
  // =========================================================================

  describe('save', () => {
    it('should call repository on save', async () => {
      await service.save();

      expect(saveSpy).toHaveBeenCalled();
    });

    it('should include all store data in save payload', async () => {
      useDesignCanvasStore.setState({
        drawnUnits: [createMockUnit({ id: 'unit-1' })],
        unitType: 'wardrobe',
      });
      useQuotationMetaStore.setState({
        client: { name: 'Test Client', phone: '123', location: 'Test' },
        meta: { quoteNo: 'Q-999' },
      });
      usePricingStore.setState({
        pricingControl: { sqftRate: 900 },
      });

      await service.save();

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          drawnUnits: expect.arrayContaining([
            expect.objectContaining({ id: 'unit-1' }),
          ]),
          client: expect.objectContaining({ name: 'Test Client' }),
          pricingControl: expect.objectContaining({ sqftRate: 900 }),
        })
      );
    });

    it('should warn when quoteNo is missing', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      useQuotationMetaStore.setState({
        meta: { quoteNo: '' },
      });

      await service.save();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // =========================================================================
  // load Tests
  // =========================================================================

  describe('load', () => {
    it('should return false when quotation not found', async () => {
      findByIdSpy.mockResolvedValue(null);

      const result = await service.load('unknown-id');

      expect(result).toBe(false);
    });

    it('should hydrate stores when quotation found', async () => {
      const mockQuotation = {
        leadId: 'lead-123',
        quoteId: 'quote-456',
        client: { name: 'Loaded Customer', phone: '999', location: 'Loaded' },
        meta: { quoteNo: 'Q-LOADED' },
        status: 'PENDING',
        version: 2,
        drawnUnits: [createMockUnit({ id: 'loaded-unit' })],
        quotationRooms: [],
        activeRoomIndex: 0,
        pricingControl: { sqftRate: 950 },
        unitType: 'kitchen',
      };

      findByIdSpy.mockResolvedValue(mockQuotation);

      const result = await service.load('quote-456');

      expect(result).toBe(true);

      // Verify stores were hydrated
      const metaState = useQuotationMetaStore.getState();
      expect(metaState.client.name).toBe('Loaded Customer');

      const canvasState = useDesignCanvasStore.getState();
      expect(canvasState.drawnUnits).toHaveLength(1);
      expect(canvasState.unitType).toBe('kitchen');
    });
  });

  // =========================================================================
  // loadByLeadId Tests
  // =========================================================================

  describe('loadByLeadId', () => {
    it('should return quotations for lead', async () => {
      findByLeadIdSpy.mockResolvedValue([
        { id: 'q1', quoteNo: 'Q-001' },
        { id: 'q2', quoteNo: 'Q-002' },
      ]);

      const result = await service.loadByLeadId('lead-123');

      expect(findByLeadIdSpy).toHaveBeenCalledWith('lead-123');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no quotations', async () => {
      findByLeadIdSpy.mockResolvedValue([]);

      const result = await service.loadByLeadId('lead-unknown');

      expect(result).toHaveLength(0);
    });
  });

  // =========================================================================
  // validateForExport Tests
  // =========================================================================

  describe('validateForExport', () => {
    it('should validate empty quotation for export', () => {
      useDesignCanvasStore.setState({ drawnUnits: [] });
      useRoomStore.setState({ quotationRooms: [] });
      useQuotationMetaStore.setState({
        client: { name: '', phone: '', location: '' },
      });

      const result = service.validateForExport();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Quotation has no units with dimensions.');
    });

    it('should validate valid quotation for export', () => {
      useDesignCanvasStore.setState({
        drawnUnits: [createMockUnit()],
      });
      useRoomStore.setState({ quotationRooms: [] });
      useQuotationMetaStore.setState({
        client: { name: 'Test Client', phone: '123', location: 'Test' },
      });

      const result = service.validateForExport();

      expect(result.isValid).toBe(true);
    });

    it('should require client name', () => {
      useDesignCanvasStore.setState({
        drawnUnits: [createMockUnit()],
      });
      useQuotationMetaStore.setState({
        client: { name: '', phone: '123', location: 'Test' },
      });

      const result = service.validateForExport();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Client name is missing.');
    });

    it('should validate units in rooms', () => {
      useDesignCanvasStore.setState({ drawnUnits: [] });
      useRoomStore.setState({
        quotationRooms: [
          { drawnUnits: [createMockUnit()] },
        ],
      });
      useQuotationMetaStore.setState({
        client: { name: 'Test Client' },
      });

      const result = service.validateForExport();

      expect(result.isValid).toBe(true);
    });
  });

  // =========================================================================
  // delete Tests
  // =========================================================================

  describe('delete', () => {
    it('should call repository delete', async () => {
      deleteSpy.mockResolvedValue(true);

      const result = await service.delete('quote-123');

      expect(deleteSpy).toHaveBeenCalledWith('quote-123');
      expect(result).toBe(true);
    });

    it('should return false when delete fails', async () => {
      deleteSpy.mockResolvedValue(false);

      const result = await service.delete('unknown-id');

      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // CRITICAL: finalizeQuotation Tests
  // =========================================================================

  describe('finalizeQuotation', () => {
    it('should fail when already finalized', async () => {
      usePricingStore.setState({ pricingLocked: true });

      const result = await service.finalizeQuotation();

      expect(result.success).toBe(false);
      expect(result.error).toContain('already finalized');
    });

    it('should fail when no units to finalize', async () => {
      useDesignCanvasStore.setState({ drawnUnits: [] });

      const result = await service.finalizeQuotation();

      expect(result.success).toBe(false);
      expect(result.error).toContain('No units to finalize');
    });

    it('should calculate and lock pricing', async () => {
      useDesignCanvasStore.setState({
        drawnUnits: [createMockUnit({ widthMm: 1000, heightMm: 2000 })],
      });
      usePricingStore.setState({
        pricingLocked: false,
        pricingControl: { sqftRate: 850, loftSqftRate: 750 },
      });

      const result = await service.finalizeQuotation();

      expect(result.success).toBe(true);

      const pricingState = usePricingStore.getState();
      expect(pricingState.pricingLocked).toBe(true);
      expect(pricingState.finalPrice).not.toBeNull();
    });

    it('should set status to APPROVED', async () => {
      useDesignCanvasStore.setState({
        drawnUnits: [createMockUnit()],
      });

      await service.finalizeQuotation();

      const metaState = useQuotationMetaStore.getState();
      expect(metaState.status).toBe('APPROVED');
    });

    it('should save quotation after finalization', async () => {
      useDesignCanvasStore.setState({
        drawnUnits: [createMockUnit()],
      });

      await service.finalizeQuotation();

      expect(saveSpy).toHaveBeenCalled();
    });

    it('should calculate correct price breakdown', async () => {
      useDesignCanvasStore.setState({
        drawnUnits: [
          createMockUnit({
            id: 'unit-1',
            widthMm: 1000,
            heightMm: 2000,
            loftEnabled: false,
            unitType: 'wardrobe',
          }),
        ],
      });
      usePricingStore.setState({
        pricingControl: {
          sqftRate: 850,
          loftSqftRate: 750,
          shutterLoftShutterRate: 800,
          shutterLoftLoftRate: 700,
        },
      });

      await service.finalizeQuotation();

      const pricingState = usePricingStore.getState();
      const fp = pricingState.finalPrice;

      expect(fp).toHaveProperty('units');
      expect(fp).toHaveProperty('grandTotal');
      expect(fp).toHaveProperty('ratesUsed');
      expect(fp).toHaveProperty('finalizedAt');
      expect(fp.ratesUsed.shutterRate).toBe(850);
    });

    it('should handle units with loft', async () => {
      useDesignCanvasStore.setState({
        drawnUnits: [
          createMockUnit({
            widthMm: 1000,
            heightMm: 2000,
            loftEnabled: true,
            loftWidthMm: 1000,
            loftHeightMm: 400,
          }),
        ],
      });

      const result = await service.finalizeQuotation();

      expect(result.success).toBe(true);

      const fp = usePricingStore.getState().finalPrice;
      expect(fp.totalLoftSqft).toBeGreaterThan(0);
    });

    it('should handle loft-only units', async () => {
      useDesignCanvasStore.setState({
        drawnUnits: [
          createMockUnit({
            widthMm: 1000,
            heightMm: 2000,
            loftOnly: true,
            loftEnabled: true,
            loftWidthMm: 2000,
            loftHeightMm: 400,
          }),
        ],
      });

      const result = await service.finalizeQuotation();

      expect(result.success).toBe(true);

      const fp = usePricingStore.getState().finalPrice;
      // Loft-only should have 0 shutter sqft
      expect(fp.units[0].shutterSqft).toBe(0);
    });
  });
});

// =============================================================================
// isEditable Tests
// =============================================================================

describe('isEditable', () => {
  beforeEach(() => {
    useQuotationMetaStore.getState().reset();
  });

  it('should return true for DRAFT status', () => {
    useQuotationMetaStore.setState({ status: 'DRAFT' });

    expect(isEditable()).toBe(true);
  });

  it('should return false for APPROVED status', () => {
    useQuotationMetaStore.setState({ status: 'APPROVED' });

    expect(isEditable()).toBe(false);
  });

  it('should return false for PENDING status', () => {
    useQuotationMetaStore.setState({ status: 'PENDING' });

    expect(isEditable()).toBe(false);
  });

  it('should return false for REJECTED status', () => {
    useQuotationMetaStore.setState({ status: 'REJECTED' });

    expect(isEditable()).toBe(false);
  });
});

// =============================================================================
// Singleton Instance Tests
// =============================================================================

describe('quotationService singleton', () => {
  it('should be an instance of QuotationService', () => {
    expect(quotationService).toBeInstanceOf(QuotationService);
  });

  it('should have all public methods', () => {
    expect(typeof quotationService.create).toBe('function');
    expect(typeof quotationService.save).toBe('function');
    expect(typeof quotationService.load).toBe('function');
    expect(typeof quotationService.loadByLeadId).toBe('function');
    expect(typeof quotationService.validateForExport).toBe('function');
    expect(typeof quotationService.delete).toBe('function');
    expect(typeof quotationService.finalizeQuotation).toBe('function');
  });
});
