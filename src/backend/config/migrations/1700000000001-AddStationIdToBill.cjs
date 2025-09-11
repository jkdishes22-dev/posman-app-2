const { MigrationInterface, QueryRunner } = require("typeorm");

class AddStationIdToBill1700000000001 extends MigrationInterface {
    constructor() {
        super();
        this.name = 'AddStationIdToBill1700000000001';
    }

    async up(queryRunner) {
        // Add station_id column to bill table
        await queryRunner.query(`
            ALTER TABLE \`bill\` 
            ADD COLUMN \`station_id\` int unsigned NULL
        `);

        // Add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE \`bill\` 
            ADD CONSTRAINT \`fk_bill_station\` 
            FOREIGN KEY (\`station_id\`) REFERENCES \`station\`(\`id\`) 
            ON DELETE SET NULL ON UPDATE CASCADE
        `);

        // Add index for better performance
        await queryRunner.query(`
            CREATE INDEX \`idx_bill_station\` ON \`bill\` (\`station_id\`)
        `);
    }

    async down(queryRunner) {
        // Drop foreign key constraint
        await queryRunner.query(`
            ALTER TABLE \`bill\` 
            DROP FOREIGN KEY \`fk_bill_station\`
        `);

        // Drop index
        await queryRunner.query(`
            DROP INDEX \`idx_bill_station\` ON \`bill\`
        `);

        // Drop station_id column
        await queryRunner.query(`
            ALTER TABLE \`bill\` 
            DROP COLUMN \`station_id\`
        `);
    }
}

module.exports = AddStationIdToBill1700000000001;
