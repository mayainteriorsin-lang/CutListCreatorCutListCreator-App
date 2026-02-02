import { QuotationRepository } from '../persistence/QuotationRepository';
import { useQuotationMetaStore } from '../store/v2/useQuotationMetaStore';
import { usePricingStore, FinalPriceBreakdown } from '../store/v2/usePricingStore';
import { useDesignCanvasStore } from '../store/v2/useDesignCanvasStore';
import { useRoomStore } from '../store/v2/useRoomStore';
import { logger } from './logger';
import { PersistedQuotationState } from './types';

/**
 * Validation Result Interface
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Quotation Service
 * 
 * Central business logic for Quotation Lifecycle.
 * - Creation
 * - Persisting (Save/Load)
 * - Validation
 * - Status Management
 */
export class QuotationService {
  private repository: QuotationRepository;

  constructor() {
    this.repository = new QuotationRepository();
  }

  /**
   * Create a new quotation
   * Resets all stores to initial state
   */
  create(): void {
    useQuotationMetaStore.getState().reset();
    usePricingStore.getState().reset();
    useDesignCanvasStore.getState().reset();
    useRoomStore.getState().reset();

    // Set initial metadata
    const metaStore = useQuotationMetaStore.getState();
    metaStore.setMetaField('dateISO', new Date().toISOString().split('T')[0]);
    metaStore.setStatus('DRAFT');
  }

  /**
   * Save the current quotation state
   * Orchestrates gathering data from all stores and persisting it
   */
  async save(): Promise<void> {
    // Gather state from V2 stores
    const metaState = useQuotationMetaStore.getState();
    const canvasState = useDesignCanvasStore.getState();
    const pricingState = usePricingStore.getState();
    const roomState = useRoomStore.getState();

    const state = {
      // Meta & Client
      leadId: metaState.leadId,
      quoteId: metaState.quoteId,
      client: metaState.client,
      meta: metaState.meta,
      status: metaState.status,
      version: metaState.version,

      // Canvas & Rooms
      drawnUnits: canvasState.drawnUnits,
      wardrobeBox: canvasState.wardrobeBox,
      loftBox: canvasState.loftBox,
      roomPhoto: canvasState.roomPhoto,
      referencePhotos: canvasState.referencePhotos,
      scale: canvasState.scale,
      quotationRooms: roomState.quotationRooms,
      activeRoomIndex: roomState.activeRoomIndex,
      unitType: canvasState.unitType,
      customUnitTypes: canvasState.customUnitTypes,

      // Pricing & Config
      pricingControl: pricingState.pricingControl,
      wardrobeConfig: pricingState.wardrobeConfig,
      materialPricing: pricingState.materialPricing,
      pricingConfig: pricingState.wardrobeConfig, // Legacy compat just in case

      // Legacy required fields
      activeUnitIndex: canvasState.activeUnitIndex,
      drawMode: canvasState.drawMode,
      editMode: canvasState.editMode,
      activePhotoId: canvasState.activePhotoId,
      floorPlanEnabled: canvasState.floorPlanEnabled,
      canvas3DViewEnabled: canvasState.canvas3DViewEnabled,
      shutterCount: canvasState.shutterCount,
      shutterDividerXs: canvasState.shutterDividerXs,
      loftEnabled: canvasState.loftEnabled,
      loftHeightRatio: canvasState.loftHeightRatio,
      loftShutterCount: canvasState.loftShutterCount,
      loftDividerXs: canvasState.loftDividerXs,
    };

    // 2. Validate essential data before saving (optional, but good practice)
    if (!state.meta.quoteNo) {
      logger.warn('Saving quotation without Quote No', { context: 'quotation-service' });
    }

    // 3. Persist via repository
    await this.repository.save(state as unknown as PersistedQuotationState);
  }

  /**
   * Load a quotation by ID
   */
  async load(id: string): Promise<boolean> {
    const quotation = await this.repository.findById(id);

    if (!quotation) {
      return false;
    }

    // Hydrate V2 stores
    const data = quotation as unknown as PersistedQuotationState;

    // Meta
    useQuotationMetaStore.setState({
      leadId: data.leadId,
      quoteId: data.quoteId,
      client: data.client,
      meta: data.meta,
      status: data.status,
      version: data.version
    });

    // Pricing
    usePricingStore.setState({
      pricingControl: data.pricingControl,
      wardrobeConfig: data.wardrobeConfig || data.pricingConfig,
      materialPricing: data.materialPricing
    });

    // Rooms
    useRoomStore.setState({
      quotationRooms: data.quotationRooms || [],
      activeRoomIndex: data.activeRoomIndex || -1
    });

    // Canvas (Active Room)
    // Ideally we should load ONLY the active room state, but the legacy format saves EVERYTHING in the root.
    // If quotationRooms exists, the active state is usually derived from `activeRoomIndex`?
    // In the legacy `load`, `setState(quotation)` overwrites everything.
    // So we should do the same for DesignCanvas.
    useDesignCanvasStore.setState({
      drawnUnits: data.drawnUnits || [],
      wardrobeBox: data.wardrobeBox,
      loftBox: data.loftBox,
      roomPhoto: data.roomPhoto,
      referencePhotos: data.referencePhotos || [],
      scale: data.scale,
      activeUnitIndex: data.activeUnitIndex || 0,
      unitType: data.unitType || 'wardrobe',
      customUnitTypes: data.customUnitTypes || [],
      drawMode: false, // Reset interaction states
      editMode: "shutter",
      canvas3DViewEnabled: data.canvas3DViewEnabled || false,
      floorPlanEnabled: data.floorPlanEnabled !== false, // default true
      shutterCount: data.shutterCount,
      shutterDividerXs: data.shutterDividerXs,
      loftEnabled: data.loftEnabled,
      loftHeightRatio: data.loftHeightRatio,
      loftShutterCount: data.loftShutterCount,
      loftDividerXs: data.loftDividerXs
    });

    return true;
  }

  /**
   * Load quotations for a specific lead
   * Returns the list of quotations found
   */
  async loadByLeadId(leadId: string) {
    return await this.repository.findByLeadId(leadId);
  }

  /**
   * Validate the quotation for Export (PDF/Excel)
   */
  validateForExport(): ValidationResult {
    const canvasState = useDesignCanvasStore.getState();
    const roomState = useRoomStore.getState();
    const metaState = useQuotationMetaStore.getState();
    const errors: string[] = [];

    const hasUnits = canvasState.drawnUnits.some(u => u.widthMm > 0) ||
      roomState.quotationRooms.some(r => r.drawnUnits.length > 0);

    if (!hasUnits) {
      errors.push("Quotation has no units with dimensions.");
    }

    // Check for client name
    if (!metaState.client.name) {
      errors.push("Client name is missing.");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Delete a quotation
   */
  async delete(id: string): Promise<boolean> {
    return await this.repository.delete(id);
  }

  /**
   * Finalize Quotation - LOCK PRICING FOREVER
   *
   * This is a ONE-WAY operation:
   * 1. Calculate final price from current units
   * 2. Store finalPrice breakdown
   * 3. Set pricingLocked = true
   * 4. Set status to APPROVED
   * 5. Save quotation
   *
   * After this, price is READ-ONLY and will never change.
   */
  async finalizeQuotation(): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Get current state
      const pricingState = usePricingStore.getState();
      const canvasState = useDesignCanvasStore.getState();
      const metaState = useQuotationMetaStore.getState();

      // Check if already locked
      if (pricingState.pricingLocked) {
        return { success: false, error: 'Quotation is already finalized' };
      }

      // 2. Get drawn units from V2 store
      const drawnUnits = canvasState.drawnUnits || [];

      if (drawnUnits.length === 0) {
        return { success: false, error: 'No units to finalize' };
      }

      // 3. Get current rates
      const { pricingControl } = pricingState;
      const shutterRate = pricingControl.sqftRate;
      const loftRate = pricingControl.loftSqftRate;
      const shutterLoftShutterRate = pricingControl.shutterLoftShutterRate ?? shutterRate;
      const shutterLoftLoftRate = pricingControl.shutterLoftLoftRate ?? loftRate;

      // 4. Calculate final price breakdown - ONCE
      const mmToInchesNum = (mm: number) => mm / 25.4;
      let totalShutterSqft = 0;
      let totalLoftSqft = 0;
      let subtotal = 0;
      const addOnsTotal = 0;

      const unitBreakdowns: FinalPriceBreakdown['units'] = drawnUnits.map((unit, idx) => {
        const isLoftOnly = unit.loftOnly || false;
        const hasShutterDimensions = unit.widthMm > 0 && unit.heightMm > 0;
        const hasLoftDimensions = (unit.loftWidthMm || 0) > 0 && (unit.loftHeightMm || 0) > 0;
        const hasLoft = unit.loftEnabled || hasLoftDimensions;

        // Calculate sqft
        const shutterSqft = hasShutterDimensions && !isLoftOnly
          ? (mmToInchesNum(unit.widthMm) * mmToInchesNum(unit.heightMm)) / 144
          : 0;
        const loftSqft = hasLoftDimensions
          ? (mmToInchesNum(unit.loftWidthMm || 0) * mmToInchesNum(unit.loftHeightMm || 0)) / 144
          : 0;

        // Determine effective rates
        const effectiveShutterRate = hasLoft ? shutterLoftShutterRate : shutterRate;
        const effectiveLoftRate = hasLoft ? shutterLoftLoftRate : loftRate;

        // Calculate prices
        const shutterPrice = isLoftOnly ? 0 : shutterSqft * effectiveShutterRate;
        const loftPrice = loftSqft * effectiveLoftRate;
        const unitTotal = shutterPrice + loftPrice;

        totalShutterSqft += shutterSqft;
        totalLoftSqft += loftSqft;
        subtotal += unitTotal;

        return {
          unitId: unit.id || `unit-${idx}`,
          unitLabel: `#${idx + 1} ${unit.unitType || 'wardrobe'}`,
          shutterSqft: Number(shutterSqft.toFixed(2)),
          shutterPrice: Math.round(shutterPrice),
          loftSqft: Number(loftSqft.toFixed(2)),
          loftPrice: Math.round(loftPrice),
          unitTotal: Math.round(unitTotal),
        };
      });

      // 5. Create final price breakdown
      const finalPrice: FinalPriceBreakdown = {
        units: unitBreakdowns,
        totalShutterSqft: Number(totalShutterSqft.toFixed(2)),
        totalLoftSqft: Number(totalLoftSqft.toFixed(2)),
        subtotal: Math.round(subtotal),
        addOnsTotal: Math.round(addOnsTotal),
        grandTotal: Math.round(subtotal + addOnsTotal),
        ratesUsed: {
          shutterRate,
          loftRate,
          shutterLoftShutterRate,
          shutterLoftLoftRate,
        },
        finalizedAt: new Date().toISOString(),
      };

      // 6. LOCK PRICING - This is the critical step
      pricingState.lockPricing(finalPrice);

      // 7. Set status to APPROVED
      metaState.setStatus('APPROVED');

      // 8. Save the quotation
      await this.save();

      logger.info('Quotation finalized - price locked', { grandTotal: finalPrice.grandTotal, context: 'quotation-service' });

      return { success: true };
    } catch (error) {
      logger.error('Quotation finalize failed', { error: String(error), context: 'quotation-service' });
      return { success: false, error: String(error) };
    }
  }
}

// Singleton instance
export const quotationService = new QuotationService();

/**
 * Check if the quotation is editable
 * A quotation is editable when it's in DRAFT status
 */
export function isEditable(): boolean {
  const state = useQuotationMetaStore.getState();
  return state.status === 'DRAFT';
}
