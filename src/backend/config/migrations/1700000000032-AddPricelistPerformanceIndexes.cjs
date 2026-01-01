const { MigrationInterface, QueryRunner } = require("typeorm");

/**
 * Migration: Add performance indexes for pricelist and audit queries
 * 
 * This migration adds composite indexes to improve query performance for:
 * - Pricelist item lookups by pricelist and item
 * - Audit log queries by pricelist_item_id and changed_at
 * - Audit log queries by item_id and changed_at
 */
module.exports = class AddPricelistPerformanceIndexes1700000000032 {
    name = 'AddPricelistPerformanceIndexes1700000000032'

    async up(queryRunner) {
        // Check if table exists helper - try to query the table directly
        const checkTable = async (tableName) => {
            try {
                // Try to query the table - if it exists, this will succeed
                await queryRunner.query(`SELECT 1 FROM \`${tableName}\` LIMIT 1`);
                return true;
            } catch (error) {
                // If table doesn't exist, we'll get ER_NO_SUCH_TABLE error
                if (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146) {
                    return false;
                }
                // For other errors, log and return false
                console.log(`⚠️  Error checking table ${tableName}: ${error.message}`);
                return false;
            }
        };

        // Check if index already exists helper
        const checkIndex = async (tableName, indexName) => {
            try {
                const result = await queryRunner.query(`
                    SELECT COUNT(*) as count
                    FROM INFORMATION_SCHEMA.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = '${tableName}'
                    AND INDEX_NAME = '${indexName}'
                `);
                return result[0].count > 0;
            } catch (error) {
                return false;
            }
        };

        // Composite index for pricelist_item lookups (pricelist_id + item_id)
        if (await checkTable("pricelist_item") && !(await checkIndex("pricelist_item", "IDX_pricelist_item_composite"))) {
            await queryRunner.query(`
                CREATE INDEX \`IDX_pricelist_item_composite\` 
                ON \`pricelist_item\` (\`pricelist_id\`, \`item_id\`)
            `);
            console.log("Added composite index on pricelist_item (pricelist_id, item_id)");
        } else if (!(await checkTable("pricelist_item"))) {
            console.log("⚠️  Table pricelist_item does not exist, skipping index creation");
        }

        // Composite index for pricelist_item_audit queries (pricelist_item_id + changed_at)
        if (await checkTable("pricelist_item_audit") && !(await checkIndex("pricelist_item_audit", "IDX_pricelist_item_audit_composite"))) {
            await queryRunner.query(`
                CREATE INDEX \`IDX_pricelist_item_audit_composite\` 
                ON \`pricelist_item_audit\` (\`pricelist_item_id\`, \`changed_at\`)
            `);
            console.log("Added composite index on pricelist_item_audit (pricelist_item_id, changed_at)");
        } else if (!(await checkTable("pricelist_item_audit"))) {
            console.log("⚠️  Table pricelist_item_audit does not exist, skipping index creation");
        }

        // Composite index for item_audit queries (item_id + changed_at)
        if (await checkTable("item_audit") && !(await checkIndex("item_audit", "IDX_item_audit_composite"))) {
            await queryRunner.query(`
                CREATE INDEX \`IDX_item_audit_composite\` 
                ON \`item_audit\` (\`item_id\`, \`changed_at\`)
            `);
            console.log("Added composite index on item_audit (item_id, changed_at)");
        } else if (!(await checkTable("item_audit"))) {
            console.log("⚠️  Table item_audit does not exist, skipping index creation");
        }

        // Index on category.code for faster lookups
        if (await checkTable("category") && !(await checkIndex("category", "IDX_category_code"))) {
            await queryRunner.query(`
                CREATE INDEX \`IDX_category_code\` 
                ON \`category\` (\`code\`)
            `);
            console.log("Added index on category.code");
        } else if (!(await checkTable("category"))) {
            console.log("⚠️  Table category does not exist, skipping index creation");
        }

        // Index on pricelist.code for faster lookups
        if (await checkTable("pricelist") && !(await checkIndex("pricelist", "IDX_pricelist_code"))) {
            await queryRunner.query(`
                CREATE INDEX \`IDX_pricelist_code\` 
                ON \`pricelist\` (\`code\`)
            `);
            console.log("Added index on pricelist.code");
        } else if (!(await checkTable("pricelist"))) {
            console.log("⚠️  Table pricelist does not exist, skipping index creation");
        }
    }

    async down(queryRunner) {
        // Drop indexes in reverse order
        const indexes = [
            { table: "pricelist", name: "IDX_pricelist_code" },
            { table: "category", name: "IDX_category_code" },
            { table: "item_audit", name: "IDX_item_audit_composite" },
            { table: "pricelist_item_audit", name: "IDX_pricelist_item_audit_composite" },
            { table: "pricelist_item", name: "IDX_pricelist_item_composite" },
        ];

        for (const idx of indexes) {
            try {
                await queryRunner.query(`
                    DROP INDEX \`${idx.name}\` ON \`${idx.table}\`
                `);
                console.log(`Dropped index ${idx.name} from ${idx.table}`);
            } catch (error) {
                console.log(`Index ${idx.name} does not exist on ${idx.table}`);
            }
        }
    }
}

