
import "dotenv/config";
import { safeDbQuery, pool } from "../server/db";

async function main() {
    console.log("🔍 Checking Database Tables...");
    console.log("Pool Config:", {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
    });

    try {
        const result = await safeDbQuery(
            `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public'`
        );

        console.log("Tables found:", result.rows.map((r: any) => r.table_name));
    } catch (err: any) {
        console.error("DEBUG ERROR:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
        if (err.message) console.error("Message:", err.message);
    }
}

main().catch(console.error).finally(() => process.exit(0));
