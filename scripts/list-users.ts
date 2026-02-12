import "dotenv/config";
import { db } from "../server/db";
import { users, tenants } from "../server/db/authSchema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("📋 Listing All Registered Users...\n");

    const allUsers = await db.query.users.findMany({
        columns: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            tenantId: true,
            emailVerified: true,
            createdAt: true,
            lastLoginAt: true,
        },
    });

    if (allUsers.length === 0) {
        console.log("No users registered yet.");
        process.exit(0);
    }

    console.log(`Found ${allUsers.length} user(s):\n`);
    console.log("─".repeat(80));

    for (const user of allUsers) {
        console.log(`Email:       ${user.email}`);
        console.log(`Name:        ${user.fullName || "(not set)"}`);
        console.log(`Role:        ${user.role}`);
        console.log(`Verified:    ${user.emailVerified ? "Yes" : "No"}`);
        console.log(`Created:     ${user.createdAt}`);
        console.log(`Last Login:  ${user.lastLoginAt || "Never"}`);
        console.log("─".repeat(80));
    }

    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
});
