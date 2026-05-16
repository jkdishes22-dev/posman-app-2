/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * SQLite equivalent of 1700000000042-PurchaseItemDefaultPrice.
 * Adds optional default_purchase_price to purchase_item.
 */
const { patchQueryRunner } = require("./sqlite-compat-runner.cjs");

module.exports = class PurchaseItemDefaultPriceSqlite1700000000042 {
    name = "PurchaseItemDefaultPriceSqlite1700000000042";

    async up(queryRunner) {
        const qr = patchQueryRunner(queryRunner);
        console.log("🔧 PurchaseItemDefaultPrice (SQLite): adding default_purchase_price column...");

        const cols = await queryRunner.query(`PRAGMA table_info("purchase_item")`);
        const colNames = new Set(cols.map((r) => r.name));

        if (!colNames.has("default_purchase_price")) {
            await qr.query(
                `ALTER TABLE "purchase_item" ADD COLUMN "default_purchase_price" DECIMAL(10,2) DEFAULT NULL`
            );
            console.log("  ✅ purchase_item.default_purchase_price added");
        } else {
            console.log("  ⏭️  purchase_item.default_purchase_price already exists");
        }

        console.log("✅ PurchaseItemDefaultPrice (SQLite) migration done.");
    }

    async down(queryRunner) {
        // SQLite does not support DROP COLUMN before 3.35; leave the column in place.
        console.log("⏭️  PurchaseItemDefaultPrice (SQLite) down: no-op (SQLite cannot drop columns safely).");
    }
};
