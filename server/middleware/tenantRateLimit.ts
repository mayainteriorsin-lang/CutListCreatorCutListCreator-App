/**
 * PHASE 14: Per-Tenant Rate Limiting Middleware (GAP-SCL-001)
 *
 * Implements tenant-aware rate limiting to prevent noisy neighbor issues.
 * Layered on top of global IP-based rate limiting.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

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
 * In-memory tenant rate limit tracking
 * Production consideration: Use Redis for distributed rate limiting
 */
interface TenantRateLimitEntry {
    count: number;
    windowStart: number;
    plan: string;
}

const tenantRateLimits = new Map<string, TenantRateLimitEntry>();

/**
 * Clean up expired entries periodically
 */
function cleanupExpiredEntries(): void {
    const now = Date.now();
    const maxWindowMs = Math.max(...Object.values(PLAN_RATE_LIMITS).map(p => p.windowMs));

    for (const [tenantId, entry] of tenantRateLimits.entries()) {
        if (now - entry.windowStart > maxWindowMs * 2) {
            tenantRateLimits.delete(tenantId);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Get tenant plan (with caching consideration)
 * For Phase 14, we use a simple in-memory approach
 */
function getTenantPlan(tenantId: string): string {
    // In production, this would look up the plan from cache/database
    // For Phase 14 pilot, default to 'enterprise' for known pilot tenants
    const entry = tenantRateLimits.get(tenantId);
    return entry?.plan || 'enterprise'; // Default to enterprise for pilot
}

/**
 * Set tenant plan (called during auth or tenant lookup)
 */
export function setTenantPlan(tenantId: string, plan: string): void {
    const existing = tenantRateLimits.get(tenantId);
    if (existing) {
        existing.plan = plan;
    }
}

/**
 * Per-Tenant Rate Limiting Middleware
 *
 * Apply after authentication middleware to have access to tenantId
 */
export function tenantRateLimit(req: AuthRequest, res: Response, next: NextFunction): void {
    const tenantId = req.tenantId || req.user?.tenantId;

    // Skip rate limiting if no tenant context (global limit still applies)
    if (!tenantId) {
        return next();
    }

    const now = Date.now();
    const plan = getTenantPlan(tenantId);
    const limits = getPlanLimits(plan);

    let entry = tenantRateLimits.get(tenantId);

    // Initialize or reset window
    if (!entry || (now - entry.windowStart) > limits.windowMs) {
        entry = {
            count: 0,
            windowStart: now,
            plan: plan,
        };
        tenantRateLimits.set(tenantId, entry);
    }

    // Increment counter
    entry.count++;

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
}

/**
 * Reset rate limit for a tenant (for admin use)
 */
export function resetTenantRateLimit(tenantId: string): void {
    tenantRateLimits.delete(tenantId);
}

/**
 * Get current rate limit status for a tenant
 */
export function getTenantRateLimitStatus(tenantId: string): {
    count: number;
    limit: number;
    remaining: number;
    resetAt: number;
} | null {
    const entry = tenantRateLimits.get(tenantId);
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
