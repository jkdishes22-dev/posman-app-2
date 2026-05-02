/* eslint-disable @typescript-eslint/no-require-imports */

module.exports = class DropReservedQuantitySqlite1700000000023 {
  name = "DropReservedQuantitySqlite1700000000023";

  async up(queryRunner) {
    // Drop composite index that includes reserved_quantity before dropping the column
    const indexExists = await queryRunner.query(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'IDX_inventory_quantity_composite'"
    );
    if (indexExists.length > 0) {
      await queryRunner.query("DROP INDEX `IDX_inventory_quantity_composite`");
    }

    // Drop reserved_quantity column (requires SQLite >= 3.35.0)
    const columns = await queryRunner.query("PRAGMA table_info(inventory)");
    const hasColumn = columns.some((col) => col.name === "reserved_quantity");
    if (hasColumn) {
      await queryRunner.query("ALTER TABLE `inventory` DROP COLUMN `reserved_quantity`");
    }
  }

  async down(queryRunner) {
    const columns = await queryRunner.query("PRAGMA table_info(inventory)");
    const hasColumn = columns.some((col) => col.name === "reserved_quantity");
    if (!hasColumn) {
      await queryRunner.query(
        "ALTER TABLE `inventory` ADD COLUMN `reserved_quantity` INTEGER NOT NULL DEFAULT 0"
      );
    }

    const indexExists = await queryRunner.query(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'IDX_inventory_quantity_composite'"
    );
    if (indexExists.length === 0) {
      await queryRunner.query(
        "CREATE INDEX `IDX_inventory_quantity_composite` ON `inventory` (`quantity`, `reserved_quantity`)"
      );
    }
  }
};
