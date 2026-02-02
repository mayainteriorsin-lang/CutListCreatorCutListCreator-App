/**
 * LeadRepository - Database persistence for Leads/CRM
 *
 * Client-side repository that calls server API endpoints.
 */

import { logger } from '../services/logger';
import type { ClientInfo } from '../types';

export class LeadRepository {
    private baseUrl = '/api';

    /**
     * Get demo lead for testing
     */
    private getDemoLead(): ClientInfo {
        return {
            name: 'Demo Client',
            phone: '+91 98765 43210',
            location: 'Mumbai, Maharashtra',
        };
    }

    /**
     * Find lead by ID from CRM
     */
    async findById(id: string): Promise<ClientInfo | null> {
        // Return demo lead for testing
        if (id === 'demo-lead') {
            logger.info('Returning demo lead', { id, context: 'lead-repository' });
            return this.getDemoLead();
        }

        try {
            const response = await fetch(`${this.baseUrl}/leads/${id}`);

            if (response.status === 404) {
                logger.debug('Lead not found', { id, context: 'lead-repository' });
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            logger.info('Lead loaded', { id, context: 'lead-repository' });

            // Map CRM data to ClientInfo
            return {
                name: result.name || result.fullName || '',
                phone: result.phone || result.mobile || '',
                location: result.location || result.address || result.city || '',
                // Add other mappings as needed
            };
        } catch (error) {
            logger.error('Lead load failed', error instanceof Error ? error : undefined, { context: 'lead-repository' });
            return null;
        }
    }
}

export const leadRepository = new LeadRepository();
