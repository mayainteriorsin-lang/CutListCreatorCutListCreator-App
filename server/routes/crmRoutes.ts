import { Router, Response } from "express";
import { z } from "zod";
import { ok, err } from "../lib/apiEnvelope";
import { requireAuth, tenantContext, AuthRequest } from "../middleware/auth";
import { auditLog, auditWithChanges } from "../middleware/audit";
import {
  upsertLead,
  getLeads,
  updateLeadStatus,
  createActivity,
  getActivities,
  upsertQuote,
  getQuoteByLead,
} from "../services/crmService";

const crmRouter = Router();

// Protect all CRM routes with authentication AND tenant context
// PHASE 2: Tenant isolation enforcement
crmRouter.use(requireAuth);
crmRouter.use(tenantContext);

// ── HTTP Helpers ─────────────────────────────────────────────────────

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

// ── Validation Schemas ───────────────────────────────────────────────

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

// ── Lead Routes ──────────────────────────────────────────────────────

// PHASE 8: Audit create/update lead operations
crmRouter.post("/leads", auditWithChanges('lead.upsert', 'lead'), async (req: AuthRequest, res) => {
  try {
    const tenantId = requireTenantId(req);

    const validation = leadSchema.safeParse(req.body ?? {});
    if (!validation.success) {
      return res.status(400).json(err("Invalid lead payload", validation.error));
    }

    const result = await upsertLead(tenantId, validation.data);
    const status = result.created ? 201 : 200;
    return res.status(status).json(ok(result.lead));
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

    const result = await getLeads(tenantId, page, limit);
    res.json(ok(result));
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

    const lead = await updateLeadStatus(tenantId, req.params.id as string, validation.data.status);
    if (!lead) {
      return res.status(404).json(err("Lead not found"));
    }

    res.json(ok(lead));
  } catch (error) {
    if (handleTenantError(error, res)) return;
    console.error("PATCH /api/crm/leads/:id/status error:", error);
    res.status(500).json(err("Failed to update lead status"));
  }
});

// ── Activity Routes ──────────────────────────────────────────────────

// PHASE 8: Audit activity creation
crmRouter.post("/activities", auditLog('activity.create', 'activity'), async (req: AuthRequest, res) => {
  try {
    const tenantId = requireTenantId(req);

    const validation = activitySchema.safeParse(req.body ?? {});
    if (!validation.success) {
      return res.status(400).json(err("Invalid activity payload", validation.error));
    }

    const activity = await createActivity(tenantId, validation.data);
    if (!activity) {
      return res.status(404).json(err("Lead not found"));
    }

    res.status(201).json(ok(activity));
  } catch (error) {
    if (handleTenantError(error, res)) return;
    console.error("POST /api/crm/activities error:", error);
    res.status(500).json(err("Failed to log activity"));
  }
});

crmRouter.get("/activities/:leadId", async (req: AuthRequest, res) => {
  try {
    const tenantId = requireTenantId(req);

    const result = await getActivities(tenantId, req.params.leadId as string);
    if (!result) {
      return res.status(404).json(err("Lead not found"));
    }

    res.json(ok(result));
  } catch (error) {
    if (handleTenantError(error, res)) return;
    console.error("GET /api/crm/activities/:leadId error:", error);
    res.status(500).json(err("Failed to fetch activities"));
  }
});

// ── Quote Routes ─────────────────────────────────────────────────────

// PHASE 8: Audit quote creation/update
crmRouter.post("/quotes", auditWithChanges('quote.upsert', 'quote'), async (req: AuthRequest, res) => {
  try {
    const tenantId = requireTenantId(req);

    const validation = quoteSchema.safeParse(req.body ?? {});
    if (!validation.success) {
      return res.status(400).json(err("Invalid quote payload", validation.error));
    }

    const result = await upsertQuote(tenantId, validation.data);
    if (!result) {
      return res.status(404).json(err("Lead not found"));
    }

    const status = result.created ? 201 : 200;
    res.status(status).json(ok(result.quote));
  } catch (error) {
    if (handleTenantError(error, res)) return;
    console.error("POST /api/crm/quotes error:", error);
    res.status(500).json(err("Failed to upsert quote"));
  }
});

crmRouter.get("/quotes/by-lead/:leadId", async (req: AuthRequest, res) => {
  try {
    const tenantId = requireTenantId(req);

    const { quote, leadFound } = await getQuoteByLead(tenantId, req.params.leadId as string);
    if (!leadFound) {
      return res.status(404).json(err("Lead not found"));
    }
    if (!quote) {
      return res.status(404).json(err("Quote not found"));
    }

    res.json(ok(quote));
  } catch (error) {
    if (handleTenantError(error, res)) return;
    console.error("GET /api/crm/quotes/by-lead/:leadId error:", error);
    res.status(500).json(err("Failed to fetch quote"));
  }
});

export { crmRouter };
