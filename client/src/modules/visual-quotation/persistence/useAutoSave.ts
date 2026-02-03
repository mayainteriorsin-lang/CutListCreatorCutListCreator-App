import { useEffect, useRef, useCallback } from 'react';
import { useQuotationMetaStore } from '../store/v2/useQuotationMetaStore';
import { useDesignCanvasStore } from '../store/v2/useDesignCanvasStore';
import { usePricingStore } from '../store/v2/usePricingStore';
import { quotationService } from '../services/quotationService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '../services/logger';

/**
 * Auto-Save Hook (Service Layer Integrated)
 * 
 * Automatically saves the quotation state to the database via QuotationService.
 * - Debounced (30 seconds)
 * - Save on unmount/unload
 * - Manual save trigger
 */
export const useAutoSave = () => {
    const { toast } = useToast();
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedStateRef = useRef<string>('');

    // Listen to V2 stores
    const metaState = useQuotationMetaStore();
    const canvasState = useDesignCanvasStore();
    const pricingState = usePricingStore();

    // Combined state dependencies for effect
    const state = {
        meta: metaState.meta,
        client: metaState.client,
        drawnUnits: canvasState.drawnUnits,
        wardrobeConfig: pricingState.wardrobeConfig
    };

    /**
     * Perform the save operation via Service
     */
    const performSave = useCallback(async (isAuto = true) => {
        try {
            // Using Service to save ensures all business rules are checked
            await quotationService.save();

            if (!isAuto) {
                logger.info('Manual save complete', { context: 'auto-save' });
            } else {
                logger.debug('Auto-save complete', { context: 'auto-save' });
            }

            // Update last saved reference
            lastSavedStateRef.current = JSON.stringify({
                meta: useQuotationMetaStore.getState().meta,
                client: useQuotationMetaStore.getState().client,
                drawnUnits: useDesignCanvasStore.getState().drawnUnits,
                wardrobeConfig: usePricingStore.getState().wardrobeConfig
            });
        } catch (error) {
            logger.error('Auto-save failed', { error: String(error), isAuto, context: 'auto-save' });
            if (!isAuto) {
                toast({
                    title: "Save Failed",
                    description: "Could not save quotation. Please try again.",
                    variant: "destructive",
                });
            }
        }
    }, [toast]);

    useEffect(() => {
        // Only save if there's actual quotation data
        if (!state.meta.quoteNo) {
            return;
        }

        // Debounce: Don't save if state hasn't changed
        const currentStateString = JSON.stringify(state);

        if (currentStateString === lastSavedStateRef.current) {
            return;
        }

        // Clear previous timer
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Schedule save after 30 seconds of inactivity
        saveTimeoutRef.current = setTimeout(async () => {
            logger.debug('Saving quotation to database', { context: 'auto-save' });
            await performSave(true);
            lastSavedStateRef.current = currentStateString;
        }, 30000); // 30 seconds

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [state, performSave]);

    // Save on page unload (before user closes tab)
    useEffect(() => {
        const handleBeforeUnload = async () => {
            if (state.meta.quoteNo) {
                logger.info('Saving before page unload', { context: 'auto-save' });
                // We use the service directly here to ensure it fires immediately
                // preventing stale closure issues with performSave
                quotationService.save();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [state.meta.quoteNo]);

    // Manual save trigger (for immediate saves)
    useEffect(() => {
        // Expose manual save function to window for debugging
        (window as any).__saveQuotation = async () => {
            logger.info('Manual save triggered', { context: 'auto-save' });
            await performSave(false);
        };

        return () => {
            delete (window as any).__saveQuotation;
        };
    }, [performSave]);
}
