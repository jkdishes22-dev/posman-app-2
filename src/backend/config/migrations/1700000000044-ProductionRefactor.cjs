/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Production refactor migration (MySQL):
 * - Creates `production` table (bucket/header)
 * - Creates `production_item` table (line items)
 * - Migrates production_preparation data → production_item
 * - Drops production_preparation and production_issue tables
 */
module.exports = class ProductionRefactor1700000000044 {
    name = "ProductionRefactor1700000000044";

    async up(queryRunner) {
        console.log("🔧 ProductionRefactor (MySQL): creating production table...");

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`production\` (
                \`id\`           INT NOT NULL AUTO_INCREMENT,
                \`name\`         VARCHAR(255) NOT NULL,
                \`description\`  TEXT DEFAULT NULL,
                \`status\`       VARCHAR(20) NOT NULL DEFAULT 'open',
                \`created_at\`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\`   DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                \`created_by\`   INT DEFAULT NULL,
                \`updated_by\`   INT DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                INDEX \`IDX_production_status\` (\`status\`),
                INDEX \`IDX_production_created_at\` (\`created_at\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log("  ✅ production table created");

        console.log("🔧 ProductionRefactor (MySQL): creating production_item table...");

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`production_item\` (
                \`id\`                INT NOT NULL AUTO_INCREMENT,
                \`production_id\`     INT DEFAULT NULL,
                \`item_id\`           INT NOT NULL,
                \`quantity_produced\`  INT NOT NULL,
                \`status\`            VARCHAR(20) NOT NULL DEFAULT 'issued',
                \`issued_by\`         INT DEFAULT NULL,
                \`issued_at\`         DATETIME DEFAULT NULL,
                \`notes\`             TEXT DEFAULT NULL,
                \`created_at\`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\`        DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                \`created_by\`        INT DEFAULT NULL,
                \`updated_by\`        INT DEFAULT NULL,
                PRIMARY KEY (\`id\`),
                INDEX \`IDX_production_item_production_id\` (\`production_id\`),
                INDEX \`IDX_production_item_item_id\` (\`item_id\`),
                INDEX \`IDX_production_item_issued_by\` (\`issued_by\`),
                INDEX \`IDX_production_item_issued_at\` (\`issued_at\`),
                CONSTRAINT \`FK_production_item_production\`
                    FOREIGN KEY (\`production_id\`) REFERENCES \`production\` (\`id\`),
                CONSTRAINT \`FK_production_item_item\`
                    FOREIGN KEY (\`item_id\`) REFERENCES \`item\` (\`id\`),
                CONSTRAINT \`FK_production_item_issued_by\`
                    FOREIGN KEY (\`issued_by\`) REFERENCES \`user\` (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log("  ✅ production_item table created");

        // Migrate from production_preparation if it exists
        const [prepTable] = await queryRunner.query(
            `SELECT TABLE_NAME FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'production_preparation'`
        );
        if (prepTable) {
            console.log("🔧 ProductionRefactor (MySQL): migrating production_preparation → production_item...");
            await queryRunner.query(`
                INSERT INTO \`production_item\`
                    (\`production_id\`, \`item_id\`, \`quantity_produced\`, \`status\`,
                     \`issued_by\`, \`issued_at\`, \`notes\`,
                     \`created_at\`, \`updated_at\`, \`created_by\`, \`updated_by\`)
                SELECT
                    NULL,
                    item_id,
                    quantity_prepared,
                    CASE
                        WHEN status IN ('issued','approved','pending') THEN 'issued'
                        WHEN status = 'rejected' THEN 'cancelled'
                        ELSE 'issued'
                    END,
                    COALESCE(issued_by, prepared_by),
                    COALESCE(issued_at, prepared_at),
                    notes,
                    created_at,
                    updated_at,
                    COALESCE(created_by, prepared_by),
                    updated_by
                FROM \`production_preparation\`
            `);
            console.log("  ✅ data migrated");
            await queryRunner.query(`DROP TABLE IF EXISTS \`production_preparation\``);
            console.log("  ✅ production_preparation dropped");
        }

        // Drop production_issue (orphaned table)
        const [issueTable] = await queryRunner.query(
            `SELECT TABLE_NAME FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'production_issue'`
        );
        if (issueTable) {
            await queryRunner.query(`DROP TABLE IF EXISTS \`production_issue\``);
            console.log("  ✅ production_issue dropped");
        }

        console.log("✅ ProductionRefactor migration complete");
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`production_item\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`production\``);
        console.log("  ✅ ProductionRefactor reverted");
    }
};
