import { Router } from "express";
import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { activities, leads, quotes } from "../db/crmSchema";

const crmRouter = Router();

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

crmRouter.post("/leads", async (req, res) => {
  try {
    const validation = leadSchema.safeParse(req.body ?? {});
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid lead payload", details: validation.error });
    }

    const payload = validation.data;
    const mobile = payload.mobile.trim();
    const now = nowISO();

    const [existing] = await db.select().from(leads).where(eq(leads.mobile, mobile)).limit(1);

    if (existing) {
      const [updated] = await db
        .update(leads)
        .set({
          name: payload.name || existing.name,
          source: payload.source || existing.source,
          status: payload.status || existing.status,
          updatedAt: payload.updatedAt || now,
        })
        .where(eq(leads.id, existing.id))
        .returning();

      return res.json(toLead(updated));
    }

    const id = payload.id || randomUUID();
    const createdAt = payload.createdAt || now;
    const updatedAt = payload.updatedAt || createdAt;
    const [inserted] = await db
      .insert(leads)
      .values({
        id,
        name: payload.name,
        mobile,
        source: payload.source || "website",
        status: payload.status || "NEW",
        createdAt,
        updatedAt,
      })
      .returning();

    return res.status(201).json(toLead(inserted));
  } catch (error) {
    console.error("POST /api/crm/leads error:", error);
    return res.status(500).json({ error: "Failed to upsert lead" });
  }
});

crmRouter.get("/leads", async (_req, res) => {
  try {
    const result = await db.select().from(leads).orderBy(desc(leads.updatedAt));
    res.json(result.map(toLead));
  } catch (error) {
    console.error("GET /api/crm/leads error:", error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

crmRouter.patch("/leads/:id/status", async (req, res) => {
  try {
    const validation = statusSchema.safeParse(req.body ?? {});
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid status payload", details: validation.error });
    }

    const { id } = req.params;
    const [existing] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    if (!existing) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const [updated] = await db
      .update(leads)
      .set({ status: validation.data.status, updatedAt: nowISO() })
      .where(eq(leads.id, id))
      .returning();

    res.json(toLead(updated));
  } catch (error) {
    console.error("PATCH /api/crm/leads/:id/status error:", error);
    res.status(500).json({ error: "Failed to update lead status" });
  }
});

crmRouter.post("/activities", async (req, res) => {
  try {
    const validation = activitySchema.safeParse(req.body ?? {});
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid activity payload", details: validation.error });
    }

    const payload = validation.data;
    const [inserted] = await db
      .insert(activities)
      .values({
        id: payload.id || randomUUID(),
        leadId: payload.leadId,
        type: payload.type,
        message: payload.message,
        meta: payload.meta ? JSON.stringify(payload.meta) : null,
        createdAt: nowISO(),
      })
      .returning();

    res.status(201).json(toActivity(inserted));
  } catch (error) {
    console.error("POST /api/crm/activities error:", error);
    res.status(500).json({ error: "Failed to log activity" });
  }
});

crmRouter.get("/activities/:leadId", async (req, res) => {
  try {
    const { leadId } = req.params;
    const rows = await db
      .select()
      .from(activities)
      .where(eq(activities.leadId, leadId))
      .orderBy(desc(activities.createdAt));

    res.json(rows.map(toActivity));
  } catch (error) {
    console.error("GET /api/crm/activities/:leadId error:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

crmRouter.post("/quotes", async (req, res) => {
  try {
    const validation = quoteSchema.safeParse(req.body ?? {});
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid quote payload", details: validation.error });
    }

    const payload = validation.data;
    const now = nowISO();
    const quoteId = payload.quoteId || randomUUID();

    const [existing] = await db.select().from(quotes).where(eq(quotes.quoteId, quoteId)).limit(1);

    if (existing) {
      const [updated] = await db
        .update(quotes)
        .set({
          status: payload.status,
          amount: payload.amount,
          data: payload.data ?? existing.data,
          updatedAt: now,
          leadId: payload.leadId || existing.leadId,
        })
        .where(eq(quotes.quoteId, quoteId))
        .returning();

      return res.json(toQuote(updated));
    }

    const [inserted] = await db
      .insert(quotes)
      .values({
        quoteId,
        leadId: payload.leadId,
        status: payload.status,
        amount: payload.amount,
        data: payload.data,
        updatedAt: now,
      })
      .returning();

    res.status(201).json(toQuote(inserted));
  } catch (error) {
    console.error("POST /api/crm/quotes error:", error);
    res.status(500).json({ error: "Failed to upsert quote" });
  }
});

crmRouter.get("/quotes/by-lead/:leadId", async (req, res) => {
  try {
    const { leadId } = req.params;
    const [latest] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.leadId, leadId))
      .orderBy(desc(quotes.updatedAt))
      .limit(1);

    if (!latest) {
      return res.status(404).json({ error: "Quote not found" });
    }

    res.json(toQuote(latest));
  } catch (error) {
    console.error("GET /api/crm/quotes/by-lead/:leadId error:", error);
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

export { crmRouter };

