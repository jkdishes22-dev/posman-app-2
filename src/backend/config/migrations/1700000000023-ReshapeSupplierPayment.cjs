/* eslint-disable @typescript-eslint/no-require-imports */

module.exports = class ReshapeSupplierPayment1700000000023 {
  name = "ReshapeSupplierPayment1700000000023";

  async up(queryRunner) {
    // 1. Add action column — use 'expense' as safe default for any existing rows
    const hasAction = await queryRunner.query(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supplier_payment' AND COLUMN_NAME = 'action'`
    );
    if (!hasAction[0] || Number(hasAction[0].c) === 0) {
      await queryRunner.query(
        `ALTER TABLE \`supplier_payment\`
         ADD COLUMN \`action\` ENUM('purchase_order','expense','advance','refund') NOT NULL DEFAULT 'expense'`
      );
    }

    // 2. Add action_reference_id column
    const hasRef = await queryRunner.query(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supplier_payment' AND COLUMN_NAME = 'action_reference_id'`
    );
    if (!hasRef[0] || Number(hasRef[0].c) === 0) {
      await queryRunner.query(
        `ALTER TABLE \`supplier_payment\` ADD COLUMN \`action_reference_id\` INT UNSIGNED NULL`
      );
      await queryRunner.query(
        `CREATE INDEX \`IDX_supplier_payment_action_ref\` ON \`supplier_payment\` (\`action_reference_id\`)`
      );
    }

    // 3. Make notes NOT NULL (backfill first)
    await queryRunner.query(
      `UPDATE \`supplier_payment\` SET \`notes\` = '' WHERE \`notes\` IS NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`supplier_payment\` MODIFY COLUMN \`notes\` TEXT NOT NULL`
    );

    // 4. Drop redundant columns if they exist
    for (const col of ["amount_paid", "amount_received", "reference"]) {
      const exists = await queryRunner.query(
        `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supplier_payment' AND COLUMN_NAME = '${col}'`
      );
      if (exists[0] && Number(exists[0].c) > 0) {
        await queryRunner.query(
          `ALTER TABLE \`supplier_payment\` DROP COLUMN \`${col}\``
        );
      }
    }
  }

  async down(queryRunner) {
    // Restore dropped columns
    await queryRunner.query(
      `ALTER TABLE \`supplier_payment\` ADD COLUMN \`reference\` VARCHAR(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`supplier_payment\` ADD COLUMN \`amount_received\` DECIMAL(10,2) NOT NULL DEFAULT 0.00`
    );
    await queryRunner.query(
      `ALTER TABLE \`supplier_payment\` ADD COLUMN \`amount_paid\` DECIMAL(10,2) NOT NULL DEFAULT 0.00`
    );

    // Restore notes to nullable
    await queryRunner.query(
      `ALTER TABLE \`supplier_payment\` MODIFY COLUMN \`notes\` TEXT NULL`
    );

    // Drop added index and columns
    const hasIdx = await queryRunner.query(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supplier_payment'
         AND INDEX_NAME = 'IDX_supplier_payment_action_ref'`
    );
    if (hasIdx[0] && Number(hasIdx[0].c) > 0) {
      await queryRunner.query(
        `DROP INDEX \`IDX_supplier_payment_action_ref\` ON \`supplier_payment\``
      );
    }
    await queryRunner.query(
      `ALTER TABLE \`supplier_payment\` DROP COLUMN \`action_reference_id\``
    );
    await queryRunner.query(
      `ALTER TABLE \`supplier_payment\` DROP COLUMN \`action\``
    );
  }
};
