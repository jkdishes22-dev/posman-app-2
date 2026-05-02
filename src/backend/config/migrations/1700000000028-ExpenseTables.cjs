/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Expense + expense_payment tables for MySQL (SQLite has 1700000000026-ExpenseTables).
 */
module.exports = class ExpenseTables1700000000028 {
  name = "ExpenseTables1700000000028";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`expense\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`category\` varchar(100) NOT NULL,
        \`description\` text NOT NULL,
        \`amount\` decimal(10,2) NOT NULL DEFAULT '0.00',
        \`expense_date\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`status\` varchar(20) NOT NULL DEFAULT 'open',
        \`notes\` text NULL,
        \`created_by\` int NULL,
        \`updated_by\` int NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_expense_expense_date\` (\`expense_date\`),
        KEY \`IDX_expense_status\` (\`status\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`expense_payment\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`expense_id\` int NOT NULL,
        \`amount\` decimal(10,2) NOT NULL,
        \`payment_method\` varchar(50) NOT NULL DEFAULT 'cash',
        \`reference\` varchar(255) NULL,
        \`notes\` text NULL,
        \`created_by\` int NULL,
        \`updated_by\` int NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_expense_payment_expense_id\` (\`expense_id\`),
        CONSTRAINT \`FK_expense_payment_expense\` FOREIGN KEY (\`expense_id\`) REFERENCES \`expense\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  async down(queryRunner) {
    await queryRunner.query("DROP TABLE IF EXISTS `expense_payment`");
    await queryRunner.query("DROP TABLE IF EXISTS `expense`");
  }
};
