/* eslint-disable @typescript-eslint/no-require-imports */
module.exports = class ProductionNameUniqueAndSoftDelete1700000000052 {
    name = "ProductionNameUniqueAndSoftDelete1700000000052";

    async up(queryRunner) {
        await queryRunner.query(
            `ALTER TABLE \`production\` ADD COLUMN \`deleted_at\` DATETIME NULL`
        );
        // Remove duplicate names before adding constraint (keep oldest)
        await queryRunner.query(`
            DELETE p1 FROM \`production\` p1
            INNER JOIN \`production\` p2
                ON p1.name = p2.name AND p1.id > p2.id
        `);
        await queryRunner.query(
            `ALTER TABLE \`production\` ADD CONSTRAINT \`UQ_production_name\` UNIQUE (\`name\`)`
        );
    }

    async down(queryRunner) {
        await queryRunner.query(
            `ALTER TABLE \`production\` DROP INDEX \`UQ_production_name\``
        );
        await queryRunner.query(
            `ALTER TABLE \`production\` DROP COLUMN \`deleted_at\``
        );
    }
};
