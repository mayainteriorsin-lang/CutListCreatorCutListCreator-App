/**
 * Material Routes
 * 
 * Handles material-related endpoints:
 * - Master settings (sheet dimensions, kerf, defaults)
 * - Plywood brands
 * - Laminate codes
 * - Godown (warehouse) memory
 * - Wood grains preferences
 */

import { Router } from 'express';
import { db } from '../db';
import {
    plywoodBrandMemory,
    insertPlywoodBrandMemorySchema,
    laminateCodeGodown,
    insertLaminateCodeGodownSchema,
    godownMemory,
    insertGodownMemorySchema,
    masterSettingsMemory,
    insertMasterSettingsMemorySchema,
    laminateWoodGrainsPreference
} from '@shared/schema';
import { authenticate, AuthRequest } from '../middleware/auth';
import { tenantRateLimit } from '../middleware/tenantRateLimit';
import { eq, and, sql, desc } from 'drizzle-orm';
import { safeQuery } from '../db/adapter';
import { ok, err } from '../lib/apiEnvelope';

const router = Router();

// Apply authentication and rate limiting to all material routes
router.use(authenticate);
router.use(tenantRateLimit);

/**
 * Master Settings Routes
 */

// GET /api/master-settings-memory
router.get('/master-settings-memory', async (req: AuthRequest, res) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(401).json(err('Unauthorized'));
    }

    try {
        const settings = await safeQuery(
            () => db.select()
                .from(masterSettingsMemory)
                .where(eq(masterSettingsMemory.tenantId, tenantId))
                .limit(1),
            []
        );

        if (settings.length === 0) {
            // Return defaults if no settings exist
            return res.json(ok({
                sheetWidth: '1210',
                sheetHeight: '2420',
                kerf: '5',
                masterLaminateCode: null,
                masterPlywoodBrand: null,
                optimizePlywoodUsage: 'true'
            }));
        }

        res.json(ok(settings[0]));
    } catch (error) {
        console.error('[Material Routes] Error fetching master settings:', error);
        res.status(500).json(err('Failed to fetch master settings'));
    }
});

// POST /api/master-settings-memory
router.post('/master-settings-memory', async (req: AuthRequest, res) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(401).json(err('Unauthorized'));
    }

    try {
        const validation = insertMasterSettingsMemorySchema.safeParse({
            ...req.body,
            tenantId
        });

        if (!validation.success) {
            return res.status(400).json(err('Invalid data', validation.error));
        }

        // Upsert: update if exists, insert if not
        await db.insert(masterSettingsMemory)
            .values(validation.data)
            .onConflictDoUpdate({
                target: masterSettingsMemory.tenantId,
                set: {
                    ...validation.data,
                    updatedAt: sql`NOW()`
                }
            });

        res.json(ok({ message: 'Master settings saved successfully' }));
    } catch (error) {
        console.error('[Material Routes] Error saving master settings:', error);
        res.status(500).json(err('Failed to save master settings'));
    }
});

// PATCH /api/master-settings-memory
router.patch('/master-settings-memory', async (req: AuthRequest, res) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(401).json(err('Unauthorized'));
    }

    try {
        const updates = req.body;

        await db.update(masterSettingsMemory)
            .set({
                ...updates,
                updatedAt: sql`NOW()`
            })
            .where(eq(masterSettingsMemory.tenantId, tenantId));

        res.json(ok({ message: 'Master settings updated successfully' }));
    } catch (error) {
        console.error('[Material Routes] Error updating master settings:', error);
        res.status(500).json(err('Failed to update master settings'));
    }
});

/**
 * Plywood Brand Routes
 */

// GET /api/plywood-brand-memory
router.get('/plywood-brand-memory', async (req: AuthRequest, res) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(401).json(err('Unauthorized'));
    }

    try {
        const brands = await safeQuery(
            () => db.select()
                .from(plywoodBrandMemory)
                .where(eq(plywoodBrandMemory.tenantId, tenantId))
                .orderBy(plywoodBrandMemory.createdAt),
            []
        );

        res.json(ok(brands));
    } catch (error) {
        console.error('[Material Routes] Error fetching plywood brands:', error);
        res.json(ok([]));
    }
});

// POST /api/plywood-brand-memory
router.post('/plywood-brand-memory', async (req: AuthRequest, res) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(401).json(err('Unauthorized'));
    }

    try {
        const validation = insertPlywoodBrandMemorySchema.safeParse({
            ...req.body,
            tenantId
        });

        if (!validation.success) {
            return res.status(400).json(err('Invalid data', validation.error));
        }

        const { brand } = validation.data;

        // Check if brand already exists for this tenant
        const existing = await db.select()
            .from(plywoodBrandMemory)
            .where(and(
                eq(plywoodBrandMemory.brand, brand),
                eq(plywoodBrandMemory.tenantId, tenantId)
            ))
            .limit(1);

        if (existing.length > 0) {
            return res.json(ok({ message: 'Brand already exists', brand }));
        }

        await db.insert(plywoodBrandMemory).values(validation.data);
        res.json(ok({ message: 'Brand saved successfully', brand }));
    } catch (error) {
        console.error('[Material Routes] Error saving plywood brand:', error);
        res.status(500).json(err('Failed to save plywood brand'));
    }
});

/**
 * Laminate Code Routes
 */

// GET /api/laminate-code-godown
router.get('/laminate-code-godown', async (req: AuthRequest, res) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(401).json(err('Unauthorized'));
    }

    try {
        const codes = await safeQuery(
            () => db.select()
                .from(laminateCodeGodown)
                .where(eq(laminateCodeGodown.tenantId, tenantId))
                .orderBy(laminateCodeGodown.createdAt),
            []
        );

        res.json(ok(codes));
    } catch (error) {
        console.error('[Material Routes] Error fetching laminate codes:', error);
        res.json(ok([]));
    }
});

// POST /api/laminate-code-godown
router.post('/laminate-code-godown', async (req: AuthRequest, res) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(401).json(err('Unauthorized'));
    }

    try {
        const validation = insertLaminateCodeGodownSchema.safeParse({
            ...req.body,
            tenantId
        });

        if (!validation.success) {
            return res.status(400).json(err('Invalid data', validation.error));
        }

        const { code } = validation.data;

        // Check if code already exists for this tenant
        const existing = await db.select()
            .from(laminateCodeGodown)
            .where(and(
                eq(laminateCodeGodown.code, code),
                eq(laminateCodeGodown.tenantId, tenantId)
            ))
            .limit(1);

        if (existing.length > 0) {
            return res.json(ok({ message: 'Code already exists', code }));
        }

        await db.insert(laminateCodeGodown).values(validation.data);
        res.json(ok({ message: 'Laminate code saved successfully', code }));
    } catch (error) {
        console.error('[Material Routes] Error saving laminate code:', error);
        res.status(500).json(err('Failed to save laminate code'));
    }
});

/**
 * Godown (Warehouse) Memory Routes
 */

// GET /api/godown-memory
router.get('/godown-memory', async (req: AuthRequest, res) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(401).json(err('Unauthorized'));
    }

    try {
        const godowns = await safeQuery(
            () => db.select()
                .from(godownMemory)
                .where(eq(godownMemory.tenantId, tenantId))
                .orderBy(desc(godownMemory.createdAt)),
            []
        );

        res.json(ok(godowns));
    } catch (error) {
        console.error('[Material Routes] Error fetching godown memory:', error);
        res.json(ok([]));
    }
});

// POST /api/godown-memory
router.post('/godown-memory', async (req: AuthRequest, res) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(401).json(err('Unauthorized'));
    }

    try {
        const validation = insertGodownMemorySchema.safeParse({
            ...req.body,
            tenantId
        });

        if (!validation.success) {
            return res.status(400).json(err('Invalid data', validation.error));
        }

        const { godownName } = validation.data;

        // Check if godown already exists for this tenant
        const existing = await db.select()
            .from(godownMemory)
            .where(and(
                eq(godownMemory.godownName, godownName),
                eq(godownMemory.tenantId, tenantId)
            ))
            .limit(1);

        if (existing.length > 0) {
            return res.json(ok({ message: 'Godown already exists', godownName }));
        }

        await db.insert(godownMemory).values(validation.data);
        res.json(ok({ message: 'Godown saved successfully', godownName }));
    } catch (error) {
        console.error('[Material Routes] Error saving godown:', error);
        res.status(500).json(err('Failed to save godown'));
    }
});

/**
 * Wood Grains Preferences Routes
 */

// GET /api/wood-grains-preferences
router.get('/wood-grains-preferences', async (req: AuthRequest, res) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(401).json(err('Unauthorized'));
    }

    try {
        const preferences = await safeQuery(
            () => db.select()
                .from(laminateWoodGrainsPreference)
                .where(eq(laminateWoodGrainsPreference.tenantId, tenantId)),
            []
        );

        res.json(ok(preferences));
    } catch (error) {
        console.error('[Material Routes] Error fetching wood grains preferences:', error);
        res.json(ok([]));
    }
});

// POST /api/wood-grains-preferences
router.post('/wood-grains-preferences', async (req: AuthRequest, res) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(401).json(err('Unauthorized'));
    }

    try {
        const { laminateCode, hasWoodGrains } = req.body;

        if (!laminateCode || typeof hasWoodGrains !== 'boolean') {
            return res.status(400).json(err('Invalid data'));
        }

        // Upsert preference
        await db.insert(laminateWoodGrainsPreference)
            .values({
                laminateCode,
                woodGrainsEnabled: hasWoodGrains ? 'true' : 'false'
            })
            .onConflictDoUpdate({
                target: [laminateWoodGrainsPreference.laminateCode],
                set: { woodGrainsEnabled: hasWoodGrains ? 'true' : 'false' }
            });

        res.json(ok({ message: 'Wood grains preference saved successfully' }));
    } catch (error) {
        console.error('[Material Routes] Error saving wood grains preference:', error);
        res.status(500).json(err('Failed to save wood grains preference'));
    }
});

/**
 * Plywood List (Aggregated)
 */
router.get('/plywood-list', async (req: AuthRequest, res) => {
    // Tenant filtering temporarily disabled as plywoodBrandMemory lacks tenantId
    // const tenantId = req.user?.tenantId; 

    try {
        const brands = await safeQuery(
            () => db.select()
                .from(plywoodBrandMemory)
                // .where(eq(plywoodBrandMemory.tenantId, tenantId)) 
                .orderBy(plywoodBrandMemory.createdAt),
            []
        );

        res.json(ok(brands));
    } catch (error) {
        console.error('[Material Routes] Error fetching plywood list:', error);
        res.json(ok([]));
    }
});

/**
 * Laminate List (Aggregated)
 */
router.get('/laminate-list', async (req: AuthRequest, res) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        return res.status(401).json(err('Unauthorized'));
    }

    try {
        const codes = await safeQuery(
            () => db.select()
                .from(laminateCodeGodown)
                .where(eq(laminateCodeGodown.tenantId, tenantId))
                .orderBy(laminateCodeGodown.createdAt),
            []
        );

        res.json(ok(codes));
    } catch (error) {
        console.error('[Material Routes] Error fetching laminate list:', error);
        res.json(ok([]));
    }
});

export default router;
