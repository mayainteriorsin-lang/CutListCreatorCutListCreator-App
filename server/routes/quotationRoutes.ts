import { Router } from 'express';
import { db } from '../db';
import { quotations } from '@shared/schema';
import { eq, sql, and } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Protect all quotation routes with authentication
router.use(requireAuth);

/**
 * Quotation API Routes
 * 
 * RESTful API for quotation persistence
 * All routes are tenant-scoped (multi-tenant isolation)
 */

// Validation schema for quotation state
const quotationStateSchema = z.object({
    leadId: z.string().nullable(),
    quoteId: z.string().nullable(),
    client: z.object({
        name: z.string(),
        phone: z.string(),
        location: z.string(),
    }),
    meta: z.object({
        quoteNo: z.string(),
        dateISO: z.string(),
        validTillISO: z.string(),
    }),
    status: z.enum(['DRAFT', 'SENT', 'APPROVED', 'REJECTED']),
    // ... rest of state (we'll accept any additional fields)
}).passthrough();

/**
 * POST /api/quotations
 * Create or update a quotation (tenant-scoped)
 */
router.post('/quotations', async (req: AuthRequest, res) => {
    try {
        const state = quotationStateSchema.parse(req.body);
        const tenantId = req.user!.tenantId; // Get from authenticated user

        const id = state.quoteId || `quot-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

        await db.insert(quotations).values({
            id,
            tenantId, // Use authenticated tenant ID
            leadId: state.leadId || null,
            quoteId: state.meta.quoteNo,
            state: JSON.stringify(state),
            clientName: state.client.name || null,
            status: state.status,
        }).onConflictDoUpdate({
            target: quotations.id,
            set: {
                state: JSON.stringify(state),
                clientName: state.client.name || null,
                status: state.status,
                updatedAt: sql`now()`,
            },
        });

        res.json({
            success: true,
            id,
            message: 'Quotation saved successfully'
        });
    } catch (error) {
        console.error('[QuotationAPI] Save failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save quotation'
        });
    }
});

/**
 * GET /api/quotations/:id
 * Get quotation by ID (tenant-scoped)
 */
router.get('/quotations/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user!.tenantId;

        const rows = await db.select()
            .from(quotations)
            .where(
                and(
                    eq(quotations.id, id as string),
                    eq(quotations.tenantId, tenantId as string)
                )
            )
            .limit(1);

        if (rows.length === 0 || !rows[0]) {
            return res.status(404).json({
                success: false,
                error: 'Quotation not found'
            });
        }

        const quotation = JSON.parse(rows[0].state);
        res.json({
            success: true,
            data: quotation
        });
    } catch (error) {
        console.error('[QuotationAPI] Load failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load quotation'
        });
    }
});

/**
 * GET /api/quotations/lead/:leadId
 * Get all quotations for a lead (tenant-scoped)
 */
router.get('/quotations/lead/:leadId', async (req: AuthRequest, res) => {
    try {
        const { leadId } = req.params;
        const tenantId = req.user!.tenantId;

        const rows = await db.select()
            .from(quotations)
            .where(
                and(
                    eq(quotations.leadId, leadId as string),
                    eq(quotations.tenantId, tenantId) // Tenant isolation
                )
            );

        const quotationsList = rows.map(r => JSON.parse(r.state));

        res.json({
            success: true,
            data: quotationsList,
            count: quotationsList.length
        });
    } catch (error) {
        console.error('[QuotationAPI] Query failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to query quotations'
        });
    }
});

/**
 * GET /api/quotations
 * List all quotations (tenant-scoped)
 * PHASE 2: Fixed tenant isolation - now filters by authenticated tenantId
 */
router.get('/quotations', async (req: AuthRequest, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({
                success: false,
                error: 'No tenant context available',
                code: 'NO_TENANT_CONTEXT'
            });
        }

        // PHASE 2: Tenant-scoped query
        const rows = await db.select()
            .from(quotations)
            .where(eq(quotations.tenantId, tenantId));

        const quotationsList = rows.map(r => ({
            id: r.id,
            quoteId: r.quoteId,
            clientName: r.clientName,
            status: r.status,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        }));

        res.json({
            success: true,
            data: quotationsList,
            count: quotationsList.length
        });
    } catch (error) {
        console.error('[QuotationAPI] List failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list quotations'
        });
    }
});

/**
 * DELETE /api/quotations/:id
 * Delete quotation by ID (tenant-scoped)
 * PHASE 2: Fixed tenant isolation - now verifies ownership before delete
 */
router.delete('/quotations/:id', async (req: AuthRequest, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({
                success: false,
                error: 'No tenant context available',
                code: 'NO_TENANT_CONTEXT'
            });
        }

        const id = req.params.id as string;
        const tenant = tenantId as string; // Narrow type for drizzle-orm

        // PHASE 2: Verify quotation belongs to this tenant before delete
        const [existing] = await db.select()
            .from(quotations)
            .where(
                and(
                    eq(quotations.id, id),
                    eq(quotations.tenantId, tenant)
                )
            )
            .limit(1);

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Quotation not found'
            });
        }

        // PHASE 2: Tenant-scoped delete
        await db.delete(quotations).where(
            and(
                eq(quotations.id, id),
                eq(quotations.tenantId, tenant)
            )
        );

        res.json({
            success: true,
            message: 'Quotation deleted successfully'
        });
    } catch (error) {
        console.error('[QuotationAPI] Delete failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete quotation'
        });
    }
});

export default router;
