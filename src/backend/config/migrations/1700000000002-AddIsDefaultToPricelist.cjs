const { MigrationInterface, QueryRunner } = require("typeorm");

class AddIsDefaultToPricelist1700000000002 extends MigrationInterface {
    constructor() {
        super();
        this.name = 'AddIsDefaultToPricelist1700000000002';
    }

    async up(queryRunner) {
        // Add is_default column to pricelist table
        await queryRunner.query(`
            ALTER TABLE \`pricelist\` 
            ADD COLUMN \`is_default\` tinyint(1) NOT NULL DEFAULT 0
        `);

        // Add unique index to ensure only one default pricelist per station
        await queryRunner.query(`
            CREATE UNIQUE INDEX \`idx_station_default_pricelist\` 
            ON \`pricelist\` (\`station_id\`) 
            WHERE \`is_default\` = 1
        `);

        // Add index for better performance on is_default queries
        await queryRunner.query(`
            CREATE INDEX \`idx_pricelist_is_default\` 
            ON \`pricelist\` (\`is_default\`)
        `);
    }

    async down(queryRunner) {
        // Drop indexes
        await queryRunner.query(`
            DROP INDEX \`idx_pricelist_is_default\` ON \`pricelist\`
        `);

        await queryRunner.query(`
            DROP INDEX \`idx_station_default_pricelist\` ON \`pricelist\`
        `);

        // Drop is_default column
        await queryRunner.query(`
            ALTER TABLE \`pricelist\` 
            DROP COLUMN \`is_default\`
        `);
    }
}

module.exports = AddIsDefaultToPricelist1700000000002;
