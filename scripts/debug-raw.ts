
import "dotenv/config";
import { Client } from "pg";

async function main() {
    console.log("🔍 Testing RAW Connection...");

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL !== "false" ? { rejectUnauthorized: false } : undefined,
    });

    try {
        await client.connect();
        console.log("✅ Connected!");

        const res = await client.query("SELECT 1 as val");
        console.log("Query Result:", res.rows[0]);

        await client.end();
    } catch (err) {
        console.error("❌ RAW Connection Failed:", err);
    }
}

main();
