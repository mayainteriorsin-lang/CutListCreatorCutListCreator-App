/**
 * File Conversion Routes
 * 
 * Handles file format conversions.
 * 
 * Routes:
 * - POST /api/convert-dwg-to-dxf - Convert DWG to DXF format
 */

import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { authenticate } from '../middleware/auth';

const router = Router();

// Convert DWG to DXF - accepts raw binary data (protected)
router.post("/convert-dwg-to-dxf", authenticate, async (req, res) => {
    try {
        const fileContent = req.body as Buffer;
        if (!fileContent || fileContent.length === 0) {
            return res.status(400).json({ error: "No file content provided" });
        }

        // Check if dwg2dxf binary exists before using it
        let dwg2dxfPath: string;
        try {
            const { execSync } = await import("child_process");
            dwg2dxfPath = execSync("which dwg2dxf 2>/dev/null || where dwg2dxf 2>nul", { encoding: "utf-8" }).trim();
            if (!dwg2dxfPath) {
                throw new Error("Command not found");
            }
        } catch {
            return res.status(501).json({
                error: "DWG conversion is not available on this server. The dwg2dxf tool is not installed."
            });
        }

        // Create temp directory
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dwg-convert-"));
        const inputPath = path.join(tempDir, "input.dwg");
        const outputPath = path.join(tempDir, "input.dxf");

        try {
            // Write DWG file as binary buffer
            fs.writeFileSync(inputPath, fileContent);

            // Use execFileSync for safety (no shell injection possible)
            const { execFileSync } = await import("child_process");
            execFileSync("dwg2dxf", [inputPath, outputPath], {
                stdio: "pipe",
                timeout: 30000 // 30 second timeout
            });

            // Read converted DXF
            if (!fs.existsSync(outputPath)) {
                throw new Error("DXF conversion failed - output file not created");
            }

            const dxfContent = fs.readFileSync(outputPath, "utf-8");
            res.json({ dxfContent });
        } finally {
            // Cleanup temp files
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (e) {
                console.error("Error cleaning up temp files:", e);
            }
        }
    } catch (error) {
        console.error("DWG conversion error:", error);
        res.status(500).json({ error: "Failed to convert DWG file. Ensure it's a valid AutoCAD drawing." });
    }
});

export default router;
