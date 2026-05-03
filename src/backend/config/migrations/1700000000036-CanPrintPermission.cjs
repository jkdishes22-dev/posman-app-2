/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Adds `can_print` (billing scope) for receipt-printer-prefs + narrow receipt settings access.
 * Assigns to admin, supervisor, sales, cashier.
 * Removes `can_view_system_settings` from sales, supervisor, cashier so they no longer get full settings read.
 */
module.exports = class CanPrintPermission1700000000036 {
  name = "CanPrintPermission1700000000036";

  async up(queryRunner) {
    console.log("🔧 CanPrintPermission: seeding can_print and trimming system settings on floor roles...");

    const [scope] = await queryRunner.query("SELECT id FROM `permission_scope` WHERE name = ?", ["billing"]);
    if (!scope) {
      console.warn("  ⚠️  billing scope not found — skipping");
      return;
    }

    let permRows = await queryRunner.query("SELECT id FROM `permissions` WHERE name = ?", ["can_print"]);
    let printPermId;
    if (permRows.length === 0) {
      await queryRunner.query(
        "INSERT INTO `permissions` (`name`, `scope_id`, `created_at`) VALUES (?, ?, NOW())",
        ["can_print", scope.id],
      );
      permRows = await queryRunner.query("SELECT id FROM `permissions` WHERE name = ?", ["can_print"]);
    }
    printPermId = permRows[0].id;
    console.log("  ✅ Permission can_print ready (id=%s)", printPermId);

    const printRoles = ["admin", "supervisor", "sales", "cashier"];
    for (const roleName of printRoles) {
      const [role] = await queryRunner.query("SELECT id FROM `roles` WHERE name = ?", [roleName]);
      if (!role) continue;
      const link = await queryRunner.query(
        "SELECT id FROM `role_permissions` WHERE role_id = ? AND permission_id = ?",
        [role.id, printPermId],
      );
      if (link.length === 0) {
        await queryRunner.query(
          "INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`) VALUES (?, ?, NOW())",
          [role.id, printPermId],
        );
        console.log(`  ✅ Assigned can_print → ${roleName}`);
      }
    }

    const [viewPerm] = await queryRunner.query("SELECT id FROM `permissions` WHERE name = ?", [
      "can_view_system_settings",
    ]);
    if (viewPerm) {
      for (const roleName of ["sales", "supervisor", "cashier"]) {
        const [role] = await queryRunner.query("SELECT id FROM `roles` WHERE name = ?", [roleName]);
        if (!role) continue;
        await queryRunner.query("DELETE FROM `role_permissions` WHERE role_id = ? AND permission_id = ?", [
          role.id,
          viewPerm.id,
        ]);
      }
      console.log("  ✅ Removed can_view_system_settings from sales, supervisor, cashier");
    }

    console.log("✅ CanPrintPermission done.");
  }

  async down(queryRunner) {
    const [printPerm] = await queryRunner.query("SELECT id FROM `permissions` WHERE name = ?", ["can_print"]);
    if (printPerm) {
      await queryRunner.query("DELETE FROM `role_permissions` WHERE permission_id = ?", [printPerm.id]);
      await queryRunner.query("DELETE FROM `permissions` WHERE id = ?", [printPerm.id]);
    }

    const [viewPerm] = await queryRunner.query("SELECT id FROM `permissions` WHERE name = ?", [
      "can_view_system_settings",
    ]);
    if (!viewPerm) return;

    for (const roleName of ["admin", "supervisor", "cashier", "sales"]) {
      const [role] = await queryRunner.query("SELECT id FROM `roles` WHERE name = ?", [roleName]);
      if (!role) continue;
      const existing = await queryRunner.query(
        "SELECT id FROM `role_permissions` WHERE role_id = ? AND permission_id = ?",
        [role.id, viewPerm.id],
      );
      if (existing.length === 0) {
        await queryRunner.query(
          "INSERT INTO `role_permissions` (`role_id`, `permission_id`, `created_at`) VALUES (?, ?, NOW())",
          [role.id, viewPerm.id],
        );
      }
    }
  }
};
