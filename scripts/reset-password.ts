import "dotenv/config";
import { db } from "../server/db";
import { users } from "../server/db/authSchema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = "Reset@123";

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.log("Usage: npx tsx scripts/reset-password.ts <email> [new-password]");
        console.log("");
        console.log("Examples:");
        console.log("  npx tsx scripts/reset-password.ts user@example.com");
        console.log("  npx tsx scripts/reset-password.ts user@example.com MyNewPassword123");
        console.log("");
        console.log("If no password provided, defaults to: Reset@123");
        process.exit(1);
    }

    const email = args[0];
    const newPassword = args[1] || DEFAULT_PASSWORD;

    console.log(`\n🔐 Resetting password for: ${email}`);

    // Check if user exists
    const user = await db.query.users.findFirst({
        where: eq(users.email, email),
    });

    if (!user) {
        console.error(`\n❌ User not found: ${email}`);
        console.log("\nRegistered users:");
        const allUsers = await db.query.users.findMany({
            columns: { email: true },
        });
        allUsers.forEach((u) => console.log(`  - ${u.email}`));
        process.exit(1);
    }

    // Hash and update password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await db
        .update(users)
        .set({
            passwordHash,
            updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

    console.log(`\n✅ Password reset successfully!`);
    console.log(`\n📧 Email: ${email}`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log(`\n⚠️  Please change this password after logging in.`);

    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
});
