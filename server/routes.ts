import type { Express } from "express";
import { createServer, type Server } from "http";
import { db, pool, safeDbQuery } from "./db";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Forward declaration
async function registerRoutesAction(app: Express): Promise<Server> {
  const server = createServer(app);
  // ... rest of logic moved here
  return server;
}
import { laminateMemory, insertLaminateMemorySchema, laminateWoodGrainsPreference, plywoodBrandMemory, insertPlywoodBrandMemorySchema, quickShutterMemory, insertQuickShutterMemorySchema, masterSettingsMemory, insertMasterSettingsMemorySchema, laminateCodeGodown, insertLaminateCodeGodownSchema, godownMemory, insertGodownMemorySchema } from "@shared/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { z } from "zod";
import { crmRouter } from "./routes/crmRoutes";
import { aiInteriorDetectRouter } from "./routes/aiInteriorDetect";
import { aiWardrobeLayoutRouter } from "./routes/aiWardrobeLayout";
import quotationRouter from "./routes/quotationRoutes";
import libraryRouter from "./routes/libraryRoutes";
import authRouter from "./routes/authRoutes";
import { authenticate, AuthRequest } from "./middleware/auth";
import { tenantRateLimit } from "./middleware/tenantRateLimit";
import { normString, normNumber, normBoolean, normArray, normDate, normDateISO } from "./normalize";
import {
  MasterSettingsResponseSchema,
  PlywoodListSchema,
  LaminateListSchema,
  WoodGrainsListSchema,
  MasterSettingsMemorySchema,
  safeValidate,
  safeValidateArray
} from "@shared/schemas";
import { ok, err } from "./lib/apiEnvelope";
import { safeQuery as safeQueryAdapter } from "./db/adapter";
import { cacheService, CACHE_KEYS } from "./services/cacheService";
// Legacy support
const getCache = (key: string) => cacheService.get(key);
const setCache = (key: string, val: any) => cacheService.set(key, val);
const clearCache = (key: string) => cacheService.del(key);

const masterSettingsUpdateSchema = z.object({
  masterLaminateCode: z.string().trim().min(1).optional().nullable(),
  masterPlywoodBrand: z.string().trim().min(1).optional().nullable(),
  sheetWidth: z.string().optional(),
  sheetHeight: z.string().optional(),
  kerf: z.string().optional(),
  optimizePlywoodUsage: z.boolean().optional(),
});

// PATCH 14: Enhanced safe query helper with automatic retries
// PATCH 50: Added timeout option to prevent hanging queries
// Wraps database calls with error handling and retry logic
async function safeQuery<T>(
  queryFn: () => Promise<T>,
  fallback: T,
  options: { retries?: number; delayMs?: number; timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 10000 } = options; // 10 second default timeout

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Query timeout')), timeoutMs);
  });

  try {
    const result = await Promise.race([
      safeQueryAdapter(queryFn, fallback, { retries: options.retries || 3, delayMs: options.delayMs || 50 }),
      timeoutPromise
    ]);
    return result;
  } catch (error) {
    console.error('[QUERY TIMEOUT ERROR]', error);
    return fallback;
  }
}

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

    // PATCH Phase 6: Multi-tenancy Isolation
    await db.execute(sql`ALTER TABLE master_settings_memory ADD COLUMN IF NOT EXISTS tenant_id varchar(255) NOT NULL DEFAULT 'default'`);
    await db.execute(sql`ALTER TABLE laminate_code_godown ADD COLUMN IF NOT EXISTS tenant_id varchar(255) NOT NULL DEFAULT 'default'`);
    await db.execute(sql`ALTER TABLE godown_memory ADD COLUMN IF NOT EXISTS tenant_id varchar(255) NOT NULL DEFAULT 'default'`);
    console.log("✅ Database Schema Updated: tenant_id columns added.");
  } catch (e) {
    console.error("Migration error:", e);
  }

  // ==========================================================================
  // PHASE 8: Health/Liveness/Readiness Endpoints
  // ==========================================================================

  /**
   * Liveness probe - Is the process alive?
   * - Returns 200 if process is running
   * - Used by orchestrators (K8s, ECS) to detect zombie processes
   */
  app.get("/api/health/live", (_req, res) => {
    res.status(200).json({
      status: "alive",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  /**
   * Readiness probe - Can the service handle requests?
   * - Checks database connectivity
   * - Returns 503 if dependencies are unavailable
   * - Used by load balancers to route traffic
   */
  app.get("/api/health/ready", async (_req, res) => {
    const timestamp = new Date().toISOString();
    let dbReady = false;

    try {
      await safeQuery(() => db.execute(sql`SELECT 1`), [], { timeoutMs: 2000 });
      dbReady = true;
    } catch (e) {
      console.error("[READINESS] Database check failed:", e);
    }

    const ready = dbReady;

    res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not_ready",
      timestamp,
      checks: {
        database: dbReady ? "connected" : "disconnected",
      },
    });
  });

  /**
   * Combined health endpoint (legacy compatibility + detailed info)
   * - Returns overall system health
   * - Includes all dependency statuses
   */
  app.get("/api/health", async (_req, res) => {
    const uptime = process.uptime();
    const timestamp = new Date().toISOString();
    let dbStatus = "unknown";

    try {
      // Simple query to verify DB connection
      await safeQuery(() => db.execute(sql`SELECT 1`), [], { timeoutMs: 2000 });
      dbStatus = "connected";
    } catch (e) {
      dbStatus = "disconnected";
      console.error("Health check DB failure:", e);
    }

    const status = dbStatus === "connected" ? "ok" : "degraded";

    res.status(status === "ok" ? 200 : 503).json({
      status,
      timestamp,
      uptime,
      database: dbStatus,
      message: status === "ok" ? "System operational" : "System degraded",
      version: process.env.npm_package_version || "unknown",
    });
  });

  // DEV-ONLY: Direct login bypass (no DB required)
  app.post("/api/auth/login", async (req, res, next) => {
    const { email, password } = req.body || {};

    // Only handle dev credentials - pass others to authRouter
    if (process.env.NODE_ENV !== 'production' &&
      email === 'admin@cutlist.pro' &&
      password === 'admin123') {

      try {
        const jwt = await import('jsonwebtoken');
        const { nanoid } = await import('nanoid');

        const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
        const devUser = {
          userId: 'dev-admin-001',
          email: 'admin@cutlist.pro',
          role: 'admin',
          tenantId: 'dev-tenant-001',
        };

        const accessToken = jwt.default.sign(devUser, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.default.sign(
          { ...devUser, tokenId: nanoid(64) },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        console.log('[Auth] Dev mode login successful for:', email);

        return res.json({
          success: true,
          data: {
            accessToken,
            refreshToken,
            user: devUser,
          }
        });
      } catch (err) {
        console.error('[Auth] Dev login error:', err);
        return res.status(500).json({ success: false, error: 'Dev login failed' });
      }
    }

    // Not dev credentials - pass to authRouter
    next();
  });

  // Global laminate memory routes
  app.use("/api/auth", authRouter); // Authentication API (public - handles its own auth)
  app.use("/api/crm", crmRouter); // CRM routes - protected (has internal auth middleware)
  // PHASE 14: Added per-tenant rate limiting to authenticated routes (GAP-SCL-001)
  app.use("/api/ai", authenticate, tenantRateLimit, aiInteriorDetectRouter()); // AI routes - protected + rate limited
  app.use("/api/ai", authenticate, tenantRateLimit, aiWardrobeLayoutRouter()); // AI routes - protected + rate limited
  app.use("/api", quotationRouter); // Quotation persistence API - protected (has internal auth middleware)
  app.use("/api", libraryRouter); // Library module persistence API - protected (has internal auth middleware)

  // PATCH 50: Removed deprecated /api/laminate-memory routes
  // Data migrated to /api/laminate-code-godown
  // See shared/schema.ts for details

  // Plywood brand memory routes (protected)

  // Get all saved plywood brands
  app.get("/api/plywood-brand-memory", authenticate, async (_req, res) => {
    try {
      const brands = await safeQuery(
        () => db.select().from(plywoodBrandMemory).orderBy(plywoodBrandMemory.createdAt),
        []
      );
      res.json(Array.isArray(brands) ? brands : []);
    } catch (error) {
      console.error("Error fetching plywood brand memory:", error);
      res.json([]);
    }
  });

  // Save a new plywood brand to memory
  app.post("/api/plywood-brand-memory", authenticate, async (req, res) => {
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
  app.delete("/api/plywood-brand-memory/:brand", authenticate, async (req, res) => {
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

  // Quick Shutter memory routes (protected)

  // Get the most recent Quick Shutter settings
  app.get("/api/quick-shutter-memory", authenticate, async (_req, res) => {
    const defaultMemory = {
      roomName: null,
      plywoodBrand: null,
      laminateCode: null
    };

    try {
      const memory = await safeQuery(
        () => db.select()
          .from(quickShutterMemory)
          .orderBy(desc(quickShutterMemory.updatedAt))
          .limit(1),
        []
      );

      if (!Array.isArray(memory) || memory.length === 0) {
        return res.json(defaultMemory);
      }

      res.json(memory[0] || defaultMemory);
    } catch (error) {
      console.error("Error fetching Quick Shutter memory:", error);
      res.json(defaultMemory);
    }
  });

  // Save or update Quick Shutter memory
  app.post("/api/quick-shutter-memory", authenticate, async (req, res) => {
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

  // Master Settings memory routes (protected)

  // Get the most recent Master Settings
  app.get("/api/master-settings-memory", authenticate, async (_req, res) => {
    const defaultSettings = {
      sheetWidth: '1210',
      sheetHeight: '2420',
      kerf: '5',
      masterLaminateCode: null,
      masterPlywoodBrand: 'Apple Ply 16mm BWP',
      plywoodTypes: [] as string[],
      laminateCodes: [] as string[]
    };

    try {
      // PATCH Phase 6: Tenant-aware caching
      const tenantId = (req as AuthRequest).tenantId || 'default';
      const cacheKey = `${CACHE_KEYS.MASTER_SETTINGS}:${tenantId}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json(ok(cached));
      }



      const memory = await safeQuery(
        () => db.select()
          .from(masterSettingsMemory)
          .where(eq(masterSettingsMemory.tenantId, tenantId)) // Filter by Tenant
          .orderBy(desc(masterSettingsMemory.updatedAt))
          .limit(1),
        []
      );

      if (!Array.isArray(memory) || memory.length === 0) {
        return res.json(ok(defaultSettings));
      }

      // PATCH 9 + 13 + 14: Normalize ALL fields for guaranteed types
      const settings = (memory[0] || {}) as any;
      const normalizedSettings = {
        sheetWidth: normString(settings?.sheetWidth) || '1210',
        sheetHeight: normString(settings?.sheetHeight) || '2420',
        kerf: normString(settings?.kerf) || '5',
        masterLaminateCode: settings?.masterLaminateCode ? normString(settings.masterLaminateCode) : null,
        masterPlywoodBrand: normString(settings?.masterPlywoodBrand) || 'Apple Ply 16mm BWP',
        optimizePlywoodUsage: normString(settings?.optimizePlywoodUsage) || 'true',
        updatedAt: normDateISO(settings?.updatedAt),
        plywoodTypes: normArray(settings?.plywoodTypes).map(normString),
        laminateCodes: normArray(settings?.laminateCodes).map(normString)
      };

      // PATCH 12 + 13: Validate response and wrap with ok()
      const validated = safeValidate(MasterSettingsMemorySchema, normalizedSettings, defaultSettings);

      // PATCH 15: Store in cache (Tenant-Specific)
      await cacheService.set(cacheKey, validated);

      res.json(ok(validated));
    } catch (error: any) {
      console.error("Error fetching Master Settings memory:", error);
      res.status(500).json(err("Failed to load master settings memory", error?.message));
    }
  });

  // Save or update Master Settings memory (including master laminate code)
  app.post("/api/master-settings-memory", authenticate, async (req, res) => {
    try {
      const validation = insertMasterSettingsMemorySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json(err("Invalid request data", validation.error.issues));
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
          .where(and(
            eq(masterSettingsMemory.id, existing[0]?.id),
            eq(masterSettingsMemory.tenantId, (req as AuthRequest).tenantId || 'default')
          ))
          .returning();

        // PATCH 15: Invalidate cache on mutation
        const tenantId = (req as AuthRequest).tenantId || 'default';
        await cacheService.del(`${CACHE_KEYS.MASTER_SETTINGS}:${tenantId}`);

        return res.json(ok(updated));
      } else {
        // Insert new record
        const [newMemory] = await db.insert(masterSettingsMemory)
          .values({
            tenantId: (req as AuthRequest).tenantId || 'default',
            sheetWidth: sheetWidth || '1210',
            sheetHeight: sheetHeight || '2420',
            kerf: kerf || '5',
            masterLaminateCode: masterLaminateCode || null,
            masterPlywoodBrand: masterPlywoodBrand || null
          } as any) // Cast needed until type inference catches up
          .returning();

        return res.json(ok(newMemory));
      }
    } catch (error: any) {
      console.error("Error saving Master Settings memory:", error);
      res.status(500).json(err("Failed to save Master Settings memory", error?.message));
    }
  });

  // Simplified Master Settings routes (single master laminate + sheet defaults) - protected
  app.get("/api/master-settings", authenticate, async (_req, res) => {
    const defaultSettings = {
      id: 0,
      sheetWidth: '1210',
      sheetHeight: '2420',
      kerf: '5',
      masterLaminateCode: null,
      masterPlywoodBrand: 'Apple Ply 16mm BWP',
      optimizePlywoodUsage: 'true',
      updatedAt: new Date().toISOString(),
      plywoodTypes: [] as string[],
      laminateCodes: [] as string[]
    };

    try {
      // PATCH 15: Check cache first
      const cached = getCache(CACHE_KEYS.MASTER_SETTINGS);
      if (cached) {
        return res.json(ok(cached));
      }

      const result = await safeQuery(
        () => db.select().from(masterSettingsMemory).limit(1),
        []
      );

      let settings = Array.isArray(result) && result.length > 0 ? result[0] : null;

      // Auto-create if missing (first-time install)
      if (!settings) {
        try {
          const [inserted] = await db.insert(masterSettingsMemory).values({}).returning();
          settings = inserted;
        } catch (insertErr) {
          console.error("Error auto-creating master settings:", insertErr);
          return res.json(ok(defaultSettings));
        }
      }

      // PATCH 9 + 12 + 13 + 14: Normalize ALL fields and validate with Zod
      const settingsAny = settings as any;
      const normalizedSettings = {
        id: normNumber(settings?.id),
        sheetWidth: normString(settings?.sheetWidth) || '1210',
        sheetHeight: normString(settings?.sheetHeight) || '2420',
        kerf: normString(settings?.kerf) || '5',
        masterLaminateCode: settings?.masterLaminateCode ? normString(settings.masterLaminateCode) : null,
        masterPlywoodBrand: normString(settings?.masterPlywoodBrand) || 'Apple Ply 16mm BWP',
        optimizePlywoodUsage: normString(settings?.optimizePlywoodUsage) || 'true',
        updatedAt: normDateISO(settings?.updatedAt),
        plywoodTypes: (Array.isArray(settingsAny?.plywoodTypes) ? settingsAny.plywoodTypes : []).map((v: any) => normString(v)),
        laminateCodes: (Array.isArray(settingsAny?.laminateCodes) ? settingsAny.laminateCodes : []).map((v: any) => normString(v))
      };

      // PATCH 12 + 13: Validate response and wrap with ok()
      const validated = safeValidate(MasterSettingsResponseSchema, normalizedSettings, defaultSettings as any);

      // PATCH 15: Store in cache
      setCache(CACHE_KEYS.MASTER_SETTINGS, validated);

      res.json(ok(validated));
    } catch (error: any) {
      console.error("Error fetching Master Settings:", error);
      res.status(500).json(err("Failed to load master settings", error?.message));
    }
  });

  app.post("/api/master-settings", authenticate, async (req, res) => {
    try {
      const validation = masterSettingsUpdateSchema.safeParse(req.body ?? {});
      if (!validation.success) {
        return res.status(400).json(err("Invalid request data", validation.error.issues));
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

        // PATCH 15: Invalidate cache on mutation
        clearCache(CACHE_KEYS.MASTER_SETTINGS);
        clearCache(CACHE_KEYS.MASTER_SETTINGS_MEMORY);

        return res.json(ok(updated));
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

      // PATCH 15: Invalidate cache on mutation
      clearCache(CACHE_KEYS.MASTER_SETTINGS);
      clearCache(CACHE_KEYS.MASTER_SETTINGS_MEMORY);

      return res.json(ok(inserted));
    } catch (error: any) {
      console.error("Error saving Master Settings:", error);
      res.status(500).json(err("Failed to save Master Settings", error?.message));
    }
  });

  // Godown Memory routes (protected)

  // Get all godown names
  app.get("/api/godown-memory", authenticate, async (_req, res) => {
    try {
      const godowns = await safeQuery(
        () => db.select().from(godownMemory).orderBy(desc(godownMemory.createdAt)),
        []
      );
      res.json(Array.isArray(godowns) ? godowns : []);
    } catch (error) {
      console.error("Error fetching godown memory:", error);
      res.json([]);
    }
  });

  // Save a new godown name
  app.post("/api/godown-memory", authenticate, async (req, res) => {
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

  // Godown plywood brands (history + autocomplete) - protected
  app.get("/api/godown/plywood", authenticate, async (_req, res) => {
    try {
      // PATCH 15: Check cache first
      const cached = await cacheService.get(CACHE_KEYS.GODOWN_PLYWOOD);
      if (cached) {
        return res.json(ok(cached));
      }

      const rows = await safeQuery(
        () => db.select().from(plywoodBrandMemory).orderBy(desc(plywoodBrandMemory.createdAt)),
        []
      );

      // PATCH 9 + 12 + 13 + 14: Normalize ALL fields and validate with Zod
      const safe = (Array.isArray(rows) ? rows : []).map((r: any) => ({
        id: normNumber(r.id),
        brand: normString(r.brand),
        createdAt: normDateISO(r.createdAt)
      }));

      // PATCH 12 + 13: Validate response and wrap with ok()
      const validated = safeValidateArray(PlywoodListSchema, safe);

      // PATCH 15: Store in cache
      setCache(CACHE_KEYS.GODOWN_PLYWOOD, validated);

      res.json(ok(validated));
    } catch (error: any) {
      console.error("Error GET /api/godown/plywood:", error);
      res.status(500).json(err("Failed to load plywood godown", error?.message));
    }
  });

  app.post("/api/godown/plywood", authenticate, async (req, res) => {
    try {
      const brandRaw = (req.body?.brand as string | undefined)?.trim() ?? "";
      if (!brandRaw) {
        return res.status(400).json(err("Brand is required"));
      }

      const brandLower = brandRaw.toLowerCase();
      const existing = await db.select()
        .from(plywoodBrandMemory)
        .where(sql`lower(${plywoodBrandMemory.brand}) = ${brandLower}`);

      if (existing.length > 0) {
        return res.json(ok(existing[0]));
      }

      const validation = insertPlywoodBrandMemorySchema.safeParse({ brand: brandRaw });
      if (!validation.success) {
        return res.status(400).json(err("Invalid data", validation.error));
      }

      const [inserted] = await db.insert(plywoodBrandMemory)
        .values({ brand: brandRaw })
        .returning();

      // PATCH 15: Invalidate cache on mutation
      clearCache(CACHE_KEYS.GODOWN_PLYWOOD);

      res.json(ok(inserted));
    } catch (error: any) {
      console.error("Error saving plywood brand to godown:", error);
      res.status(500).json(err("Failed to save plywood brand", error?.message));
    }
  });

  // ✅ Redundant routes deleted. Use /api/laminate-code-godown instead.

  // ✅ CENTRAL LAMINATE CODE GODOWN (Warehouse) Routes

  // Get all laminate codes from central godown - protected
  app.get("/api/laminate-code-godown", authenticate, async (_req, res) => {
    try {
      // PATCH 15: Check cache first
      const cached = await cacheService.get(CACHE_KEYS.GODOWN_LAMINATE);
      if (cached) {
        return res.json(ok(cached));
      }

      // Use raw pg pool for Supabase compatibility
      const result = await safeDbQuery(
        `SELECT id, code, name, inner_code, supplier, thickness, description, wood_grains_enabled, created_at, updated_at
         FROM laminate_code_godown
         ORDER BY code`
      );
      const rows = result.rows || [];

      // PATCH 9 + 12 + 13 + 14: Normalize ALL fields and validate with Zod
      const safe = (Array.isArray(rows) ? rows : []).map((r: any) => ({
        id: normNumber(r.id),
        code: normString(r.code),
        name: normString(r.name),
        innerCode: r.inner_code ? normString(r.inner_code) : null,
        supplier: r.supplier ? normString(r.supplier) : null,
        thickness: r.thickness ? normString(r.thickness) : null,
        description: r.description ? normString(r.description) : null,
        woodGrainsEnabled: normString(r.wood_grains_enabled) || 'false',
        createdAt: normDateISO(r.created_at),
        updatedAt: normDateISO(r.updated_at)
      }));

      // PATCH 12 + 13: Validate response and wrap with ok()
      const validated = safeValidateArray(LaminateListSchema, safe);

      // PATCH 15: Store in cache
      setCache(CACHE_KEYS.GODOWN_LAMINATE, validated);

      res.json(ok(validated));
    } catch (error: any) {
      console.error("Error GET /api/laminate-code-godown:", error);
      res.status(500).json(err("Failed to load laminate godown", error?.message));
    }
  });

  // Get single laminate code from godown
  app.get("/api/laminate-code-godown/:code", authenticate, async (req, res) => {
    try {
      const { code } = req.params;
      // Use raw pg pool for Supabase compatibility
      const result = await safeDbQuery(
        `SELECT id, code, name, inner_code, supplier, thickness, description, wood_grains_enabled, created_at, updated_at
         FROM laminate_code_godown
         WHERE code = $1
         LIMIT 1`,
        [code]
      );
      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json(err("Laminate code not found"));
      }
      const r = result.rows[0];
      res.json(ok({
        id: r.id,
        code: r.code,
        name: r.name,
        innerCode: r.inner_code,
        supplier: r.supplier,
        thickness: r.thickness,
        description: r.description,
        woodGrainsEnabled: r.wood_grains_enabled,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }));
    } catch (error: any) {
      console.error("Error fetching laminate code:", error);
      res.status(500).json(err("Failed to fetch laminate code", error?.message));
    }
  });

  // Add new laminate code to central godown (with wood grains setting)
  app.post("/api/laminate-code-godown", authenticate, async (req, res) => {
    try {
      const validation = insertLaminateCodeGodownSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json(err("Invalid data", validation.error));
      }

      const { code, name, innerCode, supplier, thickness, description, woodGrainsEnabled } = validation.data;
      const woodGrainsValue = normBoolean(woodGrainsEnabled) ? 'true' : 'false';

      // Check if code already exists (using raw pg pool for Supabase compatibility)
      const existing = await db.select().from(laminateCodeGodown).where(eq(laminateCodeGodown.code, code));
      if (existing.length > 0) {
        return res.status(409).json(err("Laminate code already exists in godown"));
      }

      // Use raw pg pool for Supabase compatibility
      const insertResult = await safeDbQuery(
        `INSERT INTO laminate_code_godown (code, name, inner_code, supplier, thickness, description, wood_grains_enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, code, name, inner_code, supplier, thickness, description, wood_grains_enabled, created_at, updated_at`,
        [code, name, innerCode || null, supplier || null, thickness || null, description || null, woodGrainsValue]
      );

      const newCode = insertResult.rows?.[0] ? {
        id: insertResult.rows[0].id,
        code: insertResult.rows[0].code,
        name: insertResult.rows[0].name,
        innerCode: insertResult.rows[0].inner_code,
        supplier: insertResult.rows[0].supplier,
        thickness: insertResult.rows[0].thickness,
        description: insertResult.rows[0].description,
        woodGrainsEnabled: insertResult.rows[0].wood_grains_enabled,
        createdAt: insertResult.rows[0].created_at,
        updatedAt: insertResult.rows[0].updated_at
      } : null;

      // Insert/update wood grains preference using raw pg pool
      await safeDbQuery(
        `INSERT INTO laminate_wood_grains_preference (laminate_code, wood_grains_enabled)
         VALUES ($1, $2)
         ON CONFLICT (laminate_code) DO UPDATE SET wood_grains_enabled = $2, updated_at = now()`,
        [code, woodGrainsValue]
      );

      // PATCH 15: Invalidate cache on mutation
      clearCache(CACHE_KEYS.GODOWN_LAMINATE);
      clearCache(CACHE_KEYS.WOOD_GRAINS);

      res.json(ok(newCode));
    } catch (error: any) {
      console.error("Error saving laminate code to godown:", error);
      res.status(500).json(err("Failed to save laminate code", error?.message));
    }
  });

  // Update laminate code in central godown (includes wood grains preference)
  app.patch("/api/laminate-code-godown/:code", authenticate, async (req, res) => {
    try {
      const { code } = req.params;
      const { name, innerCode, supplier, thickness, description, woodGrainsEnabled } = req.body;
      const hasWoodGrainsUpdate = woodGrainsEnabled !== undefined;
      const woodGrainsValue = normBoolean(woodGrainsEnabled) ? 'true' : 'false';

      const [updated] = await db.update(laminateCodeGodown)
        .set({
          name: name || undefined,
          innerCode: innerCode || null,
          supplier: supplier || null,
          thickness: thickness || null,
          description: description || null,
          woodGrainsEnabled: hasWoodGrainsUpdate ? woodGrainsValue : undefined,
          updatedAt: sql`now()`
        })
        .where(eq(laminateCodeGodown.code, code))
        .returning();

      if (!updated) {
        return res.status(404).json(err("Laminate code not found in godown"));
      }

      if (hasWoodGrainsUpdate) {
        await db.insert(laminateWoodGrainsPreference)
          .values({
            laminateCode: code,
            woodGrainsEnabled: woodGrainsValue
          })
          .onConflictDoUpdate({
            target: laminateWoodGrainsPreference.laminateCode,
            set: {
              woodGrainsEnabled: woodGrainsValue,
              updatedAt: sql`now()`
            }
          });
      }

      // PATCH 15: Invalidate cache on mutation
      clearCache(CACHE_KEYS.GODOWN_LAMINATE);
      clearCache(CACHE_KEYS.WOOD_GRAINS);

      res.json(ok(updated));
    } catch (error: any) {
      console.error("Error updating laminate code:", error);
      res.status(500).json(err("Failed to update laminate code", error?.message));
    }
  });

  // Delete laminate code from central godown
  app.delete("/api/laminate-code-godown/:code", authenticate, async (req, res) => {
    try {
      const { code } = req.params;
      const deleted = await db.delete(laminateCodeGodown).where(eq(laminateCodeGodown.code, code)).returning();

      if (deleted.length === 0) {
        return res.status(404).json(err("Laminate code not found in godown"));
      }

      await db.delete(laminateWoodGrainsPreference)
        .where(eq(laminateWoodGrainsPreference.laminateCode, code));

      // PATCH 15: Invalidate cache on mutation
      clearCache(CACHE_KEYS.GODOWN_LAMINATE);
      clearCache(CACHE_KEYS.WOOD_GRAINS);

      res.json(ok({ message: "Laminate code deleted from godown successfully" }));
    } catch (error: any) {
      console.error("Error deleting laminate code:", error);
      res.status(500).json(err("Failed to delete laminate code", error?.message));
    }
  });

  // Wood grains preference routes (protected)

  // Get all wood grains preferences from WOOD GRAINS PREFERENCE TABLE
  app.get("/api/wood-grains-preferences", authenticate, async (_req, res) => {
    try {
      // PATCH 15: Check cache first
      const cached = getCache(CACHE_KEYS.WOOD_GRAINS);
      if (cached) {
        return res.json(ok(cached));
      }

      const prefRows = await safeQuery(
        () => db.select().from(laminateWoodGrainsPreference),
        []
      );
      const godownRows = await safeQuery(
        () => db.select().from(laminateCodeGodown),
        []
      );

      const byCode = new Map<string, boolean>();
      (Array.isArray(prefRows) ? prefRows : []).forEach((r: any) => {
        byCode.set(normString(r.laminateCode), normBoolean(r.woodGrainsEnabled));
      });
      (Array.isArray(godownRows) ? godownRows : []).forEach((r: any) => {
        byCode.set(normString(r.code), normBoolean(r.woodGrainsEnabled));
      });

      const safeRows = Array.from(byCode.entries()).map(([laminateCode, hasWoodGrains]) => ({
        laminateCode,
        hasWoodGrains
      }));

      // PATCH 12 + 13: Validate response and wrap with ok()
      const validated = safeValidateArray(WoodGrainsListSchema, safeRows);

      // PATCH 15: Store in cache
      setCache(CACHE_KEYS.WOOD_GRAINS, validated);

      res.json(ok(validated));
    } catch (error: any) {
      console.error("Error GET /api/wood-grains-preferences:", error);
      res.status(500).json(err("Failed to load wood grains preferences", error?.message));
    }
  });

  // Get wood grains preference for a specific laminate code
  app.get("/api/wood-grains-preference/:code", authenticate, async (req, res) => {
    try {
      const { code } = req.params;
      const [godown] = await db.select()
        .from(laminateCodeGodown)
        .where(eq(laminateCodeGodown.code, code))
        .limit(1);

      if (godown) {
        return res.json(ok({ woodGrainsEnabled: godown.woodGrainsEnabled === 'true' }));
      }

      const preference = await db.select()
        .from(laminateWoodGrainsPreference)
        .where(eq(laminateWoodGrainsPreference.laminateCode, code));

      if (preference.length === 0) {
        return res.json(ok({ woodGrainsEnabled: false }));
      }

      res.json(ok({ woodGrainsEnabled: preference[0]?.woodGrainsEnabled === 'true' }));
    } catch (error: any) {
      console.error("Error fetching wood grains preference:", error);
      res.status(500).json(err("Failed to fetch wood grains preference", error?.message));
    }
  });

  // Save or update wood grains preference for a laminate code
  app.post("/api/wood-grains-preference", authenticate, async (req, res) => {
    try {
      const { laminateCode, woodGrainsEnabled } = req.body;
      const woodGrainsValue = normBoolean(woodGrainsEnabled) ? 'true' : 'false';

      if (!laminateCode) {
        return res.status(400).json(err("Laminate code is required"));
      }

      // Check if preference already exists
      const existing = await db.select()
        .from(laminateWoodGrainsPreference)
        .where(eq(laminateWoodGrainsPreference.laminateCode, laminateCode));

      if (existing.length > 0) {
        // Update existing preference
        const [updated] = await db.update(laminateWoodGrainsPreference)
          .set({
            woodGrainsEnabled: woodGrainsValue,
            updatedAt: sql`now()`
          })
          .where(eq(laminateWoodGrainsPreference.laminateCode, laminateCode))
          .returning();

        // PATCH 15: Invalidate cache on mutation
        clearCache(CACHE_KEYS.WOOD_GRAINS);
        clearCache(CACHE_KEYS.GODOWN_LAMINATE);

        // PATCH 13: Return normalized boolean response wrapped with ok()
        await db.update(laminateCodeGodown)
          .set({
            woodGrainsEnabled: woodGrainsValue,
            updatedAt: sql`now()`
          })
          .where(eq(laminateCodeGodown.code, laminateCode));

        return res.json(ok({
          id: updated.id,
          laminateCode: updated.laminateCode,
          woodGrainsEnabled: updated.woodGrainsEnabled === 'true',
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt
        }));
      } else {
        // Insert new preference
        const [newPreference] = await db.insert(laminateWoodGrainsPreference)
          .values({
            laminateCode,
            woodGrainsEnabled: woodGrainsValue
          })
          .returning();

        await db.update(laminateCodeGodown)
          .set({
            woodGrainsEnabled: woodGrainsValue,
            updatedAt: sql`now()`
          })
          .where(eq(laminateCodeGodown.code, laminateCode));

        // PATCH 15: Invalidate cache on mutation
        clearCache(CACHE_KEYS.WOOD_GRAINS);
        clearCache(CACHE_KEYS.GODOWN_LAMINATE);

        // PATCH 13: Return normalized boolean response wrapped with ok()
        return res.json(ok({
          id: newPreference.id,
          laminateCode: newPreference.laminateCode,
          woodGrainsEnabled: newPreference.woodGrainsEnabled === 'true',
          createdAt: newPreference.createdAt,
          updatedAt: newPreference.updatedAt
        }));
      }
    } catch (error: any) {
      console.error("Error saving wood grains preference:", error);
      res.status(500).json(err("Failed to save wood grains preference", error?.message));
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

  function sanitizeFilename(filename: string): string {
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
  app.post("/api/clients/:clientSlug/files", authenticate, async (req, res) => {
    try {
      const validation = saveClientFilesSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid data", details: validation.error });
      }

      const { pdf, materialList } = validation.data;
      const clientSlug = slugifyClientName(req.params.clientSlug);
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

  // Convert DWG to DXF - accepts raw binary data (protected)
  app.post("/api/convert-dwg-to-dxf", authenticate, async (req, res) => {
    try {
      const fileContent = req.body as Buffer;
      if (!fileContent || fileContent.length === 0) {
        return res.status(400).json({ error: "No file content provided" });
      }

      // PATCH 50: Check if dwg2dxf binary exists before using it
      let dwg2dxfPath: string;
      try {
        // Try to find dwg2dxf in PATH
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

        // PATCH 50: Use execFileSync for safety (no shell injection possible)
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
      // Don't leak error details to client
      res.status(500).json({ error: "Failed to convert DWG file. Ensure it's a valid AutoCAD drawing." });
    }
  });

  // Get client file (PDF or material list) - protected
  app.get("/api/clients/:clientSlug/files/:filename", authenticate, async (req, res) => {
    try {
      const clientSlug = slugifyClientName(req.params.clientSlug);
      const { filename } = req.params;
      const safeFilename = sanitizeFilename(filename);

      if (!clientSlug || !safeFilename) {
        return res.status(400).json({ error: "Invalid client slug or filename" });
      }

      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.getClientFile(clientSlug, safeFilename);

      await objectStorageService.downloadObject(file, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      console.error("Error retrieving client file:", error);
      res.status(500).json({ error: "Failed to retrieve client file" });
    }
  });

  // ==========================================
  // LAMINATE CATALOGUE PDF ROUTES
  // ==========================================

  // Schema for uploading catalogue
  const uploadCatalogueSchema = z.object({
    filename: z.string().min(1),
    mimeType: z.string().refine(val => val === 'application/pdf', { message: 'Only PDF files allowed' }),
    base64: z.string().min(1),
  });

  // Upload laminate catalogue PDF (protected)
  app.post("/api/laminate-catalogue", authenticate, async (req, res) => {
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

      // Store metadata in localStorage key for persistence
      // In production, this would be stored in database
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
  app.get("/api/laminate-catalogue/:filename", authenticate, async (req, res) => {
    try {
      const { filename } = req.params;
      const safeFilename = sanitizeFilename(filename);

      if (!safeFilename) {
        return res.status(400).json(err("Invalid filename"));
      }

      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.getClientFile('catalogues', safeFilename);

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
  app.get("/api/laminate-catalogues", authenticate, async (_req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const cataloguesDir = path.join(process.cwd(), 'storage', 'catalogues');

      // Check if directory exists
      if (!fs.existsSync(cataloguesDir)) {
        return res.json(ok([]));
      }

      const files = fs.readdirSync(cataloguesDir)
        .filter(f => f.endsWith('.pdf'))
        .map(f => {
          const stats = fs.statSync(path.join(cataloguesDir, f));
          return {
            filename: f,
            size: stats.size,
            uploadedAt: stats.mtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      res.json(ok(files));
    } catch (error: any) {
      console.error("Error listing catalogues:", error);
      res.status(500).json(err("Failed to list catalogues", error?.message));
    }
  });

  // Delete catalogue (protected)
  app.delete("/api/laminate-catalogue/:filename", authenticate, async (req, res) => {
    try {
      const { filename } = req.params;
      const safeFilename = sanitizeFilename(filename);
      const filePath = path.join(process.cwd(), 'storage', 'catalogues', safeFilename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json(err("Catalogue not found"));
      }

      fs.unlinkSync(filePath);
      res.json(ok({ message: "Catalogue deleted successfully" }));
    } catch (error: any) {
      console.error("Error deleting catalogue:", error);
      res.status(500).json(err("Failed to delete catalogue", error?.message));
    }
  });

  // ============================================
  // LAMINATE IMAGE UPLOAD API
  // ============================================

  // Upload laminate image (thumbnail) - protected
  app.post("/api/laminate-image/:code", authenticate, async (req, res) => {
    try {
      const { code } = req.params;
      const { mimeType, base64 } = req.body;

      if (!code || !base64) {
        return res.status(400).json(err("Missing laminate code or image data"));
      }

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
      const safeCode = code.replace(/[^a-zA-Z0-9-_]/g, '_');
      const filename = `${safeCode}.${ext}`;

      // Ensure directory exists
      const imagesDir = path.join(process.cwd(), 'storage', 'laminate-images');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }

      // Delete any existing image for this code (different extensions)
      const existingFiles = fs.readdirSync(imagesDir).filter(f => f.startsWith(safeCode + '.'));
      existingFiles.forEach(f => {
        fs.unlinkSync(path.join(imagesDir, f));
      });

      // Save new image
      const filePath = path.join(imagesDir, filename);
      const buffer = Buffer.from(base64, 'base64');
      fs.writeFileSync(filePath, buffer);

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
  app.get("/api/laminate-image/:code", authenticate, async (req, res) => {
    try {
      const { code } = req.params;
      const safeCode = code.replace(/[^a-zA-Z0-9-_]/g, '_');
      const imagesDir = path.join(process.cwd(), 'storage', 'laminate-images');

      // Find image file (could be jpg, png, webp, gif)
      if (!fs.existsSync(imagesDir)) {
        return res.status(404).json(err("Image not found"));
      }

      const files = fs.readdirSync(imagesDir).filter(f => f.startsWith(safeCode + '.'));
      if (files.length === 0) {
        return res.status(404).json(err("Image not found"));
      }

      const filename = files[0];
      const filePath = path.join(imagesDir, filename);
      const ext = path.extname(filename).slice(1);

      const mimeTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif'
      };

      res.setHeader('Content-Type', mimeTypes[ext] || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      fs.createReadStream(filePath).pipe(res);
    } catch (error: any) {
      console.error("Error getting laminate image:", error);
      res.status(500).json(err("Failed to get image", error?.message));
    }
  });

  // Delete laminate image (protected)
  app.delete("/api/laminate-image/:code", authenticate, async (req, res) => {
    try {
      const { code } = req.params;
      const safeCode = code.replace(/[^a-zA-Z0-9-_]/g, '_');
      const imagesDir = path.join(process.cwd(), 'storage', 'laminate-images');

      if (!fs.existsSync(imagesDir)) {
        return res.status(404).json(err("Image not found"));
      }

      const files = fs.readdirSync(imagesDir).filter(f => f.startsWith(safeCode + '.'));
      if (files.length === 0) {
        return res.status(404).json(err("Image not found"));
      }

      files.forEach(f => {
        fs.unlinkSync(path.join(imagesDir, f));
      });

      res.json(ok({ message: "Image deleted successfully" }));
    } catch (error: any) {
      console.error("Error deleting laminate image:", error);
      res.status(500).json(err("Failed to delete image", error?.message));
    }
  });

  // List all laminate images (protected)
  app.get("/api/laminate-images", authenticate, async (_req, res) => {
    try {
      const imagesDir = path.join(process.cwd(), 'storage', 'laminate-images');

      if (!fs.existsSync(imagesDir)) {
        return res.json(ok({}));
      }

      const files = fs.readdirSync(imagesDir);
      const imageMap: Record<string, string> = {};

      files.forEach(f => {
        const ext = path.extname(f);
        const code = f.replace(ext, '').replace(/_/g, '-'); // Convert back underscores
        imageMap[code] = `/api/laminate-image/${encodeURIComponent(code)}`;
      });

      res.json(ok(imageMap));
    } catch (error: any) {
      console.error("Error listing laminate images:", error);
      res.status(500).json(err("Failed to list images", error?.message));
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
