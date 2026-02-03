import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { db } from '../db';
import { tenants } from '../db/authSchema';
import { eq } from 'drizzle-orm';

/**
 * Extended Request with user context
 */
export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
        tenantId: string;
    };
    tenantId?: string;
}

/**
 * PHASE 14: Tenant status cache for performance
 * TTL: 5 minutes to balance freshness with performance
 */
const tenantStatusCache = new Map<string, { status: string; cachedAt: number }>();
const TENANT_STATUS_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * PHASE 14: Get tenant status with caching (GAP-TEN-001 fix)
 */
async function getTenantStatus(tenantId: string): Promise<string | null> {
    const now = Date.now();
    const cached = tenantStatusCache.get(tenantId);

    if (cached && (now - cached.cachedAt) < TENANT_STATUS_TTL_MS) {
        return cached.status;
    }

    try {
        const tenant = await db.query.tenants.findFirst({
            where: eq(tenants.id, tenantId),
            columns: { status: true }
        });

        if (tenant) {
            tenantStatusCache.set(tenantId, { status: tenant.status || 'active', cachedAt: now });
            return tenant.status || 'active';
        }
        return null;
    } catch (error) {
        console.error('[AUTH] Error fetching tenant status:', error);
        // On error, allow request to proceed (fail-open for availability)
        return 'active';
    }
}

/**
 * PHASE 14: Clear tenant status cache (for suspension/activation)
 */
export function invalidateTenantStatusCache(tenantId: string): void {
    tenantStatusCache.delete(tenantId);
}

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 * PHASE 14: Added tenant status check (GAP-TEN-001 fix)
 */
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'No token provided',
            code: 'NO_TOKEN'
        });
    }

    const token = authHeader.substring(7);

    try {
        const payload = authService.verifyToken(token);

        // PHASE 14: Check tenant status on every request (GAP-TEN-001)
        if (payload.tenantId) {
            const tenantStatus = await getTenantStatus(payload.tenantId);

            if (tenantStatus === null) {
                return res.status(403).json({
                    success: false,
                    error: 'Tenant not found',
                    code: 'TENANT_NOT_FOUND'
                });
            }

            if (tenantStatus === 'suspended') {
                console.log(`[AUTH] Blocked request for suspended tenant: ${payload.tenantId}`);
                return res.status(403).json({
                    success: false,
                    error: 'Account has been suspended. Please contact support.',
                    code: 'TENANT_SUSPENDED'
                });
            }

            if (tenantStatus === 'offboarded') {
                console.log(`[AUTH] Blocked request for offboarded tenant: ${payload.tenantId}`);
                return res.status(403).json({
                    success: false,
                    error: 'Account has been terminated.',
                    code: 'TENANT_OFFBOARDED'
                });
            }
        }

        req.user = payload;
        req.tenantId = payload.tenantId;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
        });
    }
}

/**
 * Authorization Middleware
 * Checks if user has required role
 */
export function authorize(...allowedRoles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated',
                code: 'NOT_AUTHENTICATED'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'FORBIDDEN',
                required: allowedRoles,
                current: req.user.role
            });
        }

        next();
    };
}

/**
 * Optional Authentication Middleware
 * Attaches user if token is present, but doesn't require it
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    const token = authHeader.substring(7);

    try {
        const payload = authService.verifyToken(token);
        req.user = payload;
        req.tenantId = payload.tenantId;
    } catch (error) {
        // Ignore invalid tokens for optional auth
    }

    next();
}

/**
 * Tenant Context Middleware
 * Ensures tenant context is available
 */
export function tenantContext(req: AuthRequest, res: Response, next: NextFunction) {
    if (!req.user?.tenantId) {
        return res.status(403).json({
            success: false,
            error: 'No tenant context available',
            code: 'NO_TENANT_CONTEXT'
        });
    }

    req.tenantId = req.user.tenantId;
    next();
}

/**
 * Permission Check Middleware
 * Checks if user has specific permission
 */
export function requirePermission(permission: string) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated',
                code: 'NOT_AUTHENTICATED'
            });
        }

        // Admin has all permissions
        if (req.user.role === 'admin') {
            return next();
        }

        // Role-based permission mapping
        const rolePermissions: Record<string, string[]> = {
            manager: ['quotations.*', 'users.read', 'reports.*'],
            user: ['quotations.create', 'quotations.read', 'quotations.update'],
            viewer: ['quotations.read', 'reports.read'],
        };

        const userPermissions = rolePermissions[req.user.role] || [];
        const hasPermission = userPermissions.some(p => {
            if (p === '*' || p === permission) return true;
            if (p.endsWith('.*')) {
                const prefix = p.slice(0, -2);
                return permission.startsWith(prefix);
            }
            return false;
        });

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                error: 'Permission denied',
                code: 'PERMISSION_DENIED',
                required: permission
            });
        }

        next();
    };
}

// Legacy compatibility exports
export const requireAuth = authenticate;
export const generateToken = (user: any) => {
    // Deprecated - use authService.generateTokens instead
    console.warn('generateToken is deprecated, use authService.generateTokens');
    return '';
};
export const verifyToken = (token: string) => {
    try {
        return authService.verifyToken(token);
    } catch {
        return null;
    }
};
