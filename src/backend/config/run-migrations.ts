// Load environment variables FIRST, before any other imports
import dotenv from "dotenv";
import { resolve } from "path";

// Load .env file from project root
dotenv.config({ path: resolve(process.cwd(), ".env") });

import "reflect-metadata";
import { AppDataSource } from "./data-source.js"; // ES modules require .js extension (ts-node will resolve .ts)

async function runMigrations() {
    try {
        console.log("🔄 Initializing database connection...");
        console.log(`📊 Database: ${process.env.DB_NAME || process.env.MYSQL_DATABASE || "test"}`);
        console.log(`🏠 Host: ${process.env.DB_HOST || process.env.MYSQL_HOST || "localhost"}`);

        await AppDataSource.initialize();
        console.log("✅ Database connection initialized successfully!");

        console.log("🚀 Running migrations...");
        const migrations = await AppDataSource.runMigrations();

        if (migrations.length === 0) {
            console.log("✅ No pending migrations found.");
        } else {
            console.log(`✅ Successfully ran ${migrations.length} migration(s):`);
            migrations.forEach(migration => {
                console.log(`   - ${migration.name}`);
            });
        }

        console.log("🎉 Migration process completed successfully!");
    } catch (error: any) {
        console.error("❌ Migration failed:");
        console.error(error);

        // Provide helpful error messages
        if (error.code === "ER_BAD_DB_ERROR") {
            console.error("\n💡 Tip: Make sure the database exists and DB_NAME is set correctly in .env");
        } else if (error.code === "ECONNREFUSED") {
            console.error("\n💡 Tip: Make sure MySQL is running and DB_HOST/DB_PORT are correct in .env");
        } else if (error.message?.includes("MigrationInterface")) {
            console.error("\n💡 Tip: Migration file structure issue. Check migration files.");
        }

        process.exit(1);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log("🔌 Database connection closed.");
        }
    }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
    console.error("Unhandled promise rejection:", error);
    process.exit(1);
});

// Run migrations
runMigrations();
