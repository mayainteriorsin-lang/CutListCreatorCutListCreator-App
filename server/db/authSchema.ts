import { pgTable, text, uuid, timestamp, boolean, jsonb, varchar, index } from 'drizzle-orm/pg-core';

/**
 * Tenants Table
 * Multi-tenancy foundation - each customer organization
 */
export const tenants = pgTable('tenants', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    plan: varchar('plan', { length: 50 }).default('free'),
    status: varchar('status', { length: 50 }).default('active'),
    settings: jsonb('settings').default({}),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
    slugIdx: index('idx_tenants_slug').on(table.slug),
}));

/**
 * Users Table
 * Authentication and user management
 */
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 255 }),
    role: varchar('role', { length: 50 }).notNull().default('user'),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    emailVerified: boolean('email_verified').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    lastLoginAt: timestamp('last_login_at'),
}, (table) => ({
    emailIdx: index('idx_users_email').on(table.email),
    tenantIdx: index('idx_users_tenant').on(table.tenantId),
}));

/**
 * Roles Table
 * Role-based access control
 */
export const roles = pgTable('roles', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: text('description'),
    permissions: jsonb('permissions').default([]),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Audit Logs Table
 * Track all important actions for compliance
 */
export const auditLogs = pgTable('audit_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 100 }),
    resourceId: varchar('resource_id', { length: 255 }),
    changes: jsonb('changes'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
    tenantIdx: index('idx_audit_logs_tenant').on(table.tenantId),
    createdIdx: index('idx_audit_logs_created').on(table.createdAt),
    userIdx: index('idx_audit_logs_user').on(table.userId),
}));

/**
 * Refresh Tokens Table
 * Store refresh tokens for JWT authentication
 */
export const refreshTokens = pgTable('refresh_tokens', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    token: varchar('token', { length: 500 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    revokedAt: timestamp('revoked_at'),
}, (table) => ({
    userIdx: index('idx_refresh_tokens_user').on(table.userId),
    tokenIdx: index('idx_refresh_tokens_token').on(table.token),
}));

// Type exports for TypeScript
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
