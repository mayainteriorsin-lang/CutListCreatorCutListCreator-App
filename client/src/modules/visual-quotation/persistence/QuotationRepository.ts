/**
 * QuotationRepository - Database persistence for 3D quotations
 *
 * Client-side repository that calls server API endpoints.
 * Falls back gracefully if API is unavailable (localStorage continues to work).
 */

import { logger } from '../services/logger';
import { storageAdapter } from './storageAdapter';

import { PersistedQuotationState } from '../services/types';

// Repository now deals with robust PersistedQuotationState
type VisualQuotationState = PersistedQuotationState;

// LocalStorage configuration
const QUOTATION_STORAGE_PREFIX = 'vq-quotation-';

/**
 * Client-side QuotationRepository
 * Calls server API for persistence
 */
export class QuotationRepository {
    private baseUrl = '/api';

    /**
     * Generate storage key for a quotation
     */
    private getStorageKey(id: string): string {
        return `${QUOTATION_STORAGE_PREFIX}${id}`;
    }

    /**
     * Generate a unique quote ID (UUID v4)
     */
    private generateQuoteId(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    /**
     * Save quotation to LocalStorage
     */
    async saveToLocal(state: VisualQuotationState): Promise<void> {
        try {
            // Ensure quoteId exists
            const quoteId = state.quoteId || this.generateQuoteId();
            const stateWithId = { ...state, quoteId };

            const key = this.getStorageKey(quoteId);
            const success = storageAdapter.setJSON(key, stateWithId);

            if (success) {
                logger.info('Quotation saved to LocalStorage', { id: quoteId, context: 'repository' });
            } else {
                logger.error('Failed to save quotation to LocalStorage', undefined, { id: quoteId, context: 'repository' });
            }
        } catch (error) {
            logger.error('LocalStorage save error', error instanceof Error ? error : undefined, { context: 'repository' });
        }
    }

    /**
     * Load quotation from LocalStorage by ID
     */
    async loadFromLocal(id: string): Promise<VisualQuotationState | null> {
        try {
            const key = this.getStorageKey(id);
            const data = storageAdapter.getJSON<VisualQuotationState | null>(key, null);

            if (data) {
                logger.info('Quotation loaded from LocalStorage', { id, context: 'repository' });
                return data;
            }

            logger.debug('Quotation not found in LocalStorage', { id, context: 'repository' });
            return null;
        } catch (error) {
            logger.error('LocalStorage load error', error instanceof Error ? error : undefined, { context: 'repository' });
            return null;
        }
    }

    /**
     * Find all quotations in LocalStorage
     */
    async findAllLocal(): Promise<VisualQuotationState[]> {
        try {
            const quotations: VisualQuotationState[] = [];

            // Scan localStorage for all quotation keys
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(QUOTATION_STORAGE_PREFIX)) {
                    const data = storageAdapter.getJSON<VisualQuotationState | null>(key, null);
                    if (data) {
                        // Mark as local-only
                        quotations.push({ ...data, localOnly: true } as VisualQuotationState);
                    }
                }
            }

            logger.info('Quotations loaded from LocalStorage', { count: quotations.length, context: 'repository' });
            return quotations;
        } catch (error) {
            logger.error('LocalStorage findAll error', error instanceof Error ? error : undefined, { context: 'repository' });
            return [];
        }
    }

    /**
     * Save quotation to database via API
     */
    async save(state: VisualQuotationState): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/quotations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(state),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            logger.info('Quotation saved to API', { id: result.id, context: 'repository' });

            // Also save to LocalStorage as backup
            await this.saveToLocal(state);
        } catch (error) {
            logger.error('Quotation API save failed, falling back to LocalStorage', error instanceof Error ? error : undefined, { context: 'repository' });
            // Fallback to LocalStorage
            await this.saveToLocal(state);
        }
    }

    /**
     * Load quotation from database by ID
     */
    async findById(id: string): Promise<VisualQuotationState | null> {
        try {
            const response = await fetch(`${this.baseUrl}/quotations/${id}`);

            if (response.status === 404) {
                logger.debug('Quotation not found', { id, context: 'repository' });
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            logger.info('Quotation loaded from API', { id, context: 'repository' });
            return result.data;
        } catch (error) {
            logger.error('Quotation API load failed, trying LocalStorage', error instanceof Error ? error : undefined, { context: 'repository' });
            // Fallback to LocalStorage
            return await this.loadFromLocal(id);
        }
    }

    /**
     * Find quotations by lead ID
     */
    async findByLeadId(leadId: string): Promise<VisualQuotationState[]> {
        try {
            const response = await fetch(`${this.baseUrl}/quotations/lead/${leadId}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            logger.info('Quotations found for lead', { leadId, count: result.count, context: 'repository' });
            return result.data;
        } catch (error) {
            logger.error('Quotation query failed', error instanceof Error ? error : undefined, { context: 'repository' });
            return [];
        }
    }

    /**
     * List all quotations (admin only)
     */
    async findAll(): Promise<VisualQuotationState[]> {
        try {
            const response = await fetch(`${this.baseUrl}/quotations`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            const apiQuotations = result.data;
            logger.info('Quotations listed from API', { count: result.count, context: 'repository' });

            // Merge with LocalStorage quotations
            const localQuotations = await this.findAllLocal();

            // Deduplicate by quoteId (API takes precedence)
            const apiIds = new Set(apiQuotations.map((q: VisualQuotationState) => q.quoteId));
            const uniqueLocal = localQuotations.filter(q => !apiIds.has(q.quoteId));

            const merged = [...apiQuotations, ...uniqueLocal];
            logger.info('Quotations merged', { apiCount: apiQuotations.length, localCount: uniqueLocal.length, total: merged.length, context: 'repository' });

            return merged;
        } catch (error) {
            logger.error('Quotation API list failed, using LocalStorage only', error instanceof Error ? error : undefined, { context: 'repository' });
            // Fallback to LocalStorage only
            return await this.findAllLocal();
        }
    }

    /**
     * Delete quotation by ID
     */
    async delete(id: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/quotations/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            logger.info('Quotation deleted', { id, context: 'repository' });
            return true;
        } catch (error) {
            logger.error('Quotation delete failed', error instanceof Error ? error : undefined, { context: 'repository' });
            return false;
        }
    }
}
