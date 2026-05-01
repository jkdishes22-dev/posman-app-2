/* eslint-disable @typescript-eslint/no-require-imports */
// Custom SQLite migration — cannot use patchQueryRunner because SQLite
// uses TEXT for enums and doesn't have INFORMATION_SCHEMA.

module.exports = class ReshapeSupplierPaymentSqlite1700000000023 {
  name = "ReshapeSupplierPaymentSqlite1700000000023";

  async up(queryRunner) {
    // 1. Add action column (TEXT — SQLite has no ENUM)
    const cols = await queryRunner.query(
      `PRAGMA table_info("supplier_payment")`
    );
    const colNames = cols.map((c) => c.name);

    if (!colNames.includes("action")) {
      await queryRunner.query(
        `ALTER TABLE "supplier_payment" ADD COLUMN "action" TEXT NOT NULL DEFAULT 'expense'`
      );
    }

    if (!colNames.includes("action_reference_id")) {
      await queryRunner.query(
        `ALTER TABLE "supplier_payment" ADD COLUMN "action_reference_id" INTEGER NULL`
      );
      const idxExists = await queryRunner.query(
        `SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'IDX_supplier_payment_action_ref'`
      );
      if (idxExists.length === 0) {
        await queryRunner.query(
          `CREATE INDEX "IDX_supplier_payment_action_ref" ON "supplier_payment" ("action_reference_id")`
        );
      }
    }

    // 2. SQLite 3.35+ supports DROP COLUMN — used here (project uses 3.53)
    if (colNames.includes("amount_paid")) {
      await queryRunner.query(`ALTER TABLE "supplier_payment" DROP COLUMN "amount_paid"`);
    }
    if (colNames.includes("amount_received")) {
      await queryRunner.query(`ALTER TABLE "supplier_payment" DROP COLUMN "amount_received"`);
    }
    if (colNames.includes("reference")) {
      await queryRunner.query(`ALTER TABLE "supplier_payment" DROP COLUMN "reference"`);
    }
  }

  async down(queryRunner) {
    await queryRunner.query(
      `ALTER TABLE "supplier_payment" ADD COLUMN "reference" TEXT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_payment" ADD COLUMN "amount_received" REAL NOT NULL DEFAULT 0`
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_payment" ADD COLUMN "amount_paid" REAL NOT NULL DEFAULT 0`
    );

    const idxExists = await queryRunner.query(
      `SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'IDX_supplier_payment_action_ref'`
    );
    if (idxExists.length > 0) {
      await queryRunner.query(`DROP INDEX "IDX_supplier_payment_action_ref"`);
    }

    const cols = await queryRunner.query(`PRAGMA table_info("supplier_payment")`);
    const colNames = cols.map((c) => c.name);
    if (colNames.includes("action_reference_id")) {
      await queryRunner.query(`ALTER TABLE "supplier_payment" DROP COLUMN "action_reference_id"`);
    }
    if (colNames.includes("action")) {
      await queryRunner.query(`ALTER TABLE "supplier_payment" DROP COLUMN "action"`);
    }
  }
};
