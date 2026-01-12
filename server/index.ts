import "dotenv/config";
// FIX: Sanitize DATABASE_URL if it has quotes (env issue)
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('"') || process.env.DATABASE_URL.startsWith("'"))) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^["']|["']$/g, '');
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import { createDBAdapter } from "./db/adapter";
import { err } from "./lib/apiEnvelope";

// PATCH 14: Create centralized DB adapter with retry logic
export const DB = createDBAdapter(db);

const app = express();
app.set("trust proxy", 1);
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
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
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

  // PATCH 16: Global error handler - ALWAYS returns JSON with ok/error envelope
  app.use((e: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = e.status || e.statusCode || 500;
    const message = e?.message || "Internal Server Error";
    const details = process.env.NODE_ENV === "development" ? (e?.stack || e) : undefined;

    console.error("[GLOBAL ERROR]", message, details);
    res.status(status).json(err(message, details));
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
})().catch(err => {
  console.error("FATAL SERVER STARTUP ERROR:", err);
  process.exit(1);
});
