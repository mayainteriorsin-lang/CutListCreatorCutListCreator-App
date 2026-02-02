import { db } from '../db';
import { auditLogs, type NewAuditLog } from '../db/authSchema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export interface AuditLogParams {
    tenantId: string;
    userId?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
}

export interface AuditLogQuery {
    tenantId: string;
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

/**
 * Audit Service
 * Tracks all important actions for compliance and security
 */
export class AuditService {
    /**
     * Log an action
     */
    async log(params: AuditLogParams): Promise<void> {
        try {
            await db.insert(auditLogs).values({
                tenantId: params.tenantId,
                userId: params.userId,
                action: params.action,
                resourceType: params.resourceType,
                resourceId: params.resourceId,
                changes: params.changes,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
            });
        } catch (error) {
            // Don't throw - audit logging should not break the main flow
            console.error('[AuditService] Failed to log action:', error);
        }
    }

    /**
     * Query audit logs
     */
    async query(params: AuditLogQuery) {
        const { tenantId, userId, action, resourceType, startDate, endDate, limit = 100, offset = 0 } = params;

        const conditions = [eq(auditLogs.tenantId, tenantId)];

        if (userId) {
            conditions.push(eq(auditLogs.userId, userId));
        }

        if (action) {
            conditions.push(eq(auditLogs.action, action));
        }

        if (resourceType) {
            conditions.push(eq(auditLogs.resourceType, resourceType));
        }

        if (startDate) {
            conditions.push(gte(auditLogs.createdAt, startDate));
        }

        if (endDate) {
            conditions.push(lte(auditLogs.createdAt, endDate));
        }

        const logs = await db.query.auditLogs.findMany({
            where: and(...conditions),
            orderBy: [desc(auditLogs.createdAt)],
            limit,
            offset,
        });

        return logs;
    }

    /**
     * Get audit log statistics
     */
    async getStats(tenantId: string, days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const logs = await this.query({
            tenantId,
            startDate,
            limit: 10000,
        });

        // Group by action
        const actionCounts: Record<string, number> = {};
        const userCounts: Record<string, number> = {};

        logs.forEach(log => {
            actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
            if (log.userId) {
                userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
            }
        });

        return {
            totalLogs: logs.length,
            actionCounts,
            userCounts,
            period: { days, startDate },
        };
    }

    /**
     * Clean up old audit logs (for GDPR compliance)
     */
    async cleanup(retentionDays: number = 365) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const result = await db.delete(auditLogs)
            .where(lte(auditLogs.createdAt, cutoffDate));

        return result.rowCount || 0;
    }
}

export const auditService = new AuditService();
