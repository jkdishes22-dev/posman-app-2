/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Adds optional default_purchase_price to purchase_item so storekeepers can
 * pre-configure the usual cost per pack, pre-filling the unit_price field
 * when they create a purchase order.
 */
module.exports = class PurchaseItemDefaultPrice1700000000042 {
    name = "PurchaseItemDefaultPrice1700000000042";

    async up(queryRunner) {
        console.log("🔧 PurchaseItemDefaultPrice: adding default_purchase_price column...");

        const cols = await queryRunner.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'purchase_item' AND TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'default_purchase_price'"
        );

        if (cols.length === 0) {
            await queryRunner.query(
                "ALTER TABLE `purchase_item` ADD COLUMN `default_purchase_price` decimal(10,2) DEFAULT NULL"
            );
            console.log("  ✅ purchase_item.default_purchase_price added");
        } else {
            console.log("  ⏭️  purchase_item.default_purchase_price already exists");
        }

        console.log("✅ PurchaseItemDefaultPrice migration done.");
    }

    async down(queryRunner) {
        await queryRunner.query(
            "ALTER TABLE `purchase_item` DROP COLUMN IF EXISTS `default_purchase_price`"
        );
    }
};
