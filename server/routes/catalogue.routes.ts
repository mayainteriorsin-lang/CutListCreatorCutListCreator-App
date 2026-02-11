/**
 * Laminate Catalogue Routes
 * 
 * Handles laminate catalogue PDF upload, retrieval, listing, and deletion.
 * Uses both ObjectStorageService and FileStorage abstraction.
 * 
 * Routes:
 * - POST   /api/laminate-catalogue            - Upload catalogue PDF
 * - GET    /api/laminate-catalogue/:filename   - Download catalogue PDF
 * - GET    /api/laminate-catalogues            - List all catalogues
 * - DELETE /api/laminate-catalogue/:filename   - Delete catalogue
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { ok, err } from '../lib/apiEnvelope';
import { ObjectStorageService, ObjectNotFoundError } from '../objectStorage';
import { getFileStorage, STORAGE_PATHS, storagePath } from '../services/fileStorage';
import { sanitizeFilename as sanitizeFilenameUtil } from '../normalize';

const router = Router();

// Schema for uploading catalogue
const uploadCatalogueSchema = z.object({
    filename: z.string().min(1),
    mimeType: z.string().refine(val => val === 'application/pdf', { message: 'Only PDF files allowed' }),
    base64: z.string().min(1),
});

// Upload laminate catalogue PDF (protected)
router.post("/laminate-catalogue", authenticate, async (req, res) => {
    try {
        const validation = uploadCatalogueSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json(err("Invalid data", validation.error.issues));
        }

        const { filename, mimeType, base64 } = validation.data;
        const safeFilename = `laminate-catalogue-${Date.now()}.pdf`;

        // Validate file size (max 50MB for catalogues)
        const maxSize = 50 * 1024 * 1024;
        const fileSize = Buffer.byteLength(base64, 'base64');

        if (fileSize > maxSize) {
            return res.status(413).json(err("File size exceeds 50MB limit"));
        }

        const objectStorageService = new ObjectStorageService();

        // Save to catalogues folder
        const filePath = await objectStorageService.saveClientFile({
            clientSlug: 'catalogues',
            filename: safeFilename,
            content: Buffer.from(base64, 'base64'),
            mimeType,
        });

        const catalogueInfo = {
            filename: safeFilename,
            originalName: filename,
            uploadedAt: new Date().toISOString(),
            path: filePath,
            size: fileSize,
        };

        res.json(ok(catalogueInfo));
    } catch (error: any) {
        console.error("Error uploading catalogue:", error);
        res.status(500).json(err("Failed to upload catalogue", error?.message));
    }
});

// Get laminate catalogue PDF (protected)
router.get("/laminate-catalogue/:filename", authenticate, async (req, res) => {
    try {
        const { filename } = req.params;
        const safeFilename = sanitizeFilenameUtil(filename as string);

        if (!safeFilename) {
            return res.status(400).json(err("Invalid filename"));
        }

        const objectStorageService = new ObjectStorageService();
        const file = await objectStorageService.getClientFile('catalogues', safeFilename);

        if (!file) throw new ObjectNotFoundError("Catalogue not found");

        await objectStorageService.downloadObject(file, res);
    } catch (error) {
        if (error instanceof ObjectNotFoundError) {
            return res.status(404).json(err("Catalogue not found"));
        }
        console.error("Error retrieving catalogue:", error);
        res.status(500).json(err("Failed to retrieve catalogue"));
    }
});

// List all catalogues (protected)
router.get("/laminate-catalogues", authenticate, async (_req, res) => {
    try {
        const storage = getFileStorage();
        const files = await storage.list(STORAGE_PATHS.CATALOGUES);

        const catalogues = files
            .filter(f => f.path.endsWith('.pdf'))
            .map(f => ({
                filename: f.path.split('/').pop() || f.path,
                size: f.metadata.size,
                uploadedAt: f.metadata.lastModified.toISOString(),
            }));

        res.json(ok(catalogues));
    } catch (error: any) {
        console.error("Error listing catalogues:", error);
        res.status(500).json(err("Failed to list catalogues", error?.message));
    }
});

// Delete catalogue (protected)
router.delete("/laminate-catalogue/:filename", authenticate, async (req, res) => {
    try {
        const { filename } = req.params;
        const safeFilename = sanitizeFilenameUtil(filename as string);
        const storage = getFileStorage();
        const filePath = storagePath(STORAGE_PATHS.CATALOGUES, safeFilename);

        if (!(await storage.exists(filePath))) {
            return res.status(404).json(err("Catalogue not found"));
        }

        await storage.delete(filePath);
        res.json(ok({ message: "Catalogue deleted successfully" }));
    } catch (error: any) {
        console.error("Error deleting catalogue:", error);
        res.status(500).json(err("Failed to delete catalogue", error?.message));
    }
});

export default router;
