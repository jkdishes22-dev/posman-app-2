import { DataSource } from "typeorm";
import { readFileSync } from "fs";
import { join } from "path";

export async function runStationPricelistMigration(dataSource: DataSource) {
    console.log("🚀 Starting Station-Pricelist Migration...");

    try {
        // Read the migration SQL file
        const migrationPath = join(process.cwd(), "migrations", "station-pricelist-migration.sql");
        const migrationSQL = readFileSync(migrationPath, "utf8");

        // Split the SQL into individual statements
        const statements = migrationSQL
            .split(";")
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith("--"));

        console.log(`📝 Found ${statements.length} SQL statements to execute`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);

            try {
                await dataSource.query(statement);
                console.log(`✅ Statement ${i + 1} executed successfully`);
            } catch (error: any) {
                // Skip if table already exists or column already exists
                if (error.message.includes("already exists") ||
                    error.message.includes("Duplicate column name")) {
                    console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message}`);
                    continue;
                }
                throw error;
            }
        }

        // Verify the migration
        console.log("🔍 Verifying migration...");

        const pricelistsWithStation = await dataSource.query(`
      SELECT COUNT(*) as count 
      FROM pricelist 
      WHERE station_id IS NOT NULL
    `);

        const stationPricelistCount = await dataSource.query(`
      SELECT COUNT(*) as count 
      FROM station_pricelist
    `);

        const defaultPricelists = await dataSource.query(`
      SELECT COUNT(*) as count 
      FROM station_pricelist 
      WHERE is_default = 1
    `);

        console.log("📊 Migration Results:");
        console.log(`   - Pricelists with station_id: ${pricelistsWithStation[0].count}`);
        console.log(`   - Station-pricelist relationships created: ${stationPricelistCount[0].count}`);
        console.log(`   - Default pricelists migrated: ${defaultPricelists[0].count}`);

        if (stationPricelistCount[0].count > 0) {
            console.log("✅ Migration completed successfully!");
            console.log("⚠️  Note: The old station_id column is still present for safety.");
            console.log("   You can remove it manually after confirming everything works correctly.");
        } else {
            console.log("❌ Migration may have failed - no relationships were created");
        }

    } catch (error: any) {
        console.error("❌ Migration failed:", error.message);
        throw error;
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    import("./data-source").then(async ({ AppDataSource }) => {
        try {
            await AppDataSource.initialize();
            await runStationPricelistMigration(AppDataSource);
            await AppDataSource.destroy();
            process.exit(0);
        } catch (error) {
            console.error("Migration failed:", error);
            process.exit(1);
        }
    });
}
