import { quotationService, QuotationService } from './quotationService';
import { pricingService, PricingService } from './pricingService';

/**
 * useServices Hook
 * 
 * Provides access to service instances.
 * This abstraction allows us to inject dependencies or mock services in tests easily later.
 */
export const useServices = () => {
    return {
        quotationService,
        pricingService
    };
};

// Export types for usage
export type { QuotationService, PricingService };
