import { Router, Response } from "express";
import { randomUUID } from "crypto";
import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { activities, leads, quotes } from "../db/crmSchema";
import { ok, err } from "../lib/apiEnvelope"; // PATCH 17: Standardized error parsing
import { requireAuth, tenantContext, AuthRequest } from "../middleware/auth";
import { auditLog, auditWithChanges } from "../middleware/audit"; // PHASE 8: Audit logging

const crmRouter = Router();

// Protect all CRM routes with authentication AND tenant context
// PHASE 2: Tenant isolation enforcement
crmRouter.use(requireAuth);
crmRouter.use(tenantContext);

/**
 * Helper: Extract tenantId from authenticated request
 * Throws TenantContextError if tenant context is missing (caught by route handler)
 */
class TenantContextError extends Error {
  constructor() { super("NO_TENANT_CONTEXT"); }
}

function requireTenantId(req: AuthRequest): string {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    throw new TenantContextError();
  }
  return tenantId;
}

function handleTenantError(error: unknown, res: Response): boolean {
  if (error instanceof TenantContextError) {
    res.status(403).json(err("No tenant context available", { code: "NO_TENANT_CONTEXT" }));
    return true;
  }
  return false;
}

const nowISO = () => new Date().toISOString();

const leadSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  mobile: z.string().trim().min(1),
  source: z.string().trim().default("website"),
  status: z.string().trim().default("NEW"),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const statusSchema = z.object({
  status: z.string().trim().min(1),
});

const activitySchema = z.object({
  id: z.string().optional(),
  leadId: z.string().trim().min(1),
  type: z.string().trim().min(1),
  message: z.string().trim().min(1),
  meta: z.record(z.any()).optional(),
});

const quoteSchema = z.object({
  quoteId: z.string().optional(),
  leadId: z.string().trim().min(1),
  status: z.string().trim().min(1),
  amount: z.number().finite(),
  data: z.string().optional(),
});

function toLead(row: typeof leads.$inferSelect) {
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

function toActivity(row: typeof activities.$inferSelect) {
  return {
    id: row.id,
    leadId: row.leadId,
    type: row.type,
    message: row.message,
    at: row.createdAt,
    meta: row.meta ? safeParseJson(row.meta) : undefined,
  };
}

function toQuote(row: typeof quotes.$inferSelect) {
  return {
    quoteId: row.quoteId,
    leadId: row.leadId,
    status: row.status,
    amount: row.amount,
    data: row.data,
    updatedAt: row.updatedAt,
  };
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

// PHASE 8: Audit create/update lead operations
crmRouter.post("/leads", auditWithChanges('lead.upsert', 'lead'), async (req: AuthRequest, res) => {
  try {
    const tenantId = requireTenantId(req);

    const validation = leadSchema.safeParse(req.body ?? {});
    if (!validation.success) {
      return res.status(400).json(err("Invalid lead payload", validation.error));
    }

    const payload = validation.data;
    const mobile = payload.mobile.trim();
    const now = nowISO();

    // PHASE 2: Tenant-scoped lookup (same mobile can exist in different tenants)
    const [existing] = await db.select().from(leads).where(
      and(eq(leads.tenantId, tenantId), eq(leads.mobile, mobile))
    ).limit(1);

    if (existing) {
      const [updated] = await db
        .update(leads)
        .set({
          name: payload.name || existing.name,
          source: payload.source || existing.source,
          status: payload.status || existing.status,
          updatedAt: payload.updatedAt || now,
        })
        .where(and(eq(leads.id, existing.id), eq(leads.tenantId, tenantId)))
        .returning();

      if (!updated) throw new Error("Failed to update lead");
      return res.json(ok(toLead(updated)));
    }

    const id = payload.id || randomUUID();
    const createdAt = payload.createdAt || now;
    const updatedAt = payload.updatedAt || createdAt;
    // PHASE 2: Include tenantId in new leads
    const [inserted] = await db
      .insert(leads)
      .values({
        id,
        tenantId,
        name: payload.name,
        mobile,
        source: payload.source || "website",
        status: payload.status || "NEW",
        createdAt,
        updatedAt,
      })
      .returning();

    if (!inserted) throw new Error("Failed to insert lead");
    return res.status(201).json(ok(toLead(inserted)));
  } catch (error) {
    if (handleTenantError(error, res)) return;
    console.error("POST /api/crm/leads error:", error);
    return res.status(500).json(err("Failed to upsert lead"));
  }
});

crmRouter.get("/leads", async (req: AuthRequest, res) => {
  try {
    const tenantId = requireTenantId(req);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // PHASE 2: Tenant-scoped query
    const result = await db
      .select()
      .from(leads)
      .where(eq(leads.tenantId, tenantId))
      .orderBy(desc(leads.updatedAt))
      .limit(limit)
      .offset(offset);

    res.json(ok(result.map(toLead)));
  } catch (error) {
    if (handleTenantError(error, res)) return;
    console.error("GET /api/crm/leads error:", error);
    res.status(500).json(err("Failed to fetch leads"));
  }
});

// PHASE 8: Audit status changes
crmRouter.patch("/leads/:id/status", auditWithChanges('lead.status_update', 'lead'), async (req: AuthRequest, res) => {
  try {
    const tenantId = requireTenantId(req);

    const validation = statusSchema.safeParse(req.body ?? {});
    if (!validation.success) {
      return res.status(400).json(err("Invalid status payload", validation.error));
    }

    const id = req.params.id as string;
    // PHASE 2: Tenant-scoped lookup
    const [existing] = await db.select().from(leads).where(
      and(eq(leads.id, id), eq(leads.tenantId, tenantId))
    ).limit(1);
    if (!existing) {
      return res.status(404).json(err("Lead not found"));
    }

    // PHASE 2: Tenant-scoped update
    const [updated] = await db
      .update(leads)
      .set({ status: validation.data.status, updatedAt: nowISO() })
      .where(and(eq(leads.id, id), eq(leads.tenantId, tenantId)))
      .returning();

    if (!updated) throw new Error("Failed to update status");
    res.json(ok(toLead(updated)));
  } catch (error) {
    if (handleTenantError(error, res)) return;
    console.error("PATCH /api/crm/leads/:id/status error:", error);
    res.status(500).json(err("Failed to update lead status"));
  }
});

// PHASE 8: Audit activity creation
crmRouter.post("/activities", auditLog('activity.create', 'activity'), async (req: AuthRequest, res) => {
  try {
    const tenantId = requireTenantId(req);

    const validation = activitySchema.safeParse(req.body ?? {});
    if (!validation.success) {
      return res.status(400).json(err("Invalid activity payload", validation.error));
    }

    const payload = validation.data;

    // PHASE 2: Verify lead belongs to this tenant before adding activity
    const [leadExists] = await db.select().from(leads).where(
      and(eq(leads.id, payload.leadId), eq(leads.tenantId, tenantId))
    ).limit(1);
    if (!leadExists) {
      return res.status(404).json(err("Lead not found"));
    }

    // PHASE 2: Include tenantId in new activities
    const [inserted] = await db
      .insert(activities)
      .values({
        id: payload.id || randomUUID(),
        tenantId,
        leadId: payload.leadId,
        type: payload.type,
        message: payload.message,
        meta: payload.meta ? JSON.stringify(payload.meta) : null,
        createdAt: nowISO(),
      })
      .returning();

    if (!inserted) throw new Error("Failed to insert activity");
    res.status(201).json(ok(toActivity(inserted)));
  } catch (error) {
    if (handleTenantError(error, res)) return;
    console.error("POST /api/crm/activities error:", error);
    res.status(500).json(err("Failed to log activity"));
  }
});

crmRouter.get("/activities/:leadId", async (req: AuthRequest, res) => {
  try {
    const tenantId = requireTenantId(req);

    const leadId = req.params.leadId as string;

    // PHASE 2: Verify lead belongs to this tenant
    const [leadExists] = await db.select().from(leads).where(
      and(eq(leads.id, leadId), eq(leads.tenantId, tenantId))
    ).limit(1);
    if (!leadExists) {
      return res.status(404).json(err("Lead not found"));
    }

    // PHASE 2: Tenant-scoped activities query
    const rows = await db
      .select()
      .from(activities)
      .where(and(eq(activities.leadId, leadId), eq(activities.tenantId, tenantId)))
      .orderBy(desc(activities.createdAt));

    res.json(ok(rows.map(toActivity)));
  } catch (error) {
    if (handleTenantError(error, res)) return;
    console.error("GET /api/crm/activities/:leadId error:", error);
    res.status(500).json(err("Failed to fetch activities"));
  }
});

// PHASE 8: Audit quote creation/update
crmRouter.post("/quotes", auditWithChanges('quote.upsert', 'quote'), async (req: AuthRequest, res) => {
  try {
    const tenantId = requireTenantId(req);

    const validation = quoteSchema.safeParse(req.body ?? {});
    if (!validation.success) {
      return res.status(400).json(err("Invalid quote payload", validation.error));
    }

    const payload = validation.data;
    const now = nowISO();
    const quoteId = payload.quoteId || randomUUID();

    // PHASE 2: Verify lead belongs to this tenant
    const [leadExists] = await db.select().from(leads).where(
      and(eq(leads.id, payload.leadId), eq(leads.tenantId, tenantId))
    ).limit(1);
    if (!leadExists) {
      return res.status(404).json(err("Lead not found"));
    }

    // PHASE 2: Tenant-scoped lookup for existing quote
    const [existing] = await db.select().from(quotes).where(
      and(eq(quotes.quoteId, quoteId), eq(quotes.tenantId, tenantId))
    ).limit(1);

    if (existing) {
      // PHASE 2: Tenant-scoped update
      const [updated] = await db
        .update(quotes)
        .set({
          status: payload.status,
          amount: payload.amount,
          data: payload.data ?? existing.data,
          updatedAt: now,
          leadId: payload.leadId || existing.leadId,
        })
        .where(and(eq(quotes.quoteId, quoteId), eq(quotes.tenantId, tenantId)))
        .returning();

      if (!updated) throw new Error("Failed to update quote");
      return res.json(ok(toQuote(updated)));
    }

    // PHASE 2: Include tenantId in new quotes
    const [inserted] = await db
      .insert(quotes)
      .values({
        quoteId,
        tenantId,
        leadId: payload.leadId,
        status: payload.status,
        amount: payload.amount,
        data: payload.data,
        updatedAt: now,
      })
      .returning();

    if (!inserted) throw new Error("Failed to insert quote");
    res.status(201).json(ok(toQuote(inserted)));
  } catch (error) {
    if (handleTenantError(error, res)) return;
    console.error("POST /api/crm/quotes error:", error);
    res.status(500).json(err("Failed to upsert quote"));
  }
});

crmRouter.get("/quotes/by-lead/:leadId", async (req: AuthRequest, res) => {
  try {
    const tenantId = requireTenantId(req);

    const leadId = req.params.leadId as string;

    // PHASE 2: Verify lead belongs to this tenant
    const [leadExists] = await db.select().from(leads).where(
      and(eq(leads.id, leadId), eq(leads.tenantId, tenantId))
    ).limit(1);
    if (!leadExists) {
      return res.status(404).json(err("Lead not found"));
    }

    // PHASE 2: Tenant-scoped quotes query
    const [latest] = await db
      .select()
      .from(quotes)
      .where(and(eq(quotes.leadId, leadId), eq(quotes.tenantId, tenantId)))
      .orderBy(desc(quotes.updatedAt))
      .limit(1);

    if (!latest) {
      return res.status(404).json(err("Quote not found"));
    }

    res.json(ok(toQuote(latest)));
  } catch (error) {
    if (handleTenantError(error, res)) return;
    console.error("GET /api/crm/quotes/by-lead/:leadId error:", error);
    res.status(500).json(err("Failed to fetch quote"));
  }
});

export { crmRouter };
