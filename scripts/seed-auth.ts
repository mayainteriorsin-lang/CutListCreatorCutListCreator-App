import "dotenv/config";
import { db } from "../server/db";
import { roles, tenants } from "../server/db/authSchema";
import { sql } from "drizzle-orm";

async function main() {
    console.log("🌱 Seeding Auth Data...");

    // 1. Insert Default Roles
    console.log("Creating default roles...");
    await db.insert(roles).values([
        {
            name: 'admin',
            description: 'Full system access',
            permissions: ["*"]
        },
        {
            name: 'manager',
            description: 'Manage team and quotations',
            permissions: ["quotations.*", "users.read", "reports.*"]
        },
        {
            name: 'user',
            description: 'Create and manage own quotations',
            permissions: ["quotations.create", "quotations.read", "quotations.update"]
        },
        {
            name: 'viewer',
            description: 'Read-only access',
            permissions: ["quotations.read", "reports.read"]
        }
    ]).onConflictDoNothing();

    // 2. Create Default Tenant
    console.log("Creating default tenant...");
    await db.insert(tenants).values({
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Legacy Data',
        slug: 'legacy',
        plan: 'enterprise',
        status: 'active'
    }).onConflictDoNothing();

    // 3. Migrate Existing Data (if any)
    console.log("Migrating existing data to default tenant...");

    try {
        // Quotations
        await db.execute(sql`UPDATE quotes SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL`);
        console.log("Migrated quotes");
    } catch (e) { console.log("Skipped quotes migration (table might not exist or no tenant_id col yet)"); }

    try {
        // Library Modules (if any)
        await db.execute(sql`UPDATE library_modules SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL`);
        console.log("Migrated library modules");
    } catch (e) { console.log("Skipped library modules migration"); }

    console.log("✅ Seeding Complete!");
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Seeding Failed:", err);
    process.exit(1);
});
