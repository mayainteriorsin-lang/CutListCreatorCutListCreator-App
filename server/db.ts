import { Pool, Client } from 'pg';
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

// console.log("DEBUG: DATABASE_URL=", process.env.DATABASE_URL ? "Set (Hidden)" : "UNDEFINED");
const sslEnabled = process.env.DB_SSL !== "false";
const sslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === "true";

// Append pgbouncer=true if using Supabase pooler (Transaction mode)
let connectionString = process.env.DATABASE_URL!;
if (connectionString.includes('pooler.supabase') && !connectionString.includes('pgbouncer=true')) {
  connectionString += connectionString.includes('?') ? '&pgbouncer=true' : '?pgbouncer=true';
}

export const pool = new Pool({
  connectionString,
  ssl: sslEnabled ? { rejectUnauthorized: sslRejectUnauthorized } : undefined,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const schema = { ...sharedSchema, ...crmSchema };

export const db = drizzle(pool, { schema });

/**
 * Execute a query using a fresh client connection for Supabase compatibility.
 * Use this for queries that fail with pool.query due to connection pooler issues.
 */
export async function safeDbQuery<T = any>(text: string, params: any[] = []): Promise<{ rows: T[] }> {
  const client = new Client({
    connectionString,
    ssl: sslEnabled ? { rejectUnauthorized: sslRejectUnauthorized } : undefined,
  });

  try {
    await client.connect();
    const result = await client.query(text, params);
    return { rows: result.rows };
  } finally {
    await client.end();
  }
}
