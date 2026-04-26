/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Seeds the 9 report-viewing permissions into the permissions table and assigns
 * them to cashier and supervisor roles. These permissions were always defined in
 * role-permissions.ts but were never seeded into the DB, causing silent 403s for
 * cashiers accessing any report API.
 */

const REPORT_PERMISSIONS = [
  "can_view_sales_revenue_report",
  "can_view_production_stock_revenue_report",
  "can_view_items_sold_count_report",
  "can_view_voided_items_report",
  "can_view_expenditure_report",
  "can_view_invoices_pending_bills_report",
  "can_view_purchase_orders_report",
  "can_view_pnl_report",
  "can_view_production_sales_reconciliation_report",
];

module.exports = class SeedReportPermissions1700000000021 {
  name = "SeedReportPermissions1700000000021";

  async up(queryRunner) {
    console.log("🔧 SeedReportPermissions: seeding report permissions...");

    // 1. Ensure "reports" scope exists
    let [scope] = await queryRunner.query(
      "SELECT id FROM `permission_scope` WHERE name = 'reports'"
    );
    if (!scope) {
      await queryRunner.query(
        "INSERT INTO `permission_scope` (`name`, `created_at`, `updated_at`) VALUES ('reports', NOW(), NULL)"
      );
      [scope] = await queryRunner.query(
        "SELECT id FROM `permission_scope` WHERE name = 'reports'"
      );
      console.log("  ✅ Created scope: reports");
    }

    // 2. Seed each report permission (idempotent)
    for (const permName of REPORT_PERMISSIONS) {
      const existing = await queryRunner.query(
        "SELECT id FROM `permissions` WHERE name = ?",
        [permName]
      );
      if (existing.length === 0) {
        await queryRunner.query(
          "INSERT INTO `permissions` (`name`, `scope_id`, `created_at`) VALUES (?, ?, NOW())",
          [permName, scope.id]
        );
        console.log(`  ✅ Created permission: ${permName}`);
      }
    }

    // 3. Assign to cashier and supervisor (idempotent)
    const roles = await queryRunner.query("SELECT id, name FROM `roles`");
    const roleMap = {};
    for (const r of roles) roleMap[r.name] = r.id;

    const allPerms = await queryRunner.query("SELECT id, name FROM `permissions`");
    const permMap = {};
    for (const p of allPerms) permMap[p.name] = p.id;

    const assign = async (roleName, permName) => {
      const roleId = roleMap[roleName];
      const permId = permMap[permName];
      if (!roleId || !permId) return;
      const existing = await queryRunner.query(
        "SELECT id FROM `role_permissions` WHERE role_id = ? AND permission_id = ?",
        [roleId, permId]
      );
      if (existing.length === 0) {
        await queryRunner.query(
          "INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`) VALUES (?, ?, NOW())",
          [roleId, permId]
        );
        console.log(`  ✅ Assigned ${permName} → ${roleName}`);
      }
    };

    for (const permName of REPORT_PERMISSIONS) {
      await assign("cashier", permName);
      await assign("supervisor", permName);
    }

    console.log("✅ SeedReportPermissions done.");
  }

  async down(queryRunner) {
    for (const permName of REPORT_PERMISSIONS) {
      const rows = await queryRunner.query(
        "SELECT id FROM `permissions` WHERE name = ?",
        [permName]
      );
      if (rows.length === 0) continue;
      const permId = rows[0].id;
      await queryRunner.query(
        "DELETE FROM `role_permissions` WHERE permission_id = ?",
        [permId]
      );
      await queryRunner.query("DELETE FROM `permissions` WHERE id = ?", [permId]);
    }
    await queryRunner.query(
      "DELETE FROM `permission_scope` WHERE name = 'reports'"
    );
  }
};
