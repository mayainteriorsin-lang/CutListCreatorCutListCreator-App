import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { sql } from "drizzle-orm";

// Route modules
import { crmRouter } from "./routes/crmRoutes";
import { aiInteriorDetectRouter } from "./routes/aiInteriorDetect";
import { aiWardrobeLayoutRouter } from "./routes/aiWardrobeLayout";
import quotationRouter from "./routes/quotationRoutes";
import libraryRouter from "./routes/libraryRoutes";
import authRouter from "./routes/authRoutes";
import laminateImageRouter from "./routes/laminateImage.routes";
import materialRouter from "./routes/material.routes";
import healthRouter from "./routes/health.routes";
import clientFileRouter from "./routes/clientFile.routes";
import catalogueRouter from "./routes/catalogue.routes";
import conversionRouter from "./routes/conversion.routes";

// Middleware
import { authenticate } from "./middleware/auth";
import { tenantRateLimit } from "./middleware/tenantRateLimit";

export async function registerRoutes(app: Express): Promise<Server> {
  // ==========================================================================
  // AUTO-MIGRATIONS: Ensure tables and columns exist
  // ==========================================================================

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

  try {
    await db.execute(sql`ALTER TABLE master_settings_memory ADD COLUMN IF NOT EXISTS master_plywood_brand text`);
    console.log("✅ Database Schema Updated: master_plywood_brand column added.");

    await db.execute(sql`UPDATE master_settings_memory SET master_plywood_brand = 'Apple Ply 16mm BWP' WHERE master_plywood_brand IS NULL`);
    await db.execute(sql`ALTER TABLE master_settings_memory ALTER COLUMN master_plywood_brand SET DEFAULT 'Apple Ply 16mm BWP'`);
  } catch (err: any) {
    console.error("❌ MIGRATION FAILED MSG:", err.message);
  }

  try {
    await db.execute(sql`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS data text`);
    console.log("✅ Database Schema Updated: quotes.data column added.");

    // Multi-tenancy columns
    await db.execute(sql`ALTER TABLE master_settings_memory ADD COLUMN IF NOT EXISTS tenant_id varchar(255) NOT NULL DEFAULT 'default'`);
    await db.execute(sql`ALTER TABLE laminate_code_godown ADD COLUMN IF NOT EXISTS tenant_id varchar(255) NOT NULL DEFAULT 'default'`);
    await db.execute(sql`ALTER TABLE godown_memory ADD COLUMN IF NOT EXISTS tenant_id varchar(255) NOT NULL DEFAULT 'default'`);
    console.log("✅ Database Schema Updated: tenant_id columns added.");
  } catch (e) {
    console.error("Migration error:", e);
  }

  // ==========================================================================
  // DEV AUTH BYPASS (requires explicit opt-in via DEV_AUTH_ENABLED=true)
  // ==========================================================================

  const isDevAuthEnabled = process.env.DEV_AUTH_ENABLED === 'true' && process.env.NODE_ENV !== 'production';

  if (isDevAuthEnabled) {
    console.warn('[SECURITY WARNING] Dev authentication bypass is ENABLED. Do NOT use in production!');
  }

  app.post("/api/auth/login", async (req, res, next) => {
    const { email, password } = req.body || {};

    if (isDevAuthEnabled &&
      email === 'admin@cutlist.pro' &&
      password === 'admin123') {

      try {
        const jwt = await import('jsonwebtoken');
        const { nanoid } = await import('nanoid');

        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET || JWT_SECRET === 'dev-secret-change-in-production') {
          console.error('[Auth] JWT_SECRET not configured properly');
          return res.status(500).json({ success: false, error: 'Server configuration error' });
        }

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

    // Not dev credentials or dev auth disabled - pass to authRouter
    next();
  });

  // ==========================================================================
  // ROUTE MODULE REGISTRATION
  // ==========================================================================

  // Health routes (public - no auth)
  app.use("/api", healthRouter);

  // Auth routes (public - handles its own auth)
  app.use("/api/auth", authRouter);

  // CRM routes (protected - has internal auth middleware)
  app.use("/api/crm", crmRouter);

  // AI routes (protected + rate limited)
  app.use("/api/ai", authenticate, tenantRateLimit, aiInteriorDetectRouter());
  app.use("/api/ai", authenticate, tenantRateLimit, aiWardrobeLayoutRouter());

  // Quotation & Library routes (protected - have internal auth middleware)
  app.use("/api", quotationRouter);
  app.use("/api", libraryRouter);

  // Material routes (protected + rate limited - has internal auth middleware)
  app.use("/api", materialRouter);

  // Laminate image routes (protected - has internal auth middleware)
  app.use("/api", laminateImageRouter);

  // Client file storage routes
  app.use("/api", clientFileRouter);

  // Laminate catalogue routes
  app.use("/api", catalogueRouter);

  // File conversion routes
  app.use("/api", conversionRouter);

  // ==========================================================================

  const httpServer = createServer(app);
  return httpServer;
}
