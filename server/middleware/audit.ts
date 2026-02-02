import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { auditService } from '../services/auditService';

/**
 * Audit Logging Middleware
 * Automatically logs actions to audit trail
 */
export function auditLog(action: string, resourceType?: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        // Store original send function
        const originalSend = res.send;

        // Override send to capture response
        res.send = function (data: any) {
            // Only log successful responses
            if (res.statusCode < 400 && req.user) {
                auditService.log({
                    tenantId: req.user.tenantId,
                    userId: req.user.userId,
                    action,
                    resourceType,
                    resourceId: req.params.id || req.body?.id,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                }).catch(err => {
                    console.error('[AuditMiddleware] Failed to log:', err);
                });
            }

            // Call original send
            return originalSend.call(this, data);
        };

        next();
    };
}

/**
 * Audit with changes tracking
 * Logs the changes made to a resource
 */
export function auditWithChanges(action: string, resourceType: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        const originalSend = res.send;

        res.send = function (data: any) {
            if (res.statusCode < 400 && req.user) {
                auditService.log({
                    tenantId: req.user.tenantId,
                    userId: req.user.userId,
                    action,
                    resourceType,
                    resourceId: req.params.id || req.body?.id,
                    changes: req.body,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                }).catch(err => {
                    console.error('[AuditMiddleware] Failed to log:', err);
                });
            }

            return originalSend.call(this, data);
        };

        next();
    };
}
