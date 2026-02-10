/**
 * PHASE 14: Per-Tenant Rate Limiting Middleware (GAP-SCL-001)
 * PHASE 16: Refactored to use StateStore abstraction for Redis-readiness
 *
 * Implements tenant-aware rate limiting to prevent noisy neighbor issues.
 * Layered on top of global IP-based rate limiting.
 *
 * Storage Backend:
 * - Development: In-memory (automatic)
 * - Production: Redis (set REDIS_URL environment variable)
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { getStateStore, stateKey, STATE_KEYS } from '../services/stateStore';

/**
 * Rate limit configuration by plan
 */
interface PlanRateLimits {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Max requests per window
}

const PLAN_RATE_LIMITS: Record<string, PlanRateLimits> = {
    free: {
        windowMs: 15 * 60 * 1000,  // 15 minutes
        maxRequests: 100,           // 100 requests per 15 min
    },
    starter: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 500,
    },
    professional: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 2000,
    },
    enterprise: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 10000,         // High limit for enterprise
    },
};

const DEFAULT_LIMITS: PlanRateLimits = {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
};

/**
 * Get rate limits for a plan with fallback to default
 */
function getPlanLimits(plan: string): PlanRateLimits {
    return PLAN_RATE_LIMITS[plan] || DEFAULT_LIMITS;
}

/**
 * Rate limit entry stored in state store
 */
interface TenantRateLimitEntry {
    count: number;
    windowStart: number;
    plan: string;
}

/**
 * In-memory plan cache (lightweight, doesn't need distributed storage)
 * Plan changes are infrequent - cache is acceptable
 */
const tenantPlanCache = new Map<string, string>();

/**
 * Get tenant plan (with caching consideration)
 * For Phase 14, we use a simple in-memory approach for plan lookup
 * Plans don't change frequently so local cache is acceptable
 */
function getTenantPlan(tenantId: string): string {
    // Check local cache first
    const cached = tenantPlanCache.get(tenantId);
    if (cached) return cached;

    // Default to enterprise for pilot (production would query database)
    return 'enterprise';
}

/**
 * Set tenant plan (called during auth or tenant lookup)
 */
export function setTenantPlan(tenantId: string, plan: string): void {
    tenantPlanCache.set(tenantId, plan);
}

/**
 * Per-Tenant Rate Limiting Middleware
 *
 * Apply after authentication middleware to have access to tenantId
 * Uses StateStore abstraction for Redis-ready distributed rate limiting
 */
export async function tenantRateLimit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const tenantId = req.tenantId || req.user?.tenantId;

    // Skip rate limiting if no tenant context (global limit still applies)
    if (!tenantId) {
        return next();
    }

    const now = Date.now();
    const plan = getTenantPlan(tenantId);
    const limits = getPlanLimits(plan);

    try {
        const store = getStateStore();
        const key = stateKey(STATE_KEYS.RATE_LIMIT, tenantId);

        // Get current rate limit entry
        let entry = await store.get<TenantRateLimitEntry>(key);

        // Initialize or reset window
        if (!entry || (now - entry.windowStart) > limits.windowMs) {
            entry = {
                count: 1,
                windowStart: now,
                plan: plan,
            };
            await store.set(key, entry, limits.windowMs);
        } else {
            // Increment counter
            entry.count++;
            await store.set(key, entry, limits.windowMs - (now - entry.windowStart));
        }

        // Calculate remaining
        const remaining = Math.max(0, limits.maxRequests - entry.count);
        const resetTime = entry.windowStart + limits.windowMs;

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', limits.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', remaining.toString());
        res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
        res.setHeader('X-RateLimit-Policy', `${limits.maxRequests};w=${Math.floor(limits.windowMs / 1000)}`);

        // Check if limit exceeded
        if (entry.count > limits.maxRequests) {
            // Log rate limit event for monitoring
            console.log(`[RATE_LIMIT] Tenant ${tenantId} exceeded rate limit: ${entry.count}/${limits.maxRequests} (plan: ${plan})`);

            res.setHeader('Retry-After', Math.ceil((resetTime - now) / 1000).toString());

            res.status(429).json({
                success: false,
                error: 'Rate limit exceeded. Please try again later.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil((resetTime - now) / 1000),
                limit: limits.maxRequests,
                window: Math.floor(limits.windowMs / 1000),
            });
            return;
        }

        // Log warning at 80% threshold
        if (entry.count === Math.floor(limits.maxRequests * 0.8)) {
            console.log(`[RATE_LIMIT] Tenant ${tenantId} at 80% of rate limit: ${entry.count}/${limits.maxRequests}`);
        }

        next();
    } catch (error) {
        // On state store error, fail open (allow request) but log
        console.error(`[RATE_LIMIT] State store error for tenant ${tenantId}:`, error);
        next();
    }
}

/**
 * Reset rate limit for a tenant (for admin use)
 */
export async function resetTenantRateLimit(tenantId: string): Promise<void> {
    const store = getStateStore();
    const key = stateKey(STATE_KEYS.RATE_LIMIT, tenantId);
    await store.delete(key);
}

/**
 * Get current rate limit status for a tenant
 */
export async function getTenantRateLimitStatus(tenantId: string): Promise<{
    count: number;
    limit: number;
    remaining: number;
    resetAt: number;
} | null> {
    const store = getStateStore();
    const key = stateKey(STATE_KEYS.RATE_LIMIT, tenantId);
    const entry = await store.get<TenantRateLimitEntry>(key);

    if (!entry) return null;

    const plan = entry.plan;
    const limits = getPlanLimits(plan);

    return {
        count: entry.count,
        limit: limits.maxRequests,
        remaining: Math.max(0, limits.maxRequests - entry.count),
        resetAt: entry.windowStart + limits.windowMs,
    };
}
