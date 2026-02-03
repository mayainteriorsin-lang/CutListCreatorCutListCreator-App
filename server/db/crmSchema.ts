import { pgTable, real, text, index, unique } from "drizzle-orm/pg-core";

/*
DEV-ONLY reset helper:
If db:push fails with PK errors during development,
run the SQL in server/db/resetCrmTables.sql and then rerun: npm run db:push
*/

/**
 * PHASE 2: Tenant Isolation Enforcement
 * All CRM tables now include tenant_id for multi-tenant isolation.
 * - tenant_id is required and defaults to 'default' for backward compatibility
 * - Composite unique constraint on (tenant_id, mobile) for leads
 * - Indexes on tenant_id for query performance
 */

export const leads = pgTable("leads", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default('default'),
  name: text("name").notNull(),
  mobile: text("mobile").notNull(),
  source: text("source").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("leads_tenant_id_idx").on(table.tenantId),
  unique("leads_tenant_mobile_unique").on(table.tenantId, table.mobile),
]);

export const activities = pgTable("activities", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default('default'),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id),
  type: text("type").notNull(),
  message: text("message").notNull(),
  meta: text("meta"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("activities_tenant_id_idx").on(table.tenantId),
]);

export const quotes = pgTable("quotes", {
  quoteId: text("quote_id").primaryKey(),
  tenantId: text("tenant_id").notNull().default('default'),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id),
  status: text("status").notNull(),
  amount: real("amount").notNull(),
  data: text("data"), // Stores full JSON snapshot of the design
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("quotes_tenant_id_idx").on(table.tenantId),
]);
