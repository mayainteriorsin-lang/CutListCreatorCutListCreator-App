import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

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
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
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
