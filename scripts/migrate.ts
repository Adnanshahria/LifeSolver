import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import { join } from "path";

dotenv.config({ path: join(process.cwd(), ".env") });

const db = createClient({
    url: process.env.VITE_TURSO_DB_URL || "",
    authToken: process.env.VITE_TURSO_AUTH_TOKEN || "",
});

async function migrate() {
    console.log("Running database migrations...");

    try {
        // Check if is_verified column exists
        const tableInfo = await db.execute("PRAGMA table_info(users)");
        const columns = tableInfo.rows.map((r: any) => r.name);
        console.log("Current users columns:", columns);

        if (!columns.includes("is_verified")) {
            await db.execute("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0");
            console.log("✅ Added is_verified column to users table");
        } else {
            console.log("✅ is_verified column already exists");
        }

        if (!columns.includes("password_hash")) {
            await db.execute("ALTER TABLE users ADD COLUMN password_hash TEXT");
            console.log("✅ Added password_hash column to users table");
        } else {
            console.log("✅ password_hash column already exists");
        }

        // Ensure OTPs table exists
        await db.execute(`
            CREATE TABLE IF NOT EXISTS otps (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                otp_code TEXT NOT NULL,
                purpose TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ OTPs table ensured");

        // Ensure settings table exists
        await db.execute(`
            CREATE TABLE IF NOT EXISTS settings (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE,
                theme TEXT DEFAULT 'dark',
                currency TEXT DEFAULT 'BDT',
                language TEXT DEFAULT 'en',
                notifications_enabled INTEGER DEFAULT 1,
                monthly_budget REAL DEFAULT 0,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Settings table ensured");

        console.log("\n🎉 All migrations complete!");
    } catch (error) {
        console.error("Migration error:", error);
    }

    process.exit(0);
}

migrate();
