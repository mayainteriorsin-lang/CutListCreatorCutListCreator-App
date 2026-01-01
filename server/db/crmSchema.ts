import { pgTable, real, text } from "drizzle-orm/pg-core";

/*
DEV-ONLY reset helper:
If db:push fails with PK errors during development,
run the SQL in server/db/resetCrmTables.sql and then rerun: npm run db:push
*/

export const leads = pgTable("leads", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().unique(),
  source: text("source").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const activities = pgTable("activities", {
  id: text("id").primaryKey(),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id),
  type: text("type").notNull(),
  message: text("message").notNull(),
  meta: text("meta"),
  createdAt: text("created_at").notNull(),
});

export const quotes = pgTable("quotes", {
  quoteId: text("quote_id").primaryKey(),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id),
  status: text("status").notNull(),
  amount: real("amount").notNull(),
  data: text("data"), // Stores full JSON snapshot of the design
  updatedAt: text("updated_at").notNull(),
});
