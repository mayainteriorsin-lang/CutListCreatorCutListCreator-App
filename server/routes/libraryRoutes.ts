import { Router } from 'express';
import { db } from '../db';
import { libraryModules } from '@shared/schema';
import { eq, and, sql, or, ilike } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Protect all library routes with authentication
router.use(requireAuth);

/**
 * Library Module API Routes
 *
 * RESTful API for saving and loading design templates
 * All routes are tenant-scoped (multi-tenant isolation)
 */

// Generate unique share code
function generateShareCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding confusing chars
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// Validation schema for library module
const libraryModuleSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    unitType: z.string().min(1, 'Unit type is required'),
    description: z.string().optional(),
    config: z.any(), // Full module configuration
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    favorite: z.boolean().optional(),
    published: z.boolean().optional(),
});

/**
 * POST /api/library
 * Create a new library module (tenant-scoped)
 */
router.post('/library', async (req: AuthRequest, res) => {
    try {
        const data = libraryModuleSchema.parse(req.body);
        const tenantId = req.user!.tenantId;

        const id = data.id || `lib-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

        await db.insert(libraryModules).values({
            id,
            tenantId,
            name: data.name,
            unitType: data.unitType,
            description: data.description || null,
            config: JSON.stringify(data.config),
            category: data.category || null,
            tags: data.tags?.join(',') || null,
            favorite: data.favorite ? 'true' : 'false',
            published: 'false',
        });

        res.json({
            success: true,
            id,
            message: 'Module saved to library'
        });
    } catch (error) {
        console.error('[LibraryAPI] Save failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save module'
        });
    }
});

/**
 * GET /api/library
 * List all library modules (tenant-scoped)
 */
router.get('/library', async (req: AuthRequest, res) => {
    try {
        const tenantId = req.user!.tenantId;

        const rows = await db.select()
            .from(libraryModules)
            .where(eq(libraryModules.tenantId, tenantId))
            .orderBy(sql`${libraryModules.updatedAt} DESC`);

        const modules = rows.map(r => ({
            id: r.id,
            name: r.name,
            unitType: r.unitType,
            description: r.description,
            config: JSON.parse(r.config),
            category: r.category,
            tags: r.tags ? r.tags.split(',').filter(Boolean) : [],
            favorite: r.favorite === 'true',
            published: r.published === 'true',
            shareCode: r.shareCode,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        }));

        res.json({
            success: true,
            data: modules,
            count: modules.length
        });
    } catch (error) {
        console.error('[LibraryAPI] List failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list modules'
        });
    }
});

/**
 * GET /api/library/:id
 * Get a specific library module (tenant-scoped)
 */
router.get('/library/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user!.tenantId;

        const rows = await db.select()
            .from(libraryModules)
            .where(
                and(
                    eq(libraryModules.id, id as string),
                    eq(libraryModules.tenantId, tenantId as string)
                )
            )
            .limit(1);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Module not found'
            });
        }

        const r = rows[0]!;
        res.json({
            success: true,
            data: {
                id: r.id,
                name: r.name,
                unitType: r.unitType,
                description: r.description,
                config: JSON.parse(r.config),
                category: r.category,
                tags: r.tags ? r.tags.split(',').filter(Boolean) : [],
                favorite: r.favorite === 'true',
                published: r.published === 'true',
                shareCode: r.shareCode,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
            }
        });
    } catch (error) {
        console.error('[LibraryAPI] Get failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get module'
        });
    }
});

/**
 * PUT /api/library/:id
 * Update a library module (tenant-scoped)
 */
router.put('/library/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user!.tenantId;
        const data = libraryModuleSchema.partial().parse(req.body);

        const updateData: Record<string, unknown> = {
            updatedAt: sql`now()`,
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.unitType !== undefined) updateData.unitType = data.unitType;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.config !== undefined) updateData.config = JSON.stringify(data.config);
        if (data.category !== undefined) updateData.category = data.category;
        if (data.tags !== undefined) updateData.tags = data.tags.join(',');
        if (data.favorite !== undefined) updateData.favorite = data.favorite ? 'true' : 'false';

        await db.update(libraryModules)
            .set(updateData)
            .where(
                and(
                    eq(libraryModules.id, id as string),
                    eq(libraryModules.tenantId, tenantId as string)
                )
            );

        res.json({
            success: true,
            message: 'Module updated'
        });
    } catch (error) {
        console.error('[LibraryAPI] Update failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update module'
        });
    }
});

/**
 * DELETE /api/library/:id
 * Delete a library module (tenant-scoped)
 */
router.delete('/library/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user!.tenantId;

        await db.delete(libraryModules)
            .where(
                and(
                    eq(libraryModules.id, id as string),
                    eq(libraryModules.tenantId, tenantId as string)
                )
            );

        res.json({
            success: true,
            message: 'Module deleted'
        });
    } catch (error) {
        console.error('[LibraryAPI] Delete failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete module'
        });
    }
});

/**
 * POST /api/library/:id/publish
 * Publish a module (make it shareable with a unique code)
 */
router.post('/library/:id/publish', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user!.tenantId;

        // Generate unique share code
        const shareCode = generateShareCode();

        await db.update(libraryModules)
            .set({
                published: 'true',
                publishedAt: sql`now()`,
                shareCode,
                updatedAt: sql`now()`,
            })
            .where(
                and(
                    eq(libraryModules.id, id as string),
                    eq(libraryModules.tenantId, tenantId as string)
                )
            );

        res.json({
            success: true,
            shareCode,
            message: 'Module published'
        });
    } catch (error) {
        console.error('[LibraryAPI] Publish failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to publish module'
        });
    }
});

/**
 * POST /api/library/:id/unpublish
 * Unpublish a module
 */
router.post('/library/:id/unpublish', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user!.tenantId;

        await db.update(libraryModules)
            .set({
                published: 'false',
                shareCode: null,
                updatedAt: sql`now()`,
            })
            .where(
                and(
                    eq(libraryModules.id, id as string),
                    eq(libraryModules.tenantId, tenantId as string)
                )
            );

        res.json({
            success: true,
            message: 'Module unpublished'
        });
    } catch (error) {
        console.error('[LibraryAPI] Unpublish failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unpublish module'
        });
    }
});

/**
 * GET /api/library/public/:shareCode
 * Get a published module by share code (no auth required)
 */
router.get('/library/public/:shareCode', async (req, res) => {
    try {
        const { shareCode } = req.params;

        const rows = await db.select()
            .from(libraryModules)
            .where(
                and(
                    eq(libraryModules.shareCode, shareCode),
                    eq(libraryModules.published, 'true')
                )
            )
            .limit(1);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Module not found or not published'
            });
        }

        const r = rows[0]!;
        res.json({
            success: true,
            data: {
                id: r.id,
                name: r.name,
                unitType: r.unitType,
                description: r.description,
                config: JSON.parse(r.config),
                category: r.category,
                tags: r.tags ? r.tags.split(',').filter(Boolean) : [],
                publishedAt: r.publishedAt,
            }
        });
    } catch (error) {
        console.error('[LibraryAPI] Public get failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get module'
        });
    }
});

/**
 * POST /api/library/:id/toggle-favorite
 * Toggle favorite status
 */
router.post('/library/:id/toggle-favorite', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user!.tenantId;

        // Get current favorite status
        const rows = await db.select()
            .from(libraryModules)
            .where(
                and(
                    eq(libraryModules.id, id as string),
                    eq(libraryModules.tenantId, tenantId as string)
                )
            )
            .limit(1);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Module not found'
            });
        }

        const currentFavorite = rows[0]!.favorite === 'true';
        const newFavorite = !currentFavorite;

        await db.update(libraryModules)
            .set({
                favorite: newFavorite ? 'true' : 'false',
                updatedAt: sql`now()`,
            })
            .where(
                and(
                    eq(libraryModules.id, id as string),
                    eq(libraryModules.tenantId, tenantId as string)
                )
            );

        res.json({
            success: true,
            favorite: newFavorite,
            message: newFavorite ? 'Added to favorites' : 'Removed from favorites'
        });
    } catch (error) {
        console.error('[LibraryAPI] Toggle favorite failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle favorite'
        });
    }
});

export default router;
