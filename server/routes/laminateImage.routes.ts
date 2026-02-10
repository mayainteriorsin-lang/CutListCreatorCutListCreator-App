/**
 * Laminate Image Routes
 * 
 * Handles laminate image upload, retrieval, deletion, and listing.
 * Uses FileStorage abstraction for S3-readiness.
 * 
 * Routes:
 * - POST   /api/laminate-image/:code - Upload laminate thumbnail
 * - GET    /api/laminate-image/:code - Retrieve laminate image
 * - DELETE /api/laminate-image/:code - Delete laminate image
 * - GET    /api/laminate-images      - List all laminate images
 */

import { Router } from 'express';
import * as path from 'path';
import { authenticate } from '../middleware/auth';
import { ok, err } from '../lib/apiEnvelope';
import { getFileStorage, FileNotFoundError, STORAGE_PATHS, storagePath } from '../services/fileStorage';

const router = Router();

// Upload laminate image (thumbnail) - protected
// PHASE 16: Uses FileStorage abstraction for S3-readiness
router.post("/laminate-image/:code", authenticate, async (req, res) => {
    try {
        const { code } = req.params;
        const { mimeType, base64 } = req.body;

        if (!code || !base64) {
            return res.status(400).json(err("Missing laminate code or image data"));
        }

        const safeCode = (code as string).replace(/[^a-zA-Z0-9-_]/g, '_');
        // Validate mime type (only images)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(mimeType)) {
            return res.status(400).json(err("Invalid image type. Allowed: JPEG, PNG, WebP, GIF"));
        }

        // Validate file size (max 2MB for thumbnails)
        const maxSize = 2 * 1024 * 1024;
        const fileSize = Buffer.byteLength(base64, 'base64');
        if (fileSize > maxSize) {
            return res.status(413).json(err("Image size exceeds 2MB limit"));
        }

        // Create safe filename from laminate code
        const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
        const filename = `${safeCode}.${ext}`;

        const storage = getFileStorage();

        // Delete any existing image for this code (different extensions)
        const existingFiles = await storage.list(STORAGE_PATHS.LAMINATE_IMAGES);
        for (const f of existingFiles) {
            const existingFilename = f.path.split('/').pop() || '';
            if (existingFilename.startsWith(safeCode + '.')) {
                await storage.delete(f.path);
            }
        }

        // Save new image
        const filePath = storagePath(STORAGE_PATHS.LAMINATE_IMAGES, filename);
        const buffer = Buffer.from(base64, 'base64');
        await storage.save(filePath, buffer, mimeType);

        res.json(ok({
            code,
            filename,
            size: fileSize,
            url: `/api/laminate-image/${encodeURIComponent(code)}`
        }));
    } catch (error: any) {
        console.error("Error uploading laminate image:", error);
        res.status(500).json(err("Failed to upload image", error?.message));
    }
});

// Get laminate image (protected)
// PHASE 16: Uses FileStorage abstraction for S3-readiness
router.get("/laminate-image/:code", authenticate, async (req, res) => {
    try {
        const { code } = req.params;
        const safeCode = (code as string).replace(/[^a-zA-Z0-9-_]/g, '_');
        const storage = getFileStorage();

        // Find image file (could be jpg, png, webp, gif)
        const allFiles = await storage.list(STORAGE_PATHS.LAMINATE_IMAGES);
        const matchingFiles = allFiles.filter(f => {
            const filename = f.path.split('/').pop() || '';
            return filename.startsWith(safeCode + '.');
        });

        if (matchingFiles.length === 0) {
            return res.status(404).json(err("Image not found"));
        }

        const file = matchingFiles[0]!;
        const metadata = await storage.getMetadata(file.path);

        res.setHeader('Content-Type', metadata.mimeType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

        const stream = await storage.getStream(file.path);
        stream.pipe(res);
    } catch (error: any) {
        if (error instanceof FileNotFoundError) {
            return res.status(404).json(err("Image not found"));
        }
        console.error("Error getting laminate image:", error);
        res.status(500).json(err("Failed to get image", error?.message));
    }
});

// Delete laminate image (protected)
// PHASE 16: Uses FileStorage abstraction for S3-readiness
router.delete("/laminate-image/:code", authenticate, async (req, res) => {
    try {
        const { code } = req.params;
        const safeCode = (code as string).replace(/[^a-zA-Z0-9-_]/g, '_');
        const storage = getFileStorage();

        // Find and delete all images for this code
        const allFiles = await storage.list(STORAGE_PATHS.LAMINATE_IMAGES);
        const matchingFiles = allFiles.filter(f => {
            const filename = f.path.split('/').pop() || '';
            return filename.startsWith(safeCode + '.');
        });

        if (matchingFiles.length === 0) {
            return res.status(404).json(err("Image not found"));
        }

        for (const f of matchingFiles) {
            await storage.delete(f.path);
        }

        res.json(ok({ message: "Image deleted successfully" }));
    } catch (error: any) {
        console.error("Error deleting laminate image:", error);
        res.status(500).json(err("Failed to delete image", error?.message));
    }
});

// List all laminate images (protected)
// PHASE 16: Uses FileStorage abstraction for S3-readiness
router.get("/laminate-images", authenticate, async (_req, res) => {
    try {
        const storage = getFileStorage();
        const files = await storage.list(STORAGE_PATHS.LAMINATE_IMAGES);

        const imageMap: Record<string, string> = {};

        for (const f of files) {
            const filename = f.path.split('/').pop() || '';
            // Skip metadata files
            if (filename.endsWith('.meta.json')) continue;

            const ext = path.extname(filename);
            const code = filename.replace(ext, '').replace(/_/g, '-'); // Convert back underscores
            imageMap[code] = `/api/laminate-image/${encodeURIComponent(code)}`;
        }

        res.json(ok(imageMap));
    } catch (error: any) {
        console.error("Error listing laminate images:", error);
        res.status(500).json(err("Failed to list images", error?.message));
    }
});

export default router;
