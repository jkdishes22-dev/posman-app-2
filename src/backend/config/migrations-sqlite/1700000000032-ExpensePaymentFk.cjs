module.exports = class ExpensePaymentFkSqlite1700000000032 {
  name = "ExpensePaymentFkSqlite1700000000032";

  async up(queryRunner) {
    // 1. Add nullable payment_id column so existing rows can be migrated first
    await queryRunner.query(`
      ALTER TABLE "expense_payment" ADD COLUMN "payment_id" INTEGER
    `);

    // 2. Create a payment record for each existing expense_payment row
    const rows = await queryRunner.query(`
      SELECT "id", "amount", "payment_method", "reference", "created_by", "created_at"
      FROM "expense_payment"
      WHERE "amount" IS NOT NULL
    `);

    for (const row of rows) {
      const paymentType =
        (row.payment_method || "cash").toLowerCase() === "cash" ? "CASH" : "MPESA";
      const ref = row.reference ? row.reference.trim().toUpperCase() : null;

      const result = await queryRunner.query(
        `INSERT INTO "payment"
           ("debit_amount", "credit_amount", "payment_type", "paid_at", "reference", "created_by", "created_at")
         VALUES (?, 0, ?, CURRENT_TIMESTAMP, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
        [Number(row.amount), paymentType, ref, row.created_by ?? null, row.created_at ?? null]
      );

      const paymentId = result.insertId ?? Number(result);
      await queryRunner.query(
        `UPDATE "expense_payment" SET "payment_id" = ? WHERE "id" = ?`,
        [paymentId, row.id]
      );
    }

    // 3. Recreate table without amount/payment_method/reference, with payment_id NOT NULL FK
    await queryRunner.query(`
      CREATE TABLE "expense_payment_new" (
        "id"         INTEGER  PRIMARY KEY AUTOINCREMENT,
        "expense_id" INTEGER  NOT NULL,
        "payment_id" INTEGER  NOT NULL,
        "notes"      TEXT,
        "created_by" INTEGER,
        "updated_by" INTEGER,
        "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME,
        FOREIGN KEY ("expense_id") REFERENCES "expense"("id") ON DELETE CASCADE,
        FOREIGN KEY ("payment_id") REFERENCES "payment"("id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "expense_payment_new"
        ("id", "expense_id", "payment_id", "notes", "created_by", "updated_by", "created_at", "updated_at")
      SELECT "id", "expense_id", "payment_id", "notes", "created_by", "updated_by", "created_at", "updated_at"
      FROM "expense_payment"
      WHERE "payment_id" IS NOT NULL
    `);

    await queryRunner.query(`DROP TABLE "expense_payment"`);
    await queryRunner.query(`ALTER TABLE "expense_payment_new" RENAME TO "expense_payment"`);
  }

  async down(queryRunner) {
    // Recreate old layout, restoring amount/payment_method/reference from linked payment rows
    await queryRunner.query(`
      CREATE TABLE "expense_payment_old" (
        "id"             INTEGER  PRIMARY KEY AUTOINCREMENT,
        "expense_id"     INTEGER  NOT NULL,
        "amount"         DECIMAL(10,2) NOT NULL DEFAULT 0,
        "payment_method" VARCHAR(50)   NOT NULL DEFAULT 'cash',
        "reference"      VARCHAR(255),
        "notes"          TEXT,
        "created_by"     INTEGER,
        "updated_by"     INTEGER,
        "created_at"     DATETIME DEFAULT CURRENT_TIMESTAMP,
        "updated_at"     DATETIME,
        FOREIGN KEY ("expense_id") REFERENCES "expense"("id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "expense_payment_old"
        ("id", "expense_id", "amount", "payment_method", "reference", "notes",
         "created_by", "updated_by", "created_at", "updated_at")
      SELECT ep."id", ep."expense_id",
             p."debit_amount",
             CASE p."payment_type" WHEN 'CASH' THEN 'cash' ELSE 'mpesa' END,
             p."reference",
             ep."notes", ep."created_by", ep."updated_by", ep."created_at", ep."updated_at"
      FROM "expense_payment" ep
      JOIN "payment" p ON p."id" = ep."payment_id"
    `);

    await queryRunner.query(`DROP TABLE "expense_payment"`);
    await queryRunner.query(`ALTER TABLE "expense_payment_old" RENAME TO "expense_payment"`);
  }
};