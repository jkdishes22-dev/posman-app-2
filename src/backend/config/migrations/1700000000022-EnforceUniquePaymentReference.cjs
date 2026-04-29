/* eslint-disable @typescript-eslint/no-require-imports */

module.exports = class EnforceUniquePaymentReference1700000000022 {
  name = "EnforceUniquePaymentReference1700000000022";

  async up(queryRunner) {
    await queryRunner.query(
      "UPDATE `payment` SET `reference` = UPPER(TRIM(`reference`)) WHERE `payment_type` = 'MPESA' AND `reference` IS NOT NULL"
    );

    const duplicates = await queryRunner.query(
      `SELECT \`reference\`, COUNT(*) as \`count\`
       FROM \`payment\`
       WHERE \`payment_type\` = 'MPESA' AND \`reference\` IS NOT NULL
       GROUP BY \`reference\`
       HAVING COUNT(*) > 1
       LIMIT 1`
    );

    if (duplicates.length > 0) {
      throw new Error(
        `Cannot add unique payment reference constraint. Duplicate MPESA reference found: ${duplicates[0].reference}`
      );
    }

    const existing = await queryRunner.query(
      `SELECT COUNT(*) as c
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'payment'
         AND INDEX_NAME = 'UQ_payment_type_reference'`
    );

    if (!existing[0] || Number(existing[0].c) === 0) {
      await queryRunner.query(
        "CREATE UNIQUE INDEX `UQ_payment_type_reference` ON `payment` (`payment_type`, `reference`)"
      );
    }
  }

  async down(queryRunner) {
    const existing = await queryRunner.query(
      `SELECT COUNT(*) as c
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'payment'
         AND INDEX_NAME = 'UQ_payment_type_reference'`
    );

    if (existing[0] && Number(existing[0].c) > 0) {
      await queryRunner.query("DROP INDEX `UQ_payment_type_reference` ON `payment`");
    }
  }
};
