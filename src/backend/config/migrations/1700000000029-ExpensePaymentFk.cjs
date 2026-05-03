/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Migrates expense_payment to use a FK into the shared payment table,
 * matching the design of bill_payment. Old inline amount/payment_method/reference
 * columns are replaced by a payment_id FK.
 */
module.exports = class ExpensePaymentFk1700000000029 {
  name = "ExpensePaymentFk1700000000029";

  async up(queryRunner) {
    // 1. Add nullable payment_id column
    await queryRunner.query(`
      ALTER TABLE \`expense_payment\` ADD COLUMN \`payment_id\` INT NULL
    `);

    // 2. Create payment rows for existing expense_payment records
    const rows = await queryRunner.query(`
      SELECT \`id\`, \`amount\`, \`payment_method\`, \`reference\`, \`created_by\`, \`created_at\`
      FROM \`expense_payment\`
      WHERE \`amount\` IS NOT NULL
    `);

    for (const row of rows) {
      const paymentType =
        (row.payment_method || "cash").toLowerCase() === "cash" ? "CASH" : "MPESA";
      const ref = row.reference ? row.reference.trim().toUpperCase() : null;

      const result = await queryRunner.query(
        `INSERT INTO \`payment\`
           (\`debit_amount\`, \`credit_amount\`, \`payment_type\`, \`paid_at\`, \`reference\`, \`created_by\`, \`created_at\`)
         VALUES (?, 0, ?, NOW(), ?, ?, COALESCE(?, NOW()))`,
        [Number(row.amount), paymentType, ref, row.created_by ?? null, row.created_at ?? null]
      );

      await queryRunner.query(
        `UPDATE \`expense_payment\` SET \`payment_id\` = ? WHERE \`id\` = ?`,
        [result.insertId, row.id]
      );
    }

    // 3. Make payment_id NOT NULL and add FK
    await queryRunner.query(`
      ALTER TABLE \`expense_payment\`
        MODIFY COLUMN \`payment_id\` INT NOT NULL,
        ADD CONSTRAINT \`FK_expense_payment_payment\`
          FOREIGN KEY (\`payment_id\`) REFERENCES \`payment\`(\`id\`)
    `);

    // 4. Drop old columns
    await queryRunner.query(`
      ALTER TABLE \`expense_payment\`
        DROP COLUMN \`amount\`,
        DROP COLUMN \`payment_method\`,
        DROP COLUMN \`reference\`
    `);
  }

  async down(queryRunner) {
    // Restore old columns
    await queryRunner.query(`
      ALTER TABLE \`expense_payment\`
        ADD COLUMN \`amount\` DECIMAL(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN \`payment_method\` VARCHAR(50) NOT NULL DEFAULT 'cash',
        ADD COLUMN \`reference\` VARCHAR(255) NULL
    `);

    // Restore data from linked payment rows
    await queryRunner.query(`
      UPDATE \`expense_payment\` ep
      JOIN \`payment\` p ON p.\`id\` = ep.\`payment_id\`
      SET ep.\`amount\` = p.\`debit_amount\`,
          ep.\`payment_method\` = LOWER(p.\`payment_type\`),
          ep.\`reference\` = p.\`reference\`
    `);

    // Drop FK and payment_id column
    await queryRunner.query(`
      ALTER TABLE \`expense_payment\`
        DROP FOREIGN KEY \`FK_expense_payment_payment\`,
        DROP COLUMN \`payment_id\`
    `);
  }
};