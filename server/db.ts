import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as sharedSchema from "@shared/schema";
import * as crmSchema from "./db/crmSchema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure PostgreSQL pool for Supabase
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('"') || process.env.DATABASE_URL.startsWith("'"))) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^["']|["']$/g, '');
}

console.log("DEBUG: DATABASE_URL=", process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + "..." : "UNDEFINED");
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  }
});

const schema = { ...sharedSchema, ...crmSchema };

export const db = drizzle(pool, { schema });
