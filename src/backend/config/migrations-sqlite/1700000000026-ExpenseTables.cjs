module.exports = class ExpenseTablesSqlite1700000000026 {
  name = "ExpenseTablesSqlite1700000000026";

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "expense" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "category" VARCHAR(100) NOT NULL,
        "description" TEXT NOT NULL,
        "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "expense_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "status" VARCHAR(20) NOT NULL DEFAULT 'open',
        "notes" TEXT,
        "created_by" INTEGER,
        "updated_by" INTEGER,
        "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "expense_payment" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "expense_id" INTEGER NOT NULL,
        "amount" DECIMAL(10,2) NOT NULL,
        "payment_method" VARCHAR(50) NOT NULL DEFAULT 'cash',
        "notes" TEXT,
        "created_by" INTEGER,
        "updated_by" INTEGER,
        "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME,
        FOREIGN KEY ("expense_id") REFERENCES "expense"("id")
      )
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "expense_payment"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expense"`);
  }
};
