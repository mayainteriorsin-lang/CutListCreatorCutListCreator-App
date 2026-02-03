import "dotenv/config";
// FIX: Sanitize DATABASE_URL if it has quotes (env issue)
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('"') || process.env.DATABASE_URL.startsWith("'"))) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^["']|["']$/g, '');
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db, pool } from "./db";
import { createDBAdapter } from "./db/adapter";
import { err } from "./lib/apiEnvelope";

// PHASE 8: Enterprise Hardening Imports
import { requestIdMiddleware, getRequestId, REQUEST_ID_HEADER } from "./middleware/requestId";
import { runStartupValidation } from "./lib/startupValidation";
import { setupGracefulShutdown, isShutdownInProgress } from "./lib/gracefulShutdown";

// PHASE 14: Per-Tenant Rate Limiting (GAP-SCL-001)
import { tenantRateLimit } from "./middleware/tenantRateLimit";

// PHASE 8: Run startup config validation (fail-fast in production)
runStartupValidation();

// PATCH 14: Create centralized DB adapter with retry logic
export const DB = createDBAdapter(db);

const app = express();
// PATCH 51: Security Headers
import helmet from "helmet";
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for development/inline scripts
}));

app.set("trust proxy", 1);

// PHASE 8: Request correlation middleware (must be early in chain)
app.use(requestIdMiddleware);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));
// Raw binary for DWG uploads
app.use("/api/convert-dwg-to-dxf", express.raw({ type: "application/octet-stream", limit: "50mb" }));

// PATCH 50: Rate limiting to prevent abuse
import rateLimit from "express-rate-limit";
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests, please try again later." }
});
// Apply rate limiting to all API routes
app.use("/api", limiter);

// PATCH 7: Safe JSON middleware - ensures no route sends undefined/null responses
app.use((req, res, next) => {
  const oldJson = res.json.bind(res);
  res.json = function (data: any) {
    if (data === undefined || data === null) {
      console.warn("WARNING: Empty JSON response corrected:", req.path);
      return oldJson({});
    }
    return oldJson(data);
  };
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const requestId = getRequestId(req);
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // PHASE 8: Include requestId in structured logs
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      console.log(`[METRICS] requestId=${requestId} request_duration_ms=${duration} method=${req.method} path=${path} status=${res.statusCode}`);

      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "...";
      }

      log(logLine);
    }
  });

  next();
});

// Add test route
app.get('/test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Test Page</title></head>
    <body>
      <h1>Server is working!</h1>
      <p>Current time: ${new Date().toISOString()}</p>
      <p>Node.js version: ${process.version}</p>
      <script>console.log('JavaScript is working');</script>
    </body>
    </html>
  `);
});

(async () => {
  const server = await registerRoutes(app);

  // PATCH 16 + PHASE 8: Global error handler - ALWAYS returns JSON with ok/error envelope
  // Includes requestId for correlation
  app.use((e: any, req: Request, res: Response, _next: NextFunction) => {
    const status = e.status || e.statusCode || 500;
    const message = e?.message || "Internal Server Error";
    const requestId = getRequestId(req);
    const details = process.env.NODE_ENV === "development" ? (e?.stack || e) : undefined;

    console.error(`[GLOBAL ERROR] requestId=${requestId}`, message, details);
    res.status(status).json({
      ...err(message, details),
      requestId, // Include for client-side correlation
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const defaultPort = app.get("env") === "development" ? 5173 : 5000;
  const port = parseInt(process.env.PORT || `${defaultPort}`, 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });

  // PHASE 8: Setup graceful shutdown
  setupGracefulShutdown({
    server,
    timeoutMs: 30000,
    onShutdown: async () => {
      console.log('[SHUTDOWN] Closing database pool...');
      try {
        await pool.end();
        console.log('[SHUTDOWN] Database pool closed');
      } catch (e) {
        console.error('[SHUTDOWN] Error closing database pool:', e);
      }
    },
  });
})().catch(err => {
  console.error("FATAL SERVER STARTUP ERROR:", err);
  process.exit(1);
});
