/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Ensures supervisor inherits all cashier + sales + storekeeper permissions,
 * and cashier gets all financial report permissions.
 * All inserts are idempotent (skip if already assigned).
 */

const CASHIER_EXTRA_REPORTS = [
  "can_view_production_stock_revenue_report",
  "can_view_items_sold_count_report",
  "can_view_voided_items_report",
  "can_view_expenditure_report",
  "can_view_purchase_orders_report",
  "can_view_pnl_report",
  "can_view_production_sales_reconciliation_report",
];

module.exports = class FixRolePermissions1700000000019 {
  name = "FixRolePermissions1700000000019";

  async up(queryRunner) {
    console.log("🔧 FixRolePermissions: patching role_permissions...");

    const roles = await queryRunner.query("SELECT id, name FROM `roles`");
    const roleMap = {};
    for (const r of roles) roleMap[r.name] = r.id;

    const permissions = await queryRunner.query(
      "SELECT id, name FROM `permissions`",
    );
    const permMap = {};
    for (const p of permissions) permMap[p.name] = p.id;

    let assigned = 0;

    const assign = async (roleName, permName) => {
      const roleId = roleMap[roleName];
      const permId = permMap[permName];
      if (!roleId || !permId) return;
      const existing = await queryRunner.query(
        "SELECT id FROM `role_permissions` WHERE `role_id` = ? AND `permission_id` = ?",
        [roleId, permId],
      );
      if (existing.length === 0) {
        await queryRunner.query(
          "INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`, `updated_at`) VALUES (?, ?, NOW(), NULL)",
          [roleId, permId],
        );
        assigned++;
        console.log(`   ✅ Assigned ${permName} → ${roleName}`);
      }
    };

    // 1. Supervisor inherits all permissions from cashier, sales, storekeeper
    const inheritFrom = ["cashier", "sales", "storekeeper"];
    for (const srcRole of inheritFrom) {
      const srcId = roleMap[srcRole];
      if (!srcId) continue;
      const srcPerms = await queryRunner.query(
        "SELECT p.name FROM `role_permissions` rp INNER JOIN `permissions` p ON rp.permission_id = p.id WHERE rp.role_id = ?",
        [srcId],
      );
      for (const { name } of srcPerms) {
        await assign("supervisor", name);
      }
    }

    // 2. Cashier gets all financial report permissions
    for (const permName of CASHIER_EXTRA_REPORTS) {
      await assign("cashier", permName);
    }

    console.log(`✅ FixRolePermissions done — ${assigned} new links added.`);
  }

  async down(queryRunner) {
    // Non-destructive: down() is a no-op — removing permissions could break existing setups
    console.log("ℹ️  FixRolePermissions down() — no rollback applied.");
  }
};
