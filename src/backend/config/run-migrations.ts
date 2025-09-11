import "reflect-metadata";
import { AppDataSource } from "./data-source";

async function runMigrations() {
    try {
        console.log("🔄 Initializing database connection...");
        await AppDataSource.initialize();

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
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

runMigrations();
