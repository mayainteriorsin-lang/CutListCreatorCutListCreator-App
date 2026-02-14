/**
 * CRM Service
 *
 * Business logic for leads, activities, and quotes.
 * All operations are tenant-scoped — tenantId is required on every method.
 *
 * Extracted from server/routes/crmRoutes.ts to separate
 * data access + business rules from HTTP handling.
 */

import { randomUUID } from "crypto";
import { desc, eq, and } from "drizzle-orm";
import { db } from "../db";
import { activities, leads, quotes } from "../db/crmSchema";

// ── Helpers ──────────────────────────────────────────────────────────

const nowISO = () => new Date().toISOString();

function safeParseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

// ── Data Mappers ─────────────────────────────────────────────────────

export type LeadRow = typeof leads.$inferSelect;
export type ActivityRow = typeof activities.$inferSelect;
export type QuoteRow = typeof quotes.$inferSelect;

export interface LeadDTO {
  id: string;
  name: string;
  mobile: string;
  source: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityDTO {
  id: string;
  leadId: string;
  type: string;
  message: string;
  at: string;
  meta?: unknown;
}

export interface QuoteDTO {
  quoteId: string;
  leadId: string;
  status: string;
  amount: number;
  data: string | null;
  updatedAt: string;
}

export function toLead(row: LeadRow): LeadDTO {
  return {
    id: row.id,
    name: row.name,
    mobile: row.mobile,
    source: row.source,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toActivity(row: ActivityRow): ActivityDTO {
  return {
    id: row.id,
    leadId: row.leadId,
    type: row.type,
    message: row.message,
    at: row.createdAt,
    meta: row.meta ? safeParseJson(row.meta) : undefined,
  };
}

export function toQuote(row: QuoteRow): QuoteDTO {
  return {
    quoteId: row.quoteId,
    leadId: row.leadId,
    status: row.status,
    amount: row.amount,
    data: row.data,
    updatedAt: row.updatedAt,
  };
}

// ── Shared: Tenant-scoped lead existence check ──────────────────────

async function requireLead(tenantId: string, leadId: string): Promise<LeadRow | null> {
  const [row] = await db.select().from(leads).where(
    and(eq(leads.id, leadId), eq(leads.tenantId, tenantId))
  ).limit(1);
  return row ?? null;
}

// ── Lead Operations ──────────────────────────────────────────────────

export interface UpsertLeadParams {
  id?: string;
  name: string;
  mobile: string;
  source?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertLeadResult {
  lead: LeadDTO;
  created: boolean;
}

/**
 * Upsert a lead by mobile number within a tenant.
 * If a lead with the same mobile exists, merge fields and update.
 * Otherwise, insert a new lead.
 */
export async function upsertLead(tenantId: string, params: UpsertLeadParams): Promise<UpsertLeadResult> {
  const mobile = params.mobile.trim();
  const now = nowISO();

  // Tenant-scoped duplicate lookup by mobile
  const [existing] = await db.select().from(leads).where(
    and(eq(leads.tenantId, tenantId), eq(leads.mobile, mobile))
  ).limit(1);

  if (existing) {
    const [updated] = await db
      .update(leads)
      .set({
        name: params.name || existing.name,
        source: params.source || existing.source,
        status: params.status || existing.status,
        updatedAt: params.updatedAt || now,
      })
      .where(and(eq(leads.id, existing.id), eq(leads.tenantId, tenantId)))
      .returning();

    if (!updated) throw new Error("Failed to update lead");
    return { lead: toLead(updated), created: false };
  }

  const id = params.id || randomUUID();
  const createdAt = params.createdAt || now;
  const updatedAt = params.updatedAt || createdAt;

  const [inserted] = await db
    .insert(leads)
    .values({
      id,
      tenantId,
      name: params.name,
      mobile,
      source: params.source || "website",
      status: params.status || "NEW",
      createdAt,
      updatedAt,
    })
    .returning();

  if (!inserted) throw new Error("Failed to insert lead");
  return { lead: toLead(inserted), created: true };
}

/**
 * Get paginated leads for a tenant, ordered by updatedAt desc.
 */
export async function getLeads(
  tenantId: string,
  page: number = 1,
  limit: number = 50,
): Promise<LeadDTO[]> {
  const offset = (page - 1) * limit;

  const result = await db
    .select()
    .from(leads)
    .where(eq(leads.tenantId, tenantId))
    .orderBy(desc(leads.updatedAt))
    .limit(limit)
    .offset(offset);

  return result.map(toLead);
}

/**
 * Update a lead's status. Returns null if lead not found.
 */
export async function updateLeadStatus(
  tenantId: string,
  leadId: string,
  status: string,
): Promise<LeadDTO | null> {
  const existing = await requireLead(tenantId, leadId);
  if (!existing) return null;

  const [updated] = await db
    .update(leads)
    .set({ status, updatedAt: nowISO() })
    .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
    .returning();

  if (!updated) throw new Error("Failed to update status");
  return toLead(updated);
}

// ── Activity Operations ──────────────────────────────────────────────

export interface CreateActivityParams {
  id?: string;
  leadId: string;
  type: string;
  message: string;
  meta?: Record<string, unknown>;
}

/**
 * Create an activity for a lead. Returns null if lead not found.
 */
export async function createActivity(
  tenantId: string,
  params: CreateActivityParams,
): Promise<ActivityDTO | null> {
  const lead = await requireLead(tenantId, params.leadId);
  if (!lead) return null;

  const [inserted] = await db
    .insert(activities)
    .values({
      id: params.id || randomUUID(),
      tenantId,
      leadId: params.leadId,
      type: params.type,
      message: params.message,
      meta: params.meta ? JSON.stringify(params.meta) : null,
      createdAt: nowISO(),
    })
    .returning();

  if (!inserted) throw new Error("Failed to insert activity");
  return toActivity(inserted);
}

/**
 * Get activities for a lead. Returns null if lead not found.
 */
export async function getActivities(
  tenantId: string,
  leadId: string,
): Promise<ActivityDTO[] | null> {
  const lead = await requireLead(tenantId, leadId);
  if (!lead) return null;

  const rows = await db
    .select()
    .from(activities)
    .where(and(eq(activities.leadId, leadId), eq(activities.tenantId, tenantId)))
    .orderBy(desc(activities.createdAt));

  return rows.map(toActivity);
}

// ── Quote Operations ─────────────────────────────────────────────────

export interface UpsertQuoteParams {
  quoteId?: string;
  leadId: string;
  status: string;
  amount: number;
  data?: string;
}

export interface UpsertQuoteResult {
  quote: QuoteDTO;
  created: boolean;
}

/**
 * Upsert a quote. Returns null if lead not found.
 */
export async function upsertQuote(
  tenantId: string,
  params: UpsertQuoteParams,
): Promise<UpsertQuoteResult | null> {
  const lead = await requireLead(tenantId, params.leadId);
  if (!lead) return null;

  const now = nowISO();
  const quoteId = params.quoteId || randomUUID();

  // Tenant-scoped lookup for existing quote
  const [existing] = await db.select().from(quotes).where(
    and(eq(quotes.quoteId, quoteId), eq(quotes.tenantId, tenantId))
  ).limit(1);

  if (existing) {
    const [updated] = await db
      .update(quotes)
      .set({
        status: params.status,
        amount: params.amount,
        data: params.data ?? existing.data,
        updatedAt: now,
        leadId: params.leadId || existing.leadId,
      })
      .where(and(eq(quotes.quoteId, quoteId), eq(quotes.tenantId, tenantId)))
      .returning();

    if (!updated) throw new Error("Failed to update quote");
    return { quote: toQuote(updated), created: false };
  }

  const [inserted] = await db
    .insert(quotes)
    .values({
      quoteId,
      tenantId,
      leadId: params.leadId,
      status: params.status,
      amount: params.amount,
      data: params.data,
      updatedAt: now,
    })
    .returning();

  if (!inserted) throw new Error("Failed to insert quote");
  return { quote: toQuote(inserted), created: true };
}

/**
 * Get latest quote for a lead. Returns null if lead or quote not found.
 */
export async function getQuoteByLead(
  tenantId: string,
  leadId: string,
): Promise<{ quote: QuoteDTO | null; leadFound: boolean }> {
  const lead = await requireLead(tenantId, leadId);
  if (!lead) return { quote: null, leadFound: false };

  const [latest] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.leadId, leadId), eq(quotes.tenantId, tenantId)))
    .orderBy(desc(quotes.updatedAt))
    .limit(1);

  return {
    quote: latest ? toQuote(latest) : null,
    leadFound: true,
  };
}
