import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { auditService, AuditLogParams } from '../services/auditService';
import { getRequestId } from './requestId';

/**
 * PHASE 8: Enhanced Audit Logging Middleware
 * Automatically logs actions to audit trail with request correlation
 */
export function auditLog(action: string, resourceType?: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        // Store original send function
        const originalSend = res.send;
        const requestId = getRequestId(req);

        // Override send to capture response
        res.send = function (data: any) {
            // Only log successful responses
            if (res.statusCode < 400 && req.user) {
                const auditParams: AuditLogParams = {
                    tenantId: req.user.tenantId,
                    userId: req.user.userId,
                    action,
                    resourceType,
                    resourceId: req.params.id || req.body?.id,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                    requestId, // PHASE 8: Include requestId for correlation
                };

                auditService.log(auditParams).catch(err => {
                    console.error(`[AuditMiddleware] requestId=${requestId} Failed to log:`, err);
                });
            }

            // Call original send
            return originalSend.call(this, data);
        };

        next();
    };
}

/**
 * PHASE 8: Audit with changes tracking
 * Logs the changes made to a resource with request correlation
 */
export function auditWithChanges(action: string, resourceType: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        const originalSend = res.send;
        const requestId = getRequestId(req);

        res.send = function (data: any) {
            if (res.statusCode < 400 && req.user) {
                const auditParams: AuditLogParams = {
                    tenantId: req.user.tenantId,
                    userId: req.user.userId,
                    action,
                    resourceType,
                    resourceId: req.params.id || req.body?.id,
                    changes: req.body,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                    requestId, // PHASE 8: Include requestId for correlation
                };

                auditService.log(auditParams).catch(err => {
                    console.error(`[AuditMiddleware] requestId=${requestId} Failed to log:`, err);
                });
            }

            return originalSend.call(this, data);
        };

        next();
    };
}
