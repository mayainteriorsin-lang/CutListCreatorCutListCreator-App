
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PricingService, getQuickRatePreview, getAllRatePreviews } from '../pricingService';
import { usePricingStore } from '../../store/v2/usePricingStore';
import { useDesignCanvasStore } from '../../store/v2/useDesignCanvasStore';
import { calculatePricing } from '../../engine/pricingEngine';
import type { RateMode } from '../../types/pricing';

// Mock engine
vi.mock('../../engine/pricingEngine', () => ({
  calculatePricing: vi.fn(),
  getCarcassRate: vi.fn(),
  getShutterRate: vi.fn()
}));

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    service = new PricingService();
    vi.clearAllMocks();
    // Reset stores to default state
    usePricingStore.setState({
      pricingLocked: false,
      finalPrice: null,
      pricingControl: {
        sqftRate: 100, // shutter rate
        loftSqftRate: 80,
        shutterLoftShutterRate: 100,
        shutterLoftLoftRate: 80,
        addOnPricing: {}
      }
    });
    useDesignCanvasStore.setState({ drawnUnits: [] });
  });

  // =========================================================================
  // calculateCurrentPricing Tests
  // =========================================================================

  describe('calculateCurrentPricing', () => {
    it('should return null if no units exist', () => {
      const result = service.calculateCurrentPricing();
      expect(result).toBeNull();
    });

    it('should call calculatePricing when unlocked and units exist', () => {
      const mockUnits = [{ id: 'u1' }];
      useDesignCanvasStore.setState({ drawnUnits: mockUnits as any });

      const mockResult = { total: 1000, subtotal: 1000 };
      (calculatePricing as any).mockReturnValue(mockResult);

      const result = service.calculateCurrentPricing();
      expect(calculatePricing).toHaveBeenCalledWith(mockUnits);
      expect(result).toBe(mockResult);
    });

    it('should return locked price when pricingLocked is true', () => {
      const lockedPrice = {
        units: [{
          unitLabel: 'TestUnit',
          shutterSqft: 10,
          shutterPrice: 500,
          loftSqft: 0,
          loftPrice: 0,
          unitTotal: 500
        }],
        ratesUsed: { shutterRate: 50, loftRate: 40 },
        totalShutterSqft: 10,
        totalLoftSqft: 0,
        subtotal: 500,
        addOnsTotal: 0,
        grandTotal: 590
      };

      usePricingStore.setState({
        pricingLocked: true,
        finalPrice: lockedPrice as any
      });

      const result = service.calculateCurrentPricing();

      expect(calculatePricing).not.toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.total).toBe(lockedPrice.grandTotal);
      expect(result?.units[0].unitType).toBe('TestUnit');
    });

    it('should handle multiple units', () => {
      const mockUnits = [
        { id: 'u1', widthMm: 1000, heightMm: 2000 },
        { id: 'u2', widthMm: 1500, heightMm: 2100 },
        { id: 'u3', widthMm: 800, heightMm: 1800 }
      ];
      useDesignCanvasStore.setState({ drawnUnits: mockUnits as any });

      const mockResult = {
        units: [
          { unitTotal: 1000 },
          { unitTotal: 1500 },
          { unitTotal: 800 }
        ],
        total: 3300,
        subtotal: 3300
      };
      (calculatePricing as any).mockReturnValue(mockResult);

      const result = service.calculateCurrentPricing();

      expect(calculatePricing).toHaveBeenCalledWith(mockUnits);
      expect(result).toBe(mockResult);
    });

    it('should calculate GST from locked price', () => {
      const lockedPrice = {
        units: [{
          unitLabel: 'TestUnit',
          shutterSqft: 10,
          shutterPrice: 1000,
          loftSqft: 0,
          loftPrice: 0,
          unitTotal: 1000
        }],
        ratesUsed: { shutterRate: 100, loftRate: 80 },
        totalShutterSqft: 10,
        totalLoftSqft: 0,
        subtotal: 1000,
        addOnsTotal: 0,
        grandTotal: 1180 // Includes 18% GST
      };

      usePricingStore.setState({
        pricingLocked: true,
        finalPrice: lockedPrice as any
      });

      const result = service.calculateCurrentPricing();

      expect(result?.gst).toBe(Math.round(1180 * 0.18 / 1.18));
    });

    it('should handle locked price with loft units', () => {
      const lockedPrice = {
        units: [{
          unitLabel: 'Wardrobe with Loft',
          shutterSqft: 10,
          shutterPrice: 1000,
          loftSqft: 5,
          loftPrice: 400,
          unitTotal: 1400
        }],
        ratesUsed: { shutterRate: 100, loftRate: 80 },
        totalShutterSqft: 10,
        totalLoftSqft: 5,
        subtotal: 1400,
        addOnsTotal: 0,
        grandTotal: 1652
      };

      usePricingStore.setState({
        pricingLocked: true,
        finalPrice: lockedPrice as any
      });

      const result = service.calculateCurrentPricing();

      expect(result?.totalShutterSqft).toBe(10);
      expect(result?.totalLoftSqft).toBe(5);
      expect(result?.totalSqft).toBe(15);
    });
  });

  // =========================================================================
  // calculate Tests
  // =========================================================================

  describe('calculate', () => {
    it('should calculate pricing for provided units', () => {
      const units = [{ id: 'u1', widthMm: 1000, heightMm: 2000 }];
      const mockResult = { total: 1000, subtotal: 1000 };
      (calculatePricing as any).mockReturnValue(mockResult);

      const result = service.calculate(units);

      expect(calculatePricing).toHaveBeenCalledWith(units);
      expect(result).toBe(mockResult);
    });

    it('should work independently of store state', () => {
      // Store has different units
      useDesignCanvasStore.setState({
        drawnUnits: [{ id: 'store-unit' }] as any
      });

      const customUnits = [{ id: 'custom-unit' }];
      const mockResult = { total: 500, subtotal: 500 };
      (calculatePricing as any).mockReturnValue(mockResult);

      const result = service.calculate(customUnits);

      expect(calculatePricing).toHaveBeenCalledWith(customUnits);
      expect(result).toBe(mockResult);
    });
  });

  // =========================================================================
  // needsUpdate Tests
  // =========================================================================

  describe('needsUpdate', () => {
    it('should always return true', () => {
      expect(service.needsUpdate()).toBe(true);
    });
  });
});

// =============================================================================
// getQuickRatePreview Tests
// =============================================================================

describe('getQuickRatePreview', () => {
  beforeEach(() => {
    usePricingStore.setState({
      pricingLocked: false,
      finalPrice: null,
      pricingControl: {
        sqftRate: 850,
        loftSqftRate: 750,
        shutterLoftShutterRate: 900,
        shutterLoftLoftRate: 800,
        addOnPricing: {}
      }
    });
  });

  it('should return SHUTTER rate preview', () => {
    const preview = getQuickRatePreview('SHUTTER');

    expect(preview.mode).toBe('SHUTTER');
    expect(preview.summaryText).toContain('850');
    expect(preview.breakdown.shutterRate).toBe(850);
  });

  it('should return SHUTTER_LOFT rate preview', () => {
    const preview = getQuickRatePreview('SHUTTER_LOFT');

    expect(preview.mode).toBe('SHUTTER_LOFT');
    expect(preview.summaryText).toContain('900');
    expect(preview.summaryText).toContain('800');
    expect(preview.breakdown.shutterRate).toBe(900);
    expect(preview.breakdown.loftRate).toBe(800);
  });

  it('should return LOFT_ONLY rate preview', () => {
    const preview = getQuickRatePreview('LOFT_ONLY');

    expect(preview.mode).toBe('LOFT_ONLY');
    expect(preview.summaryText).toContain('750');
    expect(preview.breakdown.loftRate).toBe(750);
  });

  it('should use locked rates when pricing is locked', () => {
    const lockedPrice = {
      units: [],
      ratesUsed: {
        shutterRate: 1000,
        loftRate: 900,
        shutterLoftShutterRate: 1100,
        shutterLoftLoftRate: 950
      },
      totalShutterSqft: 0,
      totalLoftSqft: 0,
      subtotal: 0,
      addOnsTotal: 0,
      grandTotal: 0
    };

    usePricingStore.setState({
      pricingLocked: true,
      finalPrice: lockedPrice as any
    });

    const shutterPreview = getQuickRatePreview('SHUTTER');
    const loftPreview = getQuickRatePreview('LOFT_ONLY');
    const combinedPreview = getQuickRatePreview('SHUTTER_LOFT');

    expect(shutterPreview.breakdown.shutterRate).toBe(1000);
    expect(loftPreview.breakdown.loftRate).toBe(900);
    expect(combinedPreview.breakdown.shutterRate).toBe(1100);
    expect(combinedPreview.breakdown.loftRate).toBe(950);
  });

  it('should format rates with Indian locale', () => {
    usePricingStore.setState({
      pricingLocked: false,
      finalPrice: null,
      pricingControl: {
        sqftRate: 12500,
        loftSqftRate: 10000,
        shutterLoftShutterRate: 12500,
        shutterLoftLoftRate: 10000,
        addOnPricing: {}
      }
    });

    const preview = getQuickRatePreview('SHUTTER');

    expect(preview.summaryText).toContain('12,500');
  });

  it('should handle missing shutterLoft rates with fallback', () => {
    usePricingStore.setState({
      pricingLocked: false,
      finalPrice: null,
      pricingControl: {
        sqftRate: 850,
        loftSqftRate: 750,
        shutterLoftShutterRate: 850,
        shutterLoftLoftRate: 750,
        addOnPricing: {}
      }
    });

    const preview = getQuickRatePreview('SHUTTER_LOFT');

    expect(preview.breakdown.shutterRate).toBe(850); // Falls back to sqftRate
    expect(preview.breakdown.loftRate).toBe(750); // Falls back to loftSqftRate
  });

  it('should handle unknown rate mode with default', () => {
    const preview = getQuickRatePreview('UNKNOWN' as RateMode);

    expect(preview.mode).toBe('UNKNOWN');
    expect(preview.breakdown.shutterRate).toBe(850);
  });
});

// =============================================================================
// getAllRatePreviews Tests
// =============================================================================

describe('getAllRatePreviews', () => {
  beforeEach(() => {
    usePricingStore.setState({
      pricingLocked: false,
      finalPrice: null,
      pricingControl: {
        sqftRate: 850,
        loftSqftRate: 750,
        shutterLoftShutterRate: 900,
        shutterLoftLoftRate: 800,
        addOnPricing: {}
      }
    });
  });

  it('should return previews for all modes', () => {
    const previews = getAllRatePreviews();

    expect(previews).toHaveLength(3);
    expect(previews[0].mode).toBe('SHUTTER');
    expect(previews[1].mode).toBe('SHUTTER_LOFT');
    expect(previews[2].mode).toBe('LOFT_ONLY');
  });

  it('should use locked rates for all previews when locked', () => {
    const lockedPrice = {
      units: [],
      ratesUsed: {
        shutterRate: 1000,
        loftRate: 900,
        shutterLoftShutterRate: 1100,
        shutterLoftLoftRate: 950
      },
      totalShutterSqft: 0,
      totalLoftSqft: 0,
      subtotal: 0,
      addOnsTotal: 0,
      grandTotal: 0
    };

    usePricingStore.setState({
      pricingLocked: true,
      finalPrice: lockedPrice as any
    });

    const previews = getAllRatePreviews();

    expect(previews[0].breakdown.shutterRate).toBe(1000);
    expect(previews[1].breakdown.shutterRate).toBe(1100);
    expect(previews[1].breakdown.loftRate).toBe(950);
    expect(previews[2].breakdown.loftRate).toBe(900);
  });
});
