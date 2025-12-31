/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 * 
 * Migration: Add performance indexes for inventory queries
 * 
 * Adds indexes to improve query performance for:
 * - Item name and code searches
 * - Category joins
 * - Low stock queries (reorder_point)
 */
class AddInventoryPerformanceIndexes1700000000025 {
    constructor() {
        this.name = "AddInventoryPerformanceIndexes1700000000025";
    }

    async up(queryRunner) {
        console.log("🔄 Adding performance indexes for inventory queries...");

        // Check if indexes already exist before creating them
        const checkIndex = async (tableName, indexName) => {
            const result = await queryRunner.query(`
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = '${tableName}'
                AND INDEX_NAME = '${indexName}'
            `);
            return result[0].count > 0;
        };

        // Add index on item.name for search performance
        if (!(await checkIndex("item", "IDX_item_name"))) {
            console.log("   ➕ Adding index on item.name...");
            await queryRunner.query(`
                CREATE INDEX \`IDX_item_name\` ON \`item\` (\`name\`)
            `);
            console.log("   ✅ Added index on item.name");
        } else {
            console.log("   ⏭️  Index IDX_item_name already exists");
        }

        // Add index on item.code for search performance
        if (!(await checkIndex("item", "IDX_item_code"))) {
            console.log("   ➕ Adding index on item.code...");
            await queryRunner.query(`
                CREATE INDEX \`IDX_item_code\` ON \`item\` (\`code\`)
            `);
            console.log("   ✅ Added index on item.code");
        } else {
            console.log("   ⏭️  Index IDX_item_code already exists");
        }

        // Add index on item.item_category_id for join performance (if not already exists)
        if (!(await checkIndex("item", "FK_item_category"))) {
            console.log("   ➕ Adding index on item.item_category_id...");
            await queryRunner.query(`
                CREATE INDEX \`FK_item_category\` ON \`item\` (\`item_category_id\`)
            `);
            console.log("   ✅ Added index on item.item_category_id");
        } else {
            console.log("   ⏭️  Index FK_item_category already exists");
        }

        // Add index on inventory.reorder_point for low stock queries
        if (!(await checkIndex("inventory", "IDX_inventory_reorder_point"))) {
            console.log("   ➕ Adding index on inventory.reorder_point...");
            await queryRunner.query(`
                CREATE INDEX \`IDX_inventory_reorder_point\` ON \`inventory\` (\`reorder_point\`)
            `);
            console.log("   ✅ Added index on inventory.reorder_point");
        } else {
            console.log("   ⏭️  Index IDX_inventory_reorder_point already exists");
        }

        // Add composite index on inventory (quantity, reserved_quantity) for available quantity calculations
        if (!(await checkIndex("inventory", "IDX_inventory_quantity_composite"))) {
            console.log("   ➕ Adding composite index on inventory (quantity, reserved_quantity)...");
            await queryRunner.query(`
                CREATE INDEX \`IDX_inventory_quantity_composite\` ON \`inventory\` (\`quantity\`, \`reserved_quantity\`)
            `);
            console.log("   ✅ Added composite index on inventory (quantity, reserved_quantity)");
        } else {
            console.log("   ⏭️  Index IDX_inventory_quantity_composite already exists");
        }

        console.log("✅ Performance indexes added successfully!");
    }

    async down(queryRunner) {
        console.log("🔄 Removing performance indexes...");

        const checkIndex = async (tableName, indexName) => {
            const result = await queryRunner.query(`
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = '${tableName}'
                AND INDEX_NAME = '${indexName}'
            `);
            return result[0].count > 0;
        };

        // Remove composite index
        if (await checkIndex("inventory", "IDX_inventory_quantity_composite")) {
            console.log("   ➖ Removing composite index on inventory...");
            await queryRunner.query(`
                DROP INDEX \`IDX_inventory_quantity_composite\` ON \`inventory\`
            `);
            console.log("   ✅ Removed composite index");
        }

        // Remove reorder_point index
        if (await checkIndex("inventory", "IDX_inventory_reorder_point")) {
            console.log("   ➖ Removing index on inventory.reorder_point...");
            await queryRunner.query(`
                DROP INDEX \`IDX_inventory_reorder_point\` ON \`inventory\`
            `);
            console.log("   ✅ Removed index on inventory.reorder_point");
        }

        // Remove item.code index
        if (await checkIndex("item", "IDX_item_code")) {
            console.log("   ➖ Removing index on item.code...");
            await queryRunner.query(`
                DROP INDEX \`IDX_item_code\` ON \`item\`
            `);
            console.log("   ✅ Removed index on item.code");
        }

        // Remove item.name index
        if (await checkIndex("item", "IDX_item_name")) {
            console.log("   ➖ Removing index on item.name...");
            await queryRunner.query(`
                DROP INDEX \`IDX_item_name\` ON \`item\`
            `);
            console.log("   ✅ Removed index on item.name");
        }

        // Note: We don't remove FK_item_category as it might be a foreign key constraint
        // and removing it could break referential integrity

        console.log("✅ Performance indexes removed!");
    }
}

module.exports = AddInventoryPerformanceIndexes1700000000025;

