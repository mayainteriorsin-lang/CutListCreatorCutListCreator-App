import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '../../services/logger';
import type { ClientInfo, QuoteMeta, VQStatus } from '../../types';

/**
 * Quotation Meta Store (v2)
 * 
 * Manages CRM data and quotation metadata only.
 * Replaces the CRM portion of visualQuotationStore.
 */

export interface QuotationMetaState {
    // CRM Context
    leadId: string | null;
    quoteId: string | null;

    // Client Information
    client: ClientInfo;

    // Quote Metadata
    meta: QuoteMeta;

    // Status
    status: VQStatus;
    version: number;
    roomType: string;

    // Actions
    setRoomType: (type: string) => void;
    setClientField: (key: keyof ClientInfo, value: string) => void;
    setMetaField: (key: keyof QuoteMeta, value: string) => void;
    setStatus: (status: VQStatus) => void;
    syncFromUrl: (params: { leadId?: string | null; quoteId?: string | null }) => Promise<void>;
    reset: () => void;
}

const initialState = {
    leadId: null,
    quoteId: null,
    client: {
        name: '',
        phone: '',
        location: '',
    },
    meta: {
        quoteNo: '',
        dateISO: new Date().toISOString().split('T')[0],
        validTillISO: '',
    },
    status: 'DRAFT' as VQStatus,
    version: 1,
    roomType: 'Bedroom - Wardrobe',
};

export const useQuotationMetaStore = create<QuotationMetaState>()(
    persist(
        (set, get) => ({
            ...initialState,

            setRoomType: (type) => set({ roomType: type }),

            setClientField: (key, value) => set(state => ({
                client: { ...state.client, [key]: value }
            })),

            setMetaField: (key, value) => set(state => ({
                meta: { ...state.meta, [key]: value }
            })),

            setStatus: (status) => set({ status }),

            syncFromUrl: async ({ leadId, quoteId }) => {
                const current = get(); // Access current state
                const { leadRepository } = await import('../../persistence/LeadRepository');
                const { quotationService } = await import('../../services/quotationService');

                // Lead Data Integration
                if (leadId && leadId !== current.leadId) {
                    set({ leadId });

                    try {
                        const clientInfo = await leadRepository.findById(leadId);
                        if (clientInfo) {
                            set(state => ({
                                client: { ...state.client, ...clientInfo }
                            }));
                        }
                    } catch (error) {
                        logger.error('Failed to load lead data', error instanceof Error ? error : undefined, { leadId, context: 'quotation-meta-store' });
                    }
                }

                // Quote Data Integration
                if (quoteId && quoteId !== current.quoteId) {
                    set({ quoteId });

                    try {
                        const success = await quotationService.load(quoteId);
                        if (!success) {
                            logger.warn('Quotation not found', { quoteId, context: 'quotation-meta-store' });
                        }
                    } catch (error) {
                        logger.error('Failed to load quotation', error instanceof Error ? error : undefined, { quoteId, context: 'quotation-meta-store' });
                    }
                }
            },

            reset: () => set(initialState),
        }),
        {
            name: 'quotation-meta-storage-v2',
            version: 1,
        }
    )
);
