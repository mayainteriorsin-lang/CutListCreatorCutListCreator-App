import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { laminateMemory, insertLaminateMemorySchema, laminateWoodGrainsPreference, plywoodBrandMemory, insertPlywoodBrandMemorySchema, quickShutterMemory, insertQuickShutterMemorySchema, masterSettingsMemory, insertMasterSettingsMemorySchema, laminateCodeGodown, insertLaminateCodeGodownSchema, godownMemory, insertGodownMemorySchema } from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { z } from "zod";
import { crmRouter } from "./routes/crmRoutes";
import { aiInteriorDetectRouter } from "./routes/aiInteriorDetect";
import { aiWardrobeLayoutRouter } from "./routes/aiWardrobeLayout";

const masterSettingsUpdateSchema = z.object({
  masterLaminateCode: z.string().trim().min(1).optional().nullable(),
  masterPlywoodBrand: z.string().trim().min(1).optional().nullable(),
  sheetWidth: z.string().optional(),
  sheetHeight: z.string().optional(),
  kerf: z.string().optional(),
  optimizePlywoodUsage: z.boolean().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // ✅ AUTO-MIGRATION: Ensure Table Exists First
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS master_settings_memory (
        id SERIAL PRIMARY KEY,
        sheet_width VARCHAR(50) NOT NULL DEFAULT '1210',
        sheet_height VARCHAR(50) NOT NULL DEFAULT '2420',
        kerf VARCHAR(50) NOT NULL DEFAULT '5',
        master_laminate_code VARCHAR(255),
        master_plywood_brand text,
        optimize_plywood_usage VARCHAR(10) NOT NULL DEFAULT 'true',
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
     )`);
  } catch (e) {
    console.error("Init Table Error:", e);
  }

  // ✅ AUTO-MIGRATION: Add master_plywood_brand if missing (Robust Version)
  try {
    // 1. Add column (text type is safer/more equivalent in PG)
    await db.execute(sql`ALTER TABLE master_settings_memory ADD COLUMN IF NOT EXISTS master_plywood_brand text`);
    console.log("✅ Database Schema Updated: master_plywood_brand column added.");

    // 2. Set default for existing rows if null -> AND set Column Default
    await db.execute(sql`UPDATE master_settings_memory SET master_plywood_brand = 'Apple Ply 16mm BWP' WHERE master_plywood_brand IS NULL`);
    await db.execute(sql`ALTER TABLE master_settings_memory ALTER COLUMN master_plywood_brand SET DEFAULT 'Apple Ply 16mm BWP'`);
  } catch (err: any) {
    console.error("❌ MIGRATION FAILED MSG:", err.message);
  }

  // ✅ AUTO-MIGRATION: Update CRM Quotes table (Store full JSON snapshot)
  try {
    await db.execute(sql`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS data text`);
    console.log("✅ Database Schema Updated: quotes.data column added.");
  } catch (e) {
    console.error("Quotes migration error:", e);
  }

  // Global laminate memory routes
  app.use("/api/crm", crmRouter);
  app.use("/api/ai", aiInteriorDetectRouter());
  app.use("/api/ai", aiWardrobeLayoutRouter());

  // Get all saved laminate codes
  app.get("/api/laminate-memory", async (req, res) => {
    try {
      const codes = await db.select().from(laminateMemory).orderBy(laminateMemory.createdAt);
      res.json(codes);
    } catch (error) {
      console.error("Error fetching laminate memory:", error);
      res.status(500).json({ error: "Failed to fetch laminate codes" });
    }
  });

  // Save a new laminate code to memory
  app.post("/api/laminate-memory", async (req, res) => {
    try {
      const validation = insertLaminateMemorySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid data", details: validation.error });
      }

      const { code } = validation.data;

      // Check if code already exists
      const existing = await db.select().from(laminateMemory).where(eq(laminateMemory.code, code));
      if (existing.length > 0) {
        return res.status(409).json({ error: "Code already exists" });
      }

      const [newCode] = await db.insert(laminateMemory).values({ code }).returning();
      res.status(201).json(newCode);
    } catch (error) {
      console.error("Error saving laminate code:", error);
      res.status(500).json({ error: "Failed to save laminate code" });
    }
  });

  // Delete a laminate code from memory
  app.delete("/api/laminate-memory/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const deleted = await db.delete(laminateMemory).where(eq(laminateMemory.code, code)).returning();

      if (deleted.length === 0) {
        return res.status(404).json({ error: "Code not found" });
      }

      res.json({ message: "Code deleted successfully" });
    } catch (error) {
      console.error("Error deleting laminate code:", error);
      res.status(500).json({ error: "Failed to delete laminate code" });
    }
  });

  // Plywood brand memory routes

  // Get all saved plywood brands
  app.get("/api/plywood-brand-memory", async (req, res) => {
    try {
      const brands = await db.select().from(plywoodBrandMemory).orderBy(plywoodBrandMemory.createdAt);
      res.json(brands);
    } catch (error) {
      console.error("Error fetching plywood brand memory:", error);
      res.status(500).json({ error: "Failed to fetch plywood brands" });
    }
  });

  // Save a new plywood brand to memory
  app.post("/api/plywood-brand-memory", async (req, res) => {
    try {
      const validation = insertPlywoodBrandMemorySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid data", details: validation.error });
      }

      const { brand } = validation.data;

      // Check if brand already exists
      const existing = await db.select().from(plywoodBrandMemory).where(eq(plywoodBrandMemory.brand, brand));
      if (existing.length > 0) {
        return res.status(409).json({ error: "Brand already exists" });
      }

      const [newBrand] = await db.insert(plywoodBrandMemory).values({ brand }).returning();
      res.status(201).json(newBrand);
    } catch (error) {
      console.error("Error saving plywood brand:", error);
      res.status(500).json({ error: "Failed to save plywood brand" });
    }
  });

  // Delete a plywood brand from memory
  app.delete("/api/plywood-brand-memory/:brand", async (req, res) => {
    try {
      const { brand } = req.params;
      const deleted = await db.delete(plywoodBrandMemory).where(eq(plywoodBrandMemory.brand, brand)).returning();

      if (deleted.length === 0) {
        return res.status(404).json({ error: "Brand not found" });
      }

      res.json({ message: "Brand deleted successfully" });
    } catch (error) {
      console.error("Error deleting plywood brand:", error);
      res.status(500).json({ error: "Failed to delete plywood brand" });
    }
  });

  // Quick Shutter memory routes

  // Get the most recent Quick Shutter settings
  app.get("/api/quick-shutter-memory", async (req, res) => {
    try {
      const memory = await db.select()
        .from(quickShutterMemory)
        .orderBy(desc(quickShutterMemory.updatedAt))
        .limit(1);

      if (memory.length === 0) {
        return res.json({
          roomName: null,
          plywoodBrand: null,
          laminateCode: null
        });
      }

      res.json(memory[0]);
    } catch (error) {
      console.error("Error fetching Quick Shutter memory:", error);
      res.status(500).json({ error: "Failed to fetch Quick Shutter memory" });
    }
  });

  // Save or update Quick Shutter memory
  app.post("/api/quick-shutter-memory", async (req, res) => {
    try {
      // Validate request body using insert schema
      const validation = insertQuickShutterMemorySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid request data",
          details: validation.error.issues
        });
      }

      const { roomName, plywoodBrand, laminateCode } = validation.data;

      // Check if any memory record exists
      const existing = await db.select().from(quickShutterMemory).limit(1);

      if (existing.length > 0) {
        // Update existing record
        const [updated] = await db.update(quickShutterMemory)
          .set({
            roomName: roomName || null,
            plywoodBrand: plywoodBrand || null,
            laminateCode: laminateCode || null,
            updatedAt: sql`now()`
          })
          .where(eq(quickShutterMemory.id, existing[0].id))
          .returning();
        return res.json(updated);
      } else {
        // Insert new record
        const [newMemory] = await db.insert(quickShutterMemory)
          .values({
            roomName: roomName || null,
            plywoodBrand: plywoodBrand || null,
            laminateCode: laminateCode || null
          })
          .returning();
        return res.status(201).json(newMemory);
      }
    } catch (error) {
      console.error("Error saving Quick Shutter memory:", error);
      res.status(500).json({ error: "Failed to save Quick Shutter memory" });
    }
  });

  // Master Settings memory routes

  // Get the most recent Master Settings
  app.get("/api/master-settings-memory", async (req, res) => {
    try {
      const memory = await db.select()
        .from(masterSettingsMemory)
        .orderBy(desc(masterSettingsMemory.updatedAt))
        .limit(1);

      if (memory.length === 0) {
        return res.json({
          sheetWidth: '1210',
          sheetHeight: '2420',
          kerf: '5',
          masterLaminateCode: null,
          masterPlywoodBrand: 'Apple Ply 16mm BWP'
        });
      }

      res.json(memory[0]);
    } catch (error) {
      console.error("Error fetching Master Settings memory:", error);
      res.status(500).json({ error: "Failed to fetch Master Settings memory" });
    }
  });

  // Save or update Master Settings memory (including master laminate code)
  app.post("/api/master-settings-memory", async (req, res) => {
    try {
      const validation = insertMasterSettingsMemorySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid request data",
          details: validation.error.issues
        });
      }

      const { sheetWidth, sheetHeight, kerf, masterLaminateCode, masterPlywoodBrand } = validation.data;

      // Check if any memory record exists
      const existing = await db.select().from(masterSettingsMemory).limit(1);

      if (existing.length > 0) {
        // Update existing record
        const [updated] = await db.update(masterSettingsMemory)
          .set({
            sheetWidth: sheetWidth || '1210',
            sheetHeight: sheetHeight || '2420',
            kerf: kerf || '5',
            masterLaminateCode: masterLaminateCode || null,
            masterPlywoodBrand: masterPlywoodBrand || null,
            updatedAt: sql`now()`
          })
          .where(eq(masterSettingsMemory.id, existing[0].id))
          .returning();
        return res.json(updated);
      } else {
        // Insert new record
        const [newMemory] = await db.insert(masterSettingsMemory)
          .values({
            sheetWidth: sheetWidth || '1210',
            sheetHeight: sheetHeight || '2420',
            kerf: kerf || '5',
            masterLaminateCode: masterLaminateCode || null,
            masterPlywoodBrand: masterPlywoodBrand || null
          })
          .returning();
        return res.status(201).json(newMemory);
      }
    } catch (error) {
      console.error("Error saving Master Settings memory:", error);
      res.status(500).json({ error: "Failed to save Master Settings memory" });
    }
  });

  // Simplified Master Settings routes (single master laminate + sheet defaults)
  app.get("/api/master-settings", async (_req, res) => {
    try {
      let [settings] = await db.select().from(masterSettingsMemory).limit(1);
      if (!settings) {
        const [inserted] = await db.insert(masterSettingsMemory).values({}).returning();
        settings = inserted;
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching Master Settings:", error);
      res.status(500).json({ error: "Failed to fetch Master Settings" });
    }
  });

  app.post("/api/master-settings", async (req, res) => {
    try {
      const validation = masterSettingsUpdateSchema.safeParse(req.body ?? {});
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid request data",
          details: validation.error.issues
        });
      }

      const { masterLaminateCode, masterPlywoodBrand, sheetWidth, sheetHeight, kerf, optimizePlywoodUsage } = validation.data;
      const normalizedMasterLaminateCode =
        masterLaminateCode === undefined
          ? undefined
          : (masterLaminateCode === null ? null : masterLaminateCode.trim() || null);

      const normalizedMasterPlywoodBrand =
        masterPlywoodBrand === undefined
          ? undefined
          : (masterPlywoodBrand === null ? null : masterPlywoodBrand.trim() || null);

      const [existing] = await db.select().from(masterSettingsMemory).limit(1);

      if (existing) {
        const [updated] = await db.update(masterSettingsMemory)
          .set({
            sheetWidth: sheetWidth ?? existing.sheetWidth ?? '1210',
            sheetHeight: sheetHeight ?? existing.sheetHeight ?? '2420',
            kerf: kerf ?? existing.kerf ?? '5',
            masterLaminateCode: normalizedMasterLaminateCode !== undefined ? normalizedMasterLaminateCode : existing.masterLaminateCode,
            masterPlywoodBrand: normalizedMasterPlywoodBrand !== undefined ? normalizedMasterPlywoodBrand : existing.masterPlywoodBrand,
            optimizePlywoodUsage: optimizePlywoodUsage !== undefined ? String(optimizePlywoodUsage) : existing.optimizePlywoodUsage,
            updatedAt: sql`now()`
          })
          .where(eq(masterSettingsMemory.id, existing.id))
          .returning();
        return res.json(updated);
      }

      const [inserted] = await db.insert(masterSettingsMemory)
        .values({
          sheetWidth: sheetWidth ?? '1210',
          sheetHeight: sheetHeight ?? '2420',
          kerf: kerf ?? '5',
          masterLaminateCode: normalizedMasterLaminateCode ?? null,
          masterPlywoodBrand: normalizedMasterPlywoodBrand ?? 'Apple Ply 16mm BWP',
          optimizePlywoodUsage: optimizePlywoodUsage !== undefined ? String(optimizePlywoodUsage) : 'true'
        })
        .returning();

      return res.status(201).json(inserted);
    } catch (error) {
      console.error("Error saving Master Settings:", error);
      res.status(500).json({ error: "Failed to save Master Settings" });
    }
  });

  // Godown Memory routes

  // Get all godown names
  app.get("/api/godown-memory", async (req, res) => {
    try {
      const godowns = await db.select().from(godownMemory).orderBy(desc(godownMemory.createdAt));
      res.json(godowns);
    } catch (error) {
      console.error("Error fetching godown memory:", error);
      res.status(500).json({ error: "Failed to fetch godowns" });
    }
  });

  // Save a new godown name
  app.post("/api/godown-memory", async (req, res) => {
    try {
      const { name, type } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Godown name is required" });
      }

      // Check if exists
      const existing = await db.select().from(godownMemory).where(eq(godownMemory.name, name));
      if (existing.length > 0) {
        // Already exists, return it
        return res.json(existing[0]);
      }

      const [newGodown] = await db.insert(godownMemory).values({
        name,
        type: type || 'general'
      }).returning();

      res.status(201).json(newGodown);
    } catch (error) {
      console.error("Error saving godown memory:", error);
      res.status(500).json({ error: "Failed to save godown" });
    }
  });

  // Godown plywood brands (history + autocomplete)
  app.get("/api/godown/plywood", async (_req, res) => {
    try {
      const brands = await db.select().from(plywoodBrandMemory).orderBy(desc(plywoodBrandMemory.createdAt));
      res.json(brands);
    } catch (error) {
      console.error("Error fetching plywood godown brands:", error);
      res.status(500).json({ error: "Failed to fetch plywood brands" });
    }
  });

  app.post("/api/godown/plywood", async (req, res) => {
    try {
      const brandRaw = (req.body?.brand as string | undefined)?.trim() ?? "";
      if (!brandRaw) {
        return res.status(400).json({ error: "Brand is required" });
      }

      const brandLower = brandRaw.toLowerCase();
      const existing = await db.select()
        .from(plywoodBrandMemory)
        .where(sql`lower(${plywoodBrandMemory.brand}) = ${brandLower}`);

      if (existing.length > 0) {
        return res.json(existing[0]);
      }

      const validation = insertPlywoodBrandMemorySchema.safeParse({ brand: brandRaw });
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid data", details: validation.error });
      }

      const [inserted] = await db.insert(plywoodBrandMemory)
        .values({ brand: brandRaw })
        .returning();

      res.status(201).json(inserted);
    } catch (error) {
      console.error("Error saving plywood brand to godown:", error);
      res.status(500).json({ error: "Failed to save plywood brand" });
    }
  });

  // ✅ Redundant routes deleted. Use /api/laminate-code-godown instead.

  // ✅ CENTRAL LAMINATE CODE GODOWN (Warehouse) Routes

  // Get all laminate codes from central godown
  app.get("/api/laminate-code-godown", async (req, res) => {
    try {
      const codes = await db.select().from(laminateCodeGodown).orderBy(laminateCodeGodown.code);
      res.json(codes);
    } catch (error) {
      console.error("Error fetching laminate code godown:", error);
      res.status(500).json({ error: "Failed to fetch laminate codes" });
    }
  });

  // Get single laminate code from godown
  app.get("/api/laminate-code-godown/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const result = await db.select().from(laminateCodeGodown).where(eq(laminateCodeGodown.code, code));
      if (result.length === 0) {
        return res.status(404).json({ error: "Laminate code not found" });
      }
      res.json(result[0]);
    } catch (error) {
      console.error("Error fetching laminate code:", error);
      res.status(500).json({ error: "Failed to fetch laminate code" });
    }
  });

  // Add new laminate code to central godown (with wood grains setting)
  app.post("/api/laminate-code-godown", async (req, res) => {
    try {
      const validation = insertLaminateCodeGodownSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid data", details: validation.error });
      }

      const { code, name, innerCode, supplier, thickness, description, woodGrainsEnabled } = validation.data;

      // Check if code already exists
      const existing = await db.select().from(laminateCodeGodown).where(eq(laminateCodeGodown.code, code));
      if (existing.length > 0) {
        return res.status(409).json({ error: "Laminate code already exists in godown" });
      }

      const [newCode] = await db.insert(laminateCodeGodown).values({
        code,
        name,
        innerCode: innerCode || null,
        supplier: supplier || null,
        thickness: thickness || null,
        description: description || null,
        woodGrainsEnabled: String(woodGrainsEnabled || 'false')
      }).returning();
      res.status(201).json(newCode);
    } catch (error) {
      console.error("Error saving laminate code to godown:", error);
      res.status(500).json({ error: "Failed to save laminate code" });
    }
  });

  // Update laminate code in central godown (includes wood grains preference)
  app.patch("/api/laminate-code-godown/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const { name, innerCode, supplier, thickness, description, woodGrainsEnabled } = req.body;

      const [updated] = await db.update(laminateCodeGodown)
        .set({
          name: name || undefined,
          innerCode: innerCode || null,
          supplier: supplier || null,
          thickness: thickness || null,
          description: description || null,
          woodGrainsEnabled: woodGrainsEnabled !== undefined ? String(woodGrainsEnabled) : undefined,
          updatedAt: sql`now()`
        })
        .where(eq(laminateCodeGodown.code, code))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Laminate code not found in godown" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating laminate code:", error);
      res.status(500).json({ error: "Failed to update laminate code" });
    }
  });

  // Delete laminate code from central godown
  app.delete("/api/laminate-code-godown/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const deleted = await db.delete(laminateCodeGodown).where(eq(laminateCodeGodown.code, code)).returning();

      if (deleted.length === 0) {
        return res.status(404).json({ error: "Laminate code not found in godown" });
      }

      res.json({ message: "Laminate code deleted from godown successfully" });
    } catch (error) {
      console.error("Error deleting laminate code:", error);
      res.status(500).json({ error: "Failed to delete laminate code" });
    }
  });

  // Wood grains preference routes

  // Get all wood grains preferences from WOOD GRAINS PREFERENCE TABLE
  app.get("/api/wood-grains-preferences", async (req, res) => {
    try {
      const preferences = await db.select()
        .from(laminateWoodGrainsPreference);

      // ✅ FIX: Read from actual preferences table and convert to boolean
      const normalizedPreferences = preferences.map(pref => ({
        id: pref.id,
        laminateCode: pref.laminateCode,
        woodGrainsEnabled: pref.woodGrainsEnabled === 'true', // Convert string to boolean
        createdAt: pref.createdAt,
        updatedAt: pref.updatedAt
      }));

      res.json(normalizedPreferences);
    } catch (error: any) {
      console.error("Error fetching all wood grains preferences:", error);
      res.status(500).json({ error: "Failed to fetch wood grains preferences" });
    }
  });

  // Get wood grains preference for a specific laminate code
  app.get("/api/wood-grains-preference/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const preference = await db.select()
        .from(laminateWoodGrainsPreference)
        .where(eq(laminateWoodGrainsPreference.laminateCode, code));

      if (preference.length === 0) {
        return res.json({ woodGrainsEnabled: false });
      }

      res.json({ woodGrainsEnabled: preference[0].woodGrainsEnabled === 'true' });
    } catch (error) {
      console.error("Error fetching wood grains preference:", error);
      res.status(500).json({ error: "Failed to fetch wood grains preference" });
    }
  });

  // Save or update wood grains preference for a laminate code
  app.post("/api/wood-grains-preference", async (req, res) => {
    try {
      const { laminateCode, woodGrainsEnabled } = req.body;

      if (!laminateCode) {
        return res.status(400).json({ error: "Laminate code is required" });
      }

      // Check if preference already exists
      const existing = await db.select()
        .from(laminateWoodGrainsPreference)
        .where(eq(laminateWoodGrainsPreference.laminateCode, laminateCode));

      if (existing.length > 0) {
        // Update existing preference
        const [updated] = await db.update(laminateWoodGrainsPreference)
          .set({
            woodGrainsEnabled: woodGrainsEnabled ? 'true' : 'false',
            updatedAt: sql`now()`
          })
          .where(eq(laminateWoodGrainsPreference.laminateCode, laminateCode))
          .returning();
        // ✅ FIX: Return normalized boolean response
        return res.json({
          id: updated.id,
          laminateCode: updated.laminateCode,
          woodGrainsEnabled: updated.woodGrainsEnabled === 'true',
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt
        });
      } else {
        // Insert new preference
        const [newPreference] = await db.insert(laminateWoodGrainsPreference)
          .values({
            laminateCode,
            woodGrainsEnabled: woodGrainsEnabled ? 'true' : 'false'
          })
          .returning();
        // ✅ FIX: Return normalized boolean response
        return res.status(201).json({
          id: newPreference.id,
          laminateCode: newPreference.laminateCode,
          woodGrainsEnabled: newPreference.woodGrainsEnabled === 'true',
          createdAt: newPreference.createdAt,
          updatedAt: newPreference.updatedAt
        });
      }
    } catch (error) {
      console.error("Error saving wood grains preference:", error);
      res.status(500).json({ error: "Failed to save wood grains preference" });
    }
  });

  // Client file storage routes

  // Slugify function to sanitize client names
  function slugifyClientName(clientName: string): string {
    return clientName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
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

  // Save client files (PDF and material list)
  app.post("/api/clients/:clientSlug/files", async (req, res) => {
    try {
      const validation = saveClientFilesSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid data", details: validation.error });
      }

      const { pdf, materialList } = validation.data;
      const clientSlug = slugifyClientName(req.params.clientSlug);

      // Validate slug
      if (!clientSlug || clientSlug.length === 0) {
        return res.status(400).json({ error: "Invalid client name" });
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
        filename: pdf.filename,
        content: Buffer.from(pdf.base64, 'base64'),
        mimeType: pdf.mimeType,
      });

      // Save material list
      const materialListPath = await objectStorageService.saveClientFile({
        clientSlug,
        filename: materialList.filename,
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

  // Convert DWG to DXF - accepts raw binary data
  app.post("/api/convert-dwg-to-dxf", async (req, res) => {
    try {
      const fileContent = req.body as Buffer;
      if (!fileContent || fileContent.length === 0) {
        return res.status(400).json({ error: "No file content provided" });
      }

      // Create temp directory
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dwg-convert-"));
      const inputPath = path.join(tempDir, "input.dwg");
      const outputPath = path.join(tempDir, "input.dxf");

      try {
        // Write DWG file as binary buffer
        fs.writeFileSync(inputPath, fileContent);

        // Convert using dwg2dxf
        execSync(`dwg2dxf "${inputPath}" "${outputPath}"`, { stdio: "pipe" });

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

  // Get client file (PDF or material list)
  app.get("/api/clients/:clientSlug/files/:filename", async (req, res) => {
    try {
      const clientSlug = slugifyClientName(req.params.clientSlug);
      const { filename } = req.params;

      if (!clientSlug || !filename) {
        return res.status(400).json({ error: "Invalid client slug or filename" });
      }

      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.getClientFile(clientSlug, filename);

      await objectStorageService.downloadObject(file, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      console.error("Error retrieving client file:", error);
      res.status(500).json({ error: "Failed to retrieve client file" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
