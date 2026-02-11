/**
 * Client File Routes
 * 
 * Handles client file storage (PDF + material list).
 * 
 * Routes:
 * - POST /api/clients/:clientSlug/files          - Save client files
 * - GET  /api/clients/:clientSlug/files/:filename - Retrieve client file
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { ObjectStorageService, ObjectNotFoundError } from '../objectStorage';
import { sanitizeFilename as sanitizeFilenameUtil } from '../normalize';

const router = Router();

// Helper functions
function slugifyClientName(clientName: string): string {
    return clientName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function sanitizeFilename(filename: string): string {
    const path = require('path');
    return path.basename(filename).replace(/[^\w.-]/g, "_");
}

// Schema for saving client files
const saveClientFilesSchema = z.object({
    clientName: z.string().min(1, "Client name is required"),
    pdf: z.object({
        filename: z.string(),
        mimeType: z.string(),
        base64: z.string(),
    }),
    materialList: z.object({
        filename: z.string(),
        mimeType: z.string(),
        base64: z.string(),
    }),
});

// Save client files (PDF and material list) - protected
router.post("/clients/:clientSlug/files", authenticate, async (req, res) => {
    try {
        const validation = saveClientFilesSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: "Invalid data", details: validation.error });
        }

        const { pdf, materialList } = validation.data;
        const clientSlug = slugifyClientName(req.params.clientSlug as string);
        const pdfFilename = sanitizeFilename(pdf.filename);
        const materialListFilename = sanitizeFilename(materialList.filename);

        // Validate slug
        if (!clientSlug || clientSlug.length === 0) {
            return res.status(400).json({ error: "Invalid client name" });
        }
        if (!pdfFilename || !materialListFilename) {
            return res.status(400).json({ error: "Invalid filename" });
        }

        // Validate file sizes (max 10MB each)
        const maxSize = 10 * 1024 * 1024;
        const pdfSize = Buffer.byteLength(pdf.base64, 'base64');
        const materialListSize = Buffer.byteLength(materialList.base64, 'base64');

        if (pdfSize > maxSize || materialListSize > maxSize) {
            return res.status(413).json({ error: "File size exceeds 10MB limit" });
        }

        const objectStorageService = new ObjectStorageService();

        // Save PDF
        const pdfPath = await objectStorageService.saveClientFile({
            clientSlug,
            filename: pdfFilename,
            content: Buffer.from(pdf.base64, 'base64'),
            mimeType: pdf.mimeType,
        });

        // Save material list
        const materialListPath = await objectStorageService.saveClientFile({
            clientSlug,
            filename: materialListFilename,
            content: Buffer.from(materialList.base64, 'base64'),
            mimeType: materialList.mimeType,
        });

        res.status(201).json({
            success: true,
            clientSlug,
            files: {
                pdf: pdfPath,
                materialList: materialListPath,
            },
        });
    } catch (error) {
        console.error("Error saving client files:", error);
        res.status(500).json({ error: "Failed to save client files" });
    }
});

// Get client file (PDF or material list) - protected
router.get("/clients/:clientSlug/files/:filename", authenticate, async (req, res) => {
    try {
        const clientSlug = slugifyClientName(req.params.clientSlug as string);
        const { filename } = req.params;
        const safeFilename = sanitizeFilenameUtil(filename as string);

        if (!clientSlug || !safeFilename) {
            return res.status(400).json({ error: "Invalid client slug or filename" });
        }

        const objectStorageService = new ObjectStorageService();
        const file = await objectStorageService.getClientFile(clientSlug, safeFilename);

        if (!file) throw new Error("File not found");

        await objectStorageService.downloadObject(file, res);
    } catch (error) {
        if (error instanceof ObjectNotFoundError) {
            return res.status(404).json({ error: "File not found" });
        }
        console.error("Error retrieving client file:", error);
        res.status(500).json({ error: "Failed to retrieve client file" });
    }
});

export default router;
