module.exports = class ExpensePaymentReferenceSqlite1700000000028 {
  name = "ExpensePaymentReferenceSqlite1700000000028";

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "expense_payment" ADD COLUMN "reference" VARCHAR(255)`);
  }

  async down(queryRunner) {
    // SQLite: column drop not universally supported; no-op on downgrade.
  }
};
