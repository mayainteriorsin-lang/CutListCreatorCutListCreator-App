/**
 * Health Routes
 * 
 * System health, liveness, and readiness endpoints.
 * Used by orchestrators (K8s, ECS) and load balancers.
 * 
 * Routes:
 * - GET /api/health/live  - Liveness probe
 * - GET /api/health/ready - Readiness probe (checks DB)
 * - GET /api/health       - Combined health check
 */

import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { safeQuery } from '../db/adapter';

const router = Router();

/**
 * Liveness probe - Is the process alive?
 * Returns 200 if process is running.
 */
router.get("/health/live", (_req, res) => {
    res.status(200).json({
        status: "alive",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

/**
 * Readiness probe - Can the service handle requests?
 * Checks database connectivity.
 * Returns 503 if dependencies are unavailable.
 */
router.get("/health/ready", async (_req, res) => {
    const timestamp = new Date().toISOString();
    let dbReady = false;

    try {
        await safeQuery(() => db.execute(sql`SELECT 1`), null as any, { retries: 1, delayMs: 50 });
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
 * Returns overall system health with all dependency statuses.
 */
router.get("/health", async (_req, res) => {
    const uptime = process.uptime();
    const timestamp = new Date().toISOString();
    let dbStatus = "unknown";

    try {
        await safeQuery(() => db.execute(sql`SELECT 1`), null as any, { retries: 1, delayMs: 50 });
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

export default router;
